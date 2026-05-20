---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [database, system-design, indexing, partitioning, trade-offs]
prerequisites: [04-database-sharding]
---

# การเลือกใช้ Global Index vs Local Index (Global vs Local Indexes)

---

## 🎯 ปฐมนิเทศ (Orient)

เมื่อฐานข้อมูลมีขนาดใหญ่จนต้องทำ Partitioning หรือ Sharding (แบ่งข้อมูลออกเป็นส่วนๆ) ปัญหาถัดมาที่วิศวกรต้องเจอคือ **การสร้าง Index**เพื่อให้ค้นหาข้อมูลได้เร็ว เนื่องจากข้อมูลไม่ได้อยู่รวมกันที่เดียวอีกต่อไป การตัดสินใจว่าจะสร้าง Index แยกตามแต่ละ Partition (Local Index) หรือสร้าง Index รวมที่ครอบคลุมทุก Partition (Global Index) เป็น trade-off สำคัญที่ส่งผลโดยตรงต่อความเร็วในการอ่านข้อมูล (Read Latency) และความเร็วในการเขียน/ดูแลรักษาข้อมูล (Write Latency & Maintenance)

## 🧪 ลองทำก่อน (Attempt)**สถานการณ์:**

คุณกำลังออกแบบระบบ E-commerce ที่มีตาราง`orders` ขนาด 5TB ทีมตัดสินใจทำ Partitioning ข้อมูลตาม`created_at` (แบ่งเป็นรายเดือน) เพื่อให้จัดการข้อมูลเก่าได้ง่าย (Data Retention)
ระบบมี 2 query patterns หลัก:
1. การค้นหาของ User: หา order ล่าสุดของตัวเอง`SELECT * FROM orders WHERE user_id = X ORDER BY created_at DESC LIMIT 10` (ประมาณ 5,000 req/s)
2. การค้นหาของ Admin/ระบบ Support: ค้นหา order จาก`order_reference_code` (ซึ่งเป็น UUID แบบสุ่ม)`SELECT * FROM orders WHERE order_reference_code = Y` (ประมาณ 100 req/s)

**ข้อจำกัด:**- ตาราง`orders` มีการ Insert ข้อมูลใหม่ตลอดเวลา (Write-heavy)
- การ query ด้วย`order_reference_code` ต้องตอบสนองในเวลา < 50ms เพราะระบบ Support ต้องใช้แบบ real-time
- คุณไม่สามารถลบ Partitioning ตาม`created_at` ได้ เพราะเป็นข้อบังคับเรื่อง Storage Cost**คำถาม:**เพื่อรองรับการค้นหาด้วย`order_reference_code` ที่เร็วที่สุดภายใต้ข้อจำกัดนี้ คุณควรออกแบบ Index สำหรับคอลัมน์`order_reference_code` อย่างไรจึงจะเหมาะสมที่สุด?

✋**หยุดตรงนี้ก่อน:**ลองคิดถึง Trade-off ของแต่ละวิธีก่อนเลื่อนไปดูผลตอบรับ

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"Local Index บนคอลัมน์`order_reference_code` ในทุกๆ Partition" | ⚠️**ขาดบริบทเรื่อง Query Pattern!**การทำ Local Index หมายความว่าเวลาหาด้วย`order_reference_code` (ที่ไม่ได้ระบุเดือน) Database ต้องไปแสกนหาใน**ทุก**Partition (Scatter-Gather) ทำให้ Read Latency สูงและไม่การันตี < 50ms |
|"ตารางใหม่`order_lookup` เก็บแค่`order_reference_code` กับ`created_at` แล้วทำ Index" | ⚠️ **ใกล้เคียง!**วิธีนี้คือการจำลอง Global Index ด้วยตัวเอง ช่วยเรื่อง Read ได้จริง แต่คุณต้องแลกกับ Write Amplification (ต้องเขียน 2 ที่) และอาจเกิดปัญหา Inconsistency ระหว่าง 2 ตารางถ้าจัดการ Transaction ไม่ดี |
|"Global Secondary Index (GSI) บนคอลัมน์`order_reference_code`" | ✅**คิดเป็นระบบ!**คำตอบนี้เข้าใจว่า Query ที่ไม่ได้ระบุ Partition Key จำเป็นต้องมี Global Index เพื่อชี้เป้าไปยัง Partition ที่ถูกต้องทันที แม้จะต้องแลกกับ Write Overhead ตอน Insert ข้อมูลใหม่ แต่คุ้มค่าเพราะเรารับประกัน Read Latency ให้ระบบ Support ได้ |**ทำไมการให้เหตุผลแบบนี้สำคัญ?**วิศวกรระดับ Senior จะรู้ว่า"Index ไม่ได้ฟรี" เมื่อมีการทำ Partitioning, Local Index ทำให้เราเขียนข้อมูลได้เร็วและลบ Partition ทิ้งได้ง่าย แต่ทำให้ Query ที่ไม่มี Partition Key ช้าลงมหาศาล ในขณะที่ Global Index ทำให้ Query เร็ว แต่ทำให้การเขียนช้าลงและลบ Partition ได้ยากขึ้น การตัดสินใจจึงต้องมาจาก SLA และ Query Pattern ของระบบ

