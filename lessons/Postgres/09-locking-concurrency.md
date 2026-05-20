---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, system-design, postgres]
---

# Locking & Concurrency (การจัดการคอขวดของการทำงานพร้อมกัน)

---

## 🎯 ปฐมนิเทศ (Orient)

"PostgreSQL จัดการ Lock ให้เองอยู่แล้ว" — คำพูดนี้จริงเพียงครึ่งเดียว! แม้ Postgres จะมีระบบจัดการการทำงานพร้อมกัน (Concurrency) ที่ยอดเยี่ยม แต่การไม่เข้าใจกลไกการล็อกจะนำไปสู่ปัญหาที่แก้ได้ยากใน Production เช่น **Deadlocks **, Query ที่ค้างรออย่างไร้สาเหตุ หรือแย่ที่สุดคือข้อมูลทับซ้อน (Race Conditions)

บทเรียนนี้จะสอนให้คุณรู้จัก Lock แต่ละประเภท, วิธีป้องกัน Deadlock และเทคนิคระดับ Senior อย่าง`SELECT FOR UPDATE SKIP LOCKED` ที่จะทำให้ระบบ Queue ของคุณรันได้รวดเร็วโดยไม่เกิดปัญหา

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️ ** สถานการณ์:** คุณมีตาราง`jobs` ที่ใช้เป็นคิวงาน (Task Queue) มี Worker 10 ตัวทำงานพร้อมกัน ทุกตัวจะรันคำสั่ง:
>
>```sql
> SELECT * FROM jobs WHERE status = 'PENDING' LIMIT 1;
> UPDATE jobs SET status = 'PROCESSING' WHERE id = {id_from_select};
>```
>
> **คำถาม:** ในสถานการณ์ที่มีงานไหลเข้าจำนวนมาก มีโอกาสไหมที่ Worker 2 ตัวจะได้งาน (ID) เดียวกันไปทำ? และคุณจะแก้ปัญหานี้อย่างไรโดยไม่ทำให้ Worker ตัวอื่นต้องรอนาน?

**หยุดคิดสักครู่ **— การใช้`Transaction` ปกติเพียงพอหรือไม่?

---

## 💬 ผลตอบรับ (Feedback)

| สิ่งที่คุณอาจคิด | การวิเคราะห์ (Senior Perspective) |
|---|---|
|"ใช้ Transaction ธรรมดาก็พอ" | ❌ ** ผิด!** ภายใต้ระดับ Isolation ปกติ (Read Committed) Worker ทั้ง 2 ตัวสามารถเห็นแถวเดียวกันที่ยังเป็น`PENDING` อยู่พร้อมกันได้ |
|"ใช้`SELECT ... FOR UPDATE`" | ⚠️ ดีขึ้น เพราะมันจะล็อกแถวนั้นไว้ แต่ Worker ตัวที่ 2 จะต้อง **"รอ (Block)"** จนกว่าตัวแรกจะ Commit ซึ่งถ้ามี Worker เยอะๆ ระบบจะช้าลงมาก |
|"ใช้`FOR UPDATE SKIP LOCKED`" | ✅ ** ถูกต้อง!** นี่คือท่าไม้ตาย: Worker ตัวที่ 2 จะข้ามแถวที่ถูกล็อกอยู่ไปเอาแถวถัดไปทันที ทำให้ทุกคนทำงานได้พร้อมกัน 100% โดยไม่ทับซ้อนกัน |

---

### คำอธิบาย (Explain)

PostgreSQL มีกลไกการล็อกหลายระดับเพื่อให้วิศวกรสามารถควบคุมการเข้าถึงข้อมูลที่ละเอียดอ่อนได้ โดยเฉพาะในสถานการณ์ที่ MVCC เพียงอย่างเดียวไม่เพียงพอต่อความต้องการทางธุรกิจ [source: PostgreSQL Documentation — Explicit Locking]

### 1. ลำดับชั้นของการล็อก (Lock Hierarchy)

PostgreSQL มี Lock หลายระดับ แต่ที่ควรรู้จักมี 2 ระดับหลัก:
*   **Row-Level Locks:** ล็อกเฉพาะแถวที่กำลังแก้ไข (เช่น`SELECT FOR UPDATE`)
*   **Table-Level Locks:** ล็อกทั้งตาราง (เช่น`ALTER TABLE` หรือ`DROP TABLE`) พยายามหลีกเลี่ยงใน Production

### 2. อาวุธลับ: SELECT FOR UPDATE

