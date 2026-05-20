---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, system-design, postgres]
---

# Table Partitioning (การแบ่งตารางเพื่อประสิทธิภาพระดับ Scale)

---

## 🎯 ปฐมนิเทศ (Orient)

**Table Partitioning** คือการแบ่งตารางขนาดใหญ่ (Large Table) ออกเป็นตารางย่อยๆ (Partitions) ตามเกณฑ์ที่กำหนด (เช่น วันที่, หมวดหมู่, หรือรหัส) โดยที่ Application ยังคงมองเห็นเป็นตารางเดียว

หัวใจสำคัญไม่ใช่แค่การทำให้ Query เร็วขึ้น แต่คือการจัดการข้อมูลมหาศาล (Maintenance at Scale) เช่น การลบข้อมูลเก่าทิ้งได้ในเสี้ยววินาที หรือการจัดการดัชนี (Index) ที่มีขนาดเล็กพอที่จะอยู่ใน Memory ได้ตลอดเวลา

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️**สถานการณ์**:คุณมีตาราง`events` เก็บ Log การใช้งานระบบ มีข้อมูลทั้งหมด 2,000 ล้านแถว และมีข้อมูลใหม่เพิ่มขึ้นวันละ 10 ล้านแถว โจทย์ของคุณคือ:
> 1. ต้อง Query ข้อมูล 7 วันล่าสุดให้เร็วที่สุด
> 2. ต้องลบข้อมูลที่เก่ากว่า 90 วันทิ้งทุกๆ เที่ยงคืน
>
>**คำถาม**:หากคุณใช้คำสั่ง`DELETE FROM events WHERE created_at < NOW() - INTERVAL '90 days'` จะเกิดอะไรขึ้นกับระบบ? และมีวิธีที่ดีกว่านี้ไหม?**หยุดคิดสักครู่**— ลองจินตนาการถึงภาระของฐานข้อมูลเมื่อต้องลบข้อมูลร้อยล้านแถวพร้อมกัน...

---

## 💬 ผลตอบรับ (Feedback)

| สิ่งที่คุณอาจคิด | การวิเคราะห์ (Senior Perspective) |
|---|---|
|"รัน DELETE แล้วตามด้วย VACUUM" | ❌ **อันตราย!** การ DELETE ข้อมูลหลักร้อยล้านแถวจะสร้างภาระมหาศาลให้กับ Write-Ahead Log (WAL), ทำให้เกิด Index Bloat และตารางอาจโดน Lock จนระบบใช้งานไม่ได้ (Downtime) |
|"สร้าง Index บน`created_at` ก็พอ" | ⚠️ Index ช่วยให้ Query เร็วขึ้นจริง แต่ไม่ได้ช่วยเรื่องการลบข้อมูลเก่า (Deletion) และเมื่อ Index ใหญ่เกินขนาด RAM ประสิทธิภาพจะตกลงอย่างน่าใจหาย |
|"ใช้ Table Partitioning แบ่งตามวัน" | ✅**นี่คือคำตอบ!** คุณสามารถลบข้อมูลเก่าได้ด้วยการ`DROP TABLE` เฉพาะ Partition นั้นๆ ซึ่งเป็น Operation ระดับ O(1) ที่ใช้เวลาน้อยกว่า 1 วินาที และไม่กระทบกับข้อมูลส่วนอื่น |

---

### คำอธิบาย (Explain)

การทำ Partitioning ใน PostgreSQL ช่วยให้การจัดการข้อมูลขนาดมหาศาล (Very Large Databases - VLDB) เป็นไปได้อย่างมีประสิทธิภาพ ทั้งในเชิงการค้นหาและการบำรุงรักษา [source: PostgreSQL Documentation — Table Partitioning]

### ประเภทของ Partitioning ใน PostgreSQL

PostgreSQL รองรับการทำ Declarative Partitioning หลักๆ 3 รูปแบบ:

#### 1. RANGE Partitioning (ยอดนิยมที่สุด)

แบ่งตามช่วงข้อมูล เช่น วันที่ หรือตัวเลขต่อเนื่อง เหมาะมากสำหรับข้อมูลแบบ Time-series หรือ Logs

```sql
CREATE TABLE orders (
    id BIGSERIAL,
    amount DECIMAL,
    created_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

-- สร้างตารางย่อยรายเดือน
CREATE TABLE orders_2026_05 PARTITION OF orders
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

#### 2. LIST Partitioning

แบ่งตามค่าที่แน่นอน (Discrete Values) เช่น สถานะ หรือรหัสประเทศ

```sql
CREATE TABLE tickets (
    id BIGSERIAL,
    status TEXT
) PARTITION BY LIST (status);

CREATE TABLE tickets_active PARTITION OF tickets
    FOR VALUES IN ('OPEN', 'PENDING');