## 📖 คำอธิบาย (Explain)

เมื่อข้อมูลถูกแบ่ง (Partitioned) การสร้าง Index จะมี 2 รูปแบบหลักๆ ซึ่งมี Trade-off ตรงข้ามกันอย่างชัดเจน:

### 1. Local Index (Partition-Aligned Index)

Index ถูกสร้างและแยกเก็บไว้คู่กับข้อมูลในแต่ละ Partition เสมือนเป็น Index ประจำหมู่บ้าน

| Approach | Solves | What You Give Up | Best When |
|---|---|---|---|
|**Local Index**| จัดการข้อมูลง่าย (เช่น การ Drop Partition ข้อมูลเก่าจะไม่กระทบ Index ของเดือนอื่น) และไม่เป็นคอขวดตอน Write |**Cross-Partition Query Performance:**ถ้า Query ไม่ได้ระบุ Partition Key ระบบต้องแสกน Index ของทุกๆ Partition (Scatter-Gather) ทำให้ช้า | Query ส่วนใหญ่มี Partition Key ระบุมาด้วยเสมอ (เช่น หาด้วย`user_id` และ`created_at` พร้อมกัน) |

### 2. Global Index (Non-Aligned Index)

Index โครงสร้างเดียวที่ครอบคลุมข้อมูลจากทุกๆ Partition เสมือนเป็นสมุดหน้าเหลืองรวมของทั้งประเทศที่บอกได้เลยว่าข้อมูลนั้นอยู่หมู่บ้านไหน

| Approach | Solves | What You Give Up | Best When |
|---|---|---|---|
|**Global Index**|**Read Performance:**สามารถค้นหาข้อมูลด้วยเงื่อนไขอื่นที่ไม่ใช่ Partition Key ได้อย่างรวดเร็ว (O(1) หรือ O(log N) partition lookup) |**Write Performance & Maintenance:**ทุกครั้งที่ Insert/Update ข้อมูลใน Partition ใดๆ ต้องมาอัปเดต Global Index (เกิด Contention) และถ้าลบ Partition ทิ้ง Global Index จะต้องถูก Rebuild หรือมีข้อมูลขยะค้าง | มี Query Pattern สำคัญที่ต้องค้นหาข้อมูลโดยไม่รู้ Partition Key และยอมรับ Write Penalty ได้ |

```sql
-- ตัวอย่าง (PostgreSQL) - การสร้าง Local Index
-- ⚠️ Limitation: Query หา order_code โดยไม่ระบุ created_at จะต้องแสกนทุก Partition
CREATE INDEX idx_orders_ref_code ON orders (order_reference_code); 
-- ใน PostgreSQL ถ้า orders เป็น Partitioned Table คำสั่งนี้จะสร้าง Local Index ในทุก Partition โดยอัตโนมัติ

-- ตัวอย่าง Global Index (ในฐานข้อมูลที่รองรับคล้าย DynamoDB หรือ Spanner)
-- ✅ Works well for: การค้นหาข้าม Partition อย่างรวดเร็ว
-- ⚠️ Limitation: สิ้นเปลือง Storage และเพิ่ม Write Latency เพราะต้องอัปเดตข้าม Node
CREATE GLOBAL INDEX idx_global_ref_code ON orders (order_reference_code);
```

>**อ้างอิง:**[PostgreSQL 17 docs — Partitioning and Indexes] (Note: PostgreSQL Native ยังไม่รองรับ Global Index แบบแท้จริงบน Partitioned Tables แต่ใช้วิธีอื่นชดเชย)

## 🔬 ขยายความ (Extend)

การเลือกระหว่าง Global และ Local Index คือการเลือกระหว่าง **Read Performance**กับ**Write/Maintenance Performance**### ควรใช้ Local Index เมื่อ...