เมื่อคุณต้องการจองข้อมูลเพื่อแก้ไข ป้องกันคนอื่นมาแตะต้อง:
*   **`FOR UPDATE`:** ล็อกแถว ห้ามคนอื่น UPDATE/DELETE/SELECT FOR UPDATE (คนอื่นต้องรอ)
*   **`FOR UPDATE SKIP LOCKED`:** ถ้าแถวนั้นโดนล็อกอยู่ ให้ **"ข้าม"** ไปเลย (เหมาะมากสำหรับระบบ Queue)
*   **`FOR UPDATE NOWAIT`:** ถ้าแถวนั้นโดนล็อกอยู่ ให้ **"Error"** ทันที (ไม่ต้องรอ)

### 3. Deadlock: เมื่อต่างคนต่างรอ

Deadlock เกิดขึ้นเมื่อ Transaction A ล็อก Row 1 และจะไปล็อก Row 2 ในขณะที่ Transaction B ล็อก Row 2 และจะไปล็อก Row 1 ต่างคนต่างรอจนไม่มีใครไปต่อได้
*   **วิธีป้องกัน:** ล็อกลำดับของข้อมูลให้เหมือนกันเสมอในทุก Code (เช่น เรียงลำดับตาม ID ก่อนล็อกเสมอ)

---

## 🔬 ขยายความ (Extend)

### Advisory Locks: การสร้าง Lock ของเราเอง

บางครั้งเราไม่ได้อยากล็อกแถวในฐานข้อมูล แต่อยากล็อก"ตรรกะบางอย่าง" (เช่น ป้องกันไม่ให้ Cron Job รันซ้ำพร้อมกัน) เราสามารถใช้ **Advisory Locks ** ได้

```sql
-- ลองจอง Lock หมายเลข 12345
SELECT pg_try_advisory_lock(12345); 
-- ถ้าได้คืน true ถ้ามีคนจองอยู่คืน false ทันทีโดยไม่รอ
```

### การตรวจสอบ Lock ที่ค้างอยู่

หากระบบของคุณช้าผิดปกติ คุณสามารถตรวจสอบได้ว่าใครกำลังล็อกใครอยู่

```sql
SELECT pid, state, query, wait_event_type, wait_event 
FROM pg_stat_activity 
WHERE wait_event_type = 'Lock';
```

### การใช้ SELECT FOR SHARE

หากคุณต้องการแค่"อ่าน" และมั่นใจว่า"ห้ามใครมาแก้แถวนี้จนกว่าฉันจะอ่านจบ" แต่ยังยอมให้คนอื่น"อ่าน" พร้อมกันได้ ให้ใช้`FOR SHARE` (เบากว่า`FOR UPDATE`)

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:**
คำสั่งใดที่ช่วยให้ระบบ Job Queue ทำงานแบบขนาน (Parallel) ได้ดีที่สุด?
หากเกิด Error`deadlock detected` วิธีแก้ปัญหาเบื้องต้นที่ดีที่สุดคืออะไร?
`SELECT ... FOR UPDATE` บล็อกคนที่ใช้`SELECT` ธรรมดาหรือไม่?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>

**`SELECT ... FOR UPDATE SKIP LOCKED`**
**เรียงลำดับการเข้าถึงข้อมูล (Lock Order):** ตรวจสอบ Code และบังคับให้ทุกลำดับการล็อกเรียงตาม Primary Key (เช่น`ORDER BY id`) เสมอ
**ไม่บล็อก ** -`SELECT` ธรรมดาสามารถอ่านข้อมูลได้ตลอดเวลา (นี่คือข้อดีของ MVCC) แต่จะบล็อกคนที่พยายามจะ`UPDATE` หรือ`SELECT FOR UPDATE` ในแถวเดียวกัน

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ระบบจัดการยอดเงินคงเหลือ (Wallet) หรือระบบตัดสต็อกสินค้าของคุณ มีโอกาสเกิด Race Condition ไหม? ถ้า Transaction 2 อันรันพร้อมกัน ยอดเงินจะยังถูกต้องอยู่หรือไม่? หากยังใช้แค่`UPDATE balance = balance - 100` โดยไม่มีการล็อกแถวที่เหมาะสม คุณกำลังเสี่ยงภัยอยู่!

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[05-vacuum-mvcc\|VACUUM & MVCC — ความสัมพันธ์ระหว่างการล็อกและ Snapshot ของข้อมูล]]
- [[11-transactions-isolation\|Isolation Levels — วิธีที่แต่ละระดับจัดการความเข้มงวดของการล็อกต่างกัน]]
- [[10-explain-analyze\|EXPLAIN ANALYZE — วิธีตรวจสอบว่า Query ของคุณคอขวดที่การรอ Lock หรือไม่]]