```

#### 3. HASH Partitioning

กระจายข้อมูลให้เท่ากันในทุกตารางย่อย เหมาะสำหรับการทำ Load Balancing ของข้อมูล

```sql
CREATE TABLE users (id BIGINT, name TEXT) PARTITION BY HASH (id);

CREATE TABLE users_0 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 0);
-- สร้างต่อให้ครบ MODULUS 4 (0, 1, 2, 3)
```

### Partition Pruning: เวทมนตร์ที่ทำให้ Query เร็วขึ้น

เมื่อคุณรัน Query โดยมีเงื่อนไข (WHERE clause) ที่ตรงกับ Partition Key ระบบจะฉลาดพอที่จะ **"ข้าม"** ตารางย่อยที่ไม่เกี่ยวข้องไปเลย

```sql
-- Query: ดึงข้อมูลเดือนพฤษภาคม
SELECT * FROM orders WHERE created_at >= '2026-05-15';

-- แผนผังการทำงาน (EXPLAIN):
-- PostgreSQL จะอ่านเฉพาะตาราง orders_2026_05 เท่านั้น 
-- และข้าม (Prune) อีก 10 กว่าตารางที่เหลือทิ้งไปทันที
```

---

## 🔬 ขยายความ (Extend)

### Sub-partitioning: การแบ่งย่อยสองชั้น

คุณสามารถทำ Partition ซ้อน Partition ได้ เช่น แบ่งตาม"เดือน" ก่อน แล้วข้างในเดือนแบ่งตาม"ภูมิภาค" (Region) เพื่อให้การ Query เฉพาะเจาะจงมากขึ้น

### pg_partman: เครื่องมือทุ่นแรงที่ Senior ต้องรู้จัก

การสร้าง Partition ด้วยมือทุกเดือน/ทุกวันนั้นเสี่ยงต่อความผิดพลาด (Human Error) การใช้ Extension อย่าง **pg_partman** จะช่วยสร้างตารางย่อยล่วงหน้าอัตโนมัติ และจัดการการลบตารางเก่า (Retention Policy) ให้เราเอง

### เมื่อไหร่ที่ควรเริ่มทำ Partitioning?

*   **ขนาดตาราง**: เมื่อตารางเริ่มใหญ่กว่า RAM ของเครื่อง (เช่น > 10-20 GB)
*   **จำนวนแถว**: เริ่มมีข้อมูลหลัก 10 ล้านแถวขึ้นไป
*   **ลักษณะงาน**: ต้องลบข้อมูลเก่าเป็นก้อนใหญ่ๆ (Bulk Deletion) หรือ Query มักจะมีเงื่อนไขตามช่วงเวลาเสมอ

### ข้อควรระวัง (Trade-offs)

*   **Primary Key:** ทุก Primary Key และ Unique Index จะต้องรวม Partition Key เข้าไปด้วยเสมอ (เช่น`PRIMARY KEY (id, created_at)`)
*   **Cross-partition Query:** หาก Query โดยไม่มี Partition Key ในเงื่อนไข Postgres จะต้องสแกนทุกตารางย่อย ซึ่งอาจช้ากว่าตารางปกติเล็กน้อย

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:** หากคุณต้องเก็บข้อมูลตำแหน่งรถขนส่ง (GPS Logs) วันละ 100 ล้านจุด และต้องเก็บย้อนหลัง 30 วัน
ควรเลือก Partitioning ประเภทไหน?
ประโยชน์ที่ใหญ่ที่สุดที่คุณจะได้จากการทำเช่นนี้คืออะไร?
หากคุณลืมใส่เงื่อนไข"วันที่" ในการ Query จะเกิดผลเสียอย่างไร?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>**RANGE Partitioning by Day**(แบ่งรายวัน)
**การลบข้อมูล (Retention):** ลบข้อมูลวันที่ 31 ทิ้งได้ทันทีด้วย`DROP TABLE` ไม่ต้องใช้`DELETE` ที่แสนช้า **Seq Scan:** ระบบจะต้องเข้าไปอ่านทั้ง 30 ตารางย่อย ทำให้ประสิทธิภาพตกลงอย่างมาก (นี่คือเหตุผลว่าทำไมเราต้องสอนทีมให้ใส่ Partition Key เสมอ)

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 กลับไปสำรวจฐานข้อมูลของคุณตอนนี้ — ตารางไหนที่"ใหญ่และบวม" ที่สุด? หากคุณเปลี่ยนมันเป็น Partitioned Table ในวันนี้ คุณจะประหยัดเวลาในการ Maintenance ไปได้มหาศาลแค่ไหน?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[02-index-types\|Index Types — การเลือกดัชนีให้เหมาะกับตารางย่อย]]
- [[10-explain-analyze\|EXPLAIN ANALYZE — วิธีตรวจสอบว่า Partition Pruning ทำงานจริงไหม]]
- [[../Core/04-database-sharding\|Database Sharding — เมื่อข้อมูลใหญ่เกินกว่าจะรันในเครื่องเดียว]]