- ✅ Query ส่วนใหญ่มักจะระบุ Partition Key มาด้วย (เช่น ถ้าแบ่งตามเดือน เวลาค้นหาก็มักจะหาตามเดือน)
- ✅ ระบบมีการนำข้อมูลเก่าออก (Data Pruning / Drop Partition) บ่อยๆ เพราะ Drop Partition ทำได้ทันทีใน O(1)
- ✅ ระบบเป็น Write-heavy มากๆ และไม่ต้องการให้ Global Index กลายเป็นคอขวด (Contention Point)

### ควรหลีกเลี่ยง Local Index เมื่อ...

- ❌ มี Query สำคัญที่ใช้ Filter ด้วยคอลัมน์อื่นที่ไม่ได้มีความสัมพันธ์กับ Partition Key

### ควรใช้ Global Index (หรือ GSI) เมื่อ...

- ✅ มี Query ที่หลีกเลี่ยงไม่ได้ที่จะต้องค้นหาจาก Field อื่นที่ไม่ใช่ Partition Key (เช่น ค้นหาด้วย Email ในตารางที่แบ่งตาม User ID)
- ✅ ต้องการรับประกัน Read Latency ให้ต่ำและคงที่เสมอ (Predictable Read Performance)
- ✅ ระบบเป็น Read-heavy มากกว่า Write-heavy

### สิ่งที่ต้องแลก (Trade-offs) ถ้าฝืนธรรมชาติ

-**ใช้ Local Index กับ Query ที่ไม่มี Partition Key:**เกิดปรากฏการณ์**Scatter-Gather**คือระบบต้องส่ง Query ไปหาทุก Partition พร้อมกัน แล้วเอาผลลัพธ์มารวมกัน ถ้ามี 100 Partitions ก็ต้องทำ 100 Index Scans ทำให้เปลือง CPU และช้ามาก
-**ใช้ Global Index ในระบบที่ลบข้อมูลบ่อย:**เมื่อคุณทำการ Drop Partition ข้อมูลใน Global Index จะกลายเป็น"Orphaned" หรือ"Stale" การจัดการ (Rebuild/Cleanup Global Index) จะใช้เวลานานและล็อกระบบ (Locking)

## ✅ จุดตรวจสอบ (Checkpoint)

>**Quick Check:**> 1. ถ้าเราเก็บ Log ระบบ 10TB โดยทำ Partition รายวัน เรามีระบบ Alert ที่จะแสกนหาคำว่า"ERROR" ใน log ของวันนี้เท่านั้น ควรใช้ Index แบบไหนสำหรับคอลัมน์ log_level?
> 2. จากสถานการณ์ใน"ลองทำก่อน" (Attempt) ถ้าเราเปลี่ยนมาใช้ PostgreSQL ซึ่งปัจจุบันยังไม่รองรับ Global Index บน Partitioned table เราจะแก้ปัญหานี้อย่างไร?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.**Local Index**— เพราะ Query มีการระบุ Partition Key (ของวันนี้) ชัดเจน การใช้ Local Index จะทำให้ Query เร็วพอ และเมื่อถึงเวลาต้องลบ Log เก่าทิ้ง ก็แค่ Drop Partition ของวันนั้นๆ ได้ทันทีโดยไม่ต้องสนเรื่อง Index Rebuild
2.**สร้าง Lookup Table จำลอง Global Index** — เราสามารถสร้างตารางใหม่ (เช่น`order_reference_lookup`) ที่มีแค่คอลัมน์`order_reference_code` และ`created_at` (Partition Key) แล้วตอนที่แอปพลิเคชัน Insert ข้อมูล ก็ให้ Insert 2 ตารางใน Transaction เดียวกัน เมื่อต้องการค้นหาด้วย`order_reference_code` ก็ให้มาหาในตาราง Lookup ก่อนเพื่อเอา`created_at` ไป Query ในตารางหลักต่อ (Trade-off: Write Amplification และต้องเขียนโค้ดจัดการเอง)

</details>

## 🤔 สะท้อนคิด (Reflect)

> ในระบบ Database หรือ DynamoDB ที่คุณดูแลอยู่ มี Secondary Index ตัวไหนบ้างที่เป็น Global Index? คุณเคยเจอจังหวะที่ Global Index ทำให้ระบบช้าตอน Bulk Insert หรือตอนลบข้อมูลจำนวนมากหรือไม่? ถ้าเจอปัญหานั้น คุณจะออกแบบ Partition Key ใหม่เพื่อเปลี่ยนให้มันกลายเป็น Local Index ได้หรือไม่?

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[04-database-sharding|Database Sharding]]
- [[10-monolith-microservice-monorepo|Monolith vs Microservices vs Monorepo]]
