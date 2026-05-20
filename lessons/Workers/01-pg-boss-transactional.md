---
verified: false
contentType: learning-loop
level: senior
status: polished
tags:
  - postgres
  - workers
  - pg-boss
  - system-design
---

# pg-boss: พลังของ Transactional Queue บน PostgreSQL

---

## 🎯 ปฐมนิเทศ (Orient)

*"ทำไมต้องเอา Database ไปทำเป็นคิว ทั้งที่มันช้ากว่า Redis?"* คำตอบเดียวที่ Senior Engineer จะให้คุณคือ **"Transactional Integrity"** หากงานของคุณผิดพลาดไม่ได้แม้แต่รายการเดียว (เช่น การจ่ายเงิน หรือการยืนยันคำสั่งซื้อ) การใช้ **pg-boss** คือการรับประกันว่า"ถ้าข้อมูลลง DB งานต้องเข้าคิว" บทเรียนนี้จะสอนให้คุณเห็นความแตกต่างระหว่างความเร็วและความชัวร์

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️**สถานการณ์**:คุณกำลังทำระบบ **"สมัครสมาชิก (Register)"**> 1. บันทึกข้อมูลผู้ใช้ลงในตาราง`users`
> 2. ส่งงาน (Job) เข้าคิวเพื่อให้ Worker ส่ง **"อีเมลยืนยันตัวตน"**>
>**ปัญหา**:คุณใช้ Redis เป็นคิว และเขียนโค้ดแบบนี้:
>
>```javascript
> await db.insertUser(userData); // (1) เขียนลง DB
> await redisQueue.add('send-email', { email }); // (2) ส่งเข้าคิว
>```
>
>**คำถาม**:หาก (1) ทำงานสำเร็จ แต่ (2) พัง (เช่น Redis ล่มกะทันหัน) จะเกิดอะไรขึ้น? และคุณจะแก้ปัญหานี้อย่างไรโดยใช้ **pg-boss**?
>
> **หยุดตรงนี้ก่อน**— ลองนึกถึงคำว่า **Atomicity**(มาด้วยกัน หรือไม่มาเลย)

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"ก็แค่สลับลำดับ เอาคิวขึ้นก่อน" | ❌ **พังกว่าเดิม!** ถ้าส่งอีเมลไปแล้ว แต่เขียนลง DB ไม่สำเร็จ ผู้ใช้จะได้รับลิงก์ยืนยันที่กดแล้วหา User ไม่เจอ (Ghost User) |
|"ทำระบบ Retry เมื่อ Redis พัง" | ⚠️**ยากและซับซ้อน!** คุณต้องเขียนโค้ดเพื่อจัดการ State การ Retry เอง ซึ่งอาจจะพังซ้ำซ้อนได้ |
|"ใช้ pg-boss ใน Transaction เดียวกัน" | ✅**นี่คือคำตอบ!** เมื่อใช้ Postgres เป็นทั้ง DB และ Queue คุณสามารถห่อ (1) และ (2) ไว้ใน Transaction เดียวกันได้ ถ้าอย่างใดอย่างหนึ่งพัง ทุกอย่างจะ Rollback ทันที |**ทำไมคนส่วนใหญ่ถึงพลาด?** เพราะเรามักมองระบบแยกส่วนกัน (DB ส่วน DB, Queue ส่วน Queue) แต่ลืมคิดถึงสภาวะ **Partial Failure** ที่เกิดขึ้นได้เสมอใน Distributed Systems

---

## 📖 คำอธิบาย (Explain)

### 1. Transactional Enqueue (ท่าไม้ตายของ pg-boss)

หัวใจของ pg-boss คือการที่มันใช้ตารางใน Postgres เป็นคิว ทำให้เราสามารถใช้คำสั่ง SQL ร่วมกับงานอื่นๆ ได้:

```javascript
await db.transaction(async (tx) => {
  await tx.query('INSERT INTO users ...');
  // ส่ง Job เข้าคิวโดยใช้ Transaction เดียวกัน
  await boss.send('welcome-email', { userId }, { db: tx }); 
});
```

*ผลลัพธ์:* หาก`INSERT` พัง Job จะไม่ถูกสร้าง และหาก`boss.send` พัง`INSERT` จะถูก Rollback

### 2. กลไกการทำงาน (SKIP LOCKED)

Postgres ไม่ใช่คิวโดยธรรมชาติ แต่ pg-boss ใช้ฟีเจอร์ที่ชื่อว่า`FOR UPDATE SKIP LOCKED`:
- เมื่อ Worker จะหยิบงาน มันจะ Lock แถวนั้นไว้
- หากมี Worker อื่นมาดูพร้อมกัน มันจะ"ข้าม" (SKIP) แถวที่ถูก Lock อยู่ไปดูแถวถัดไปทันที
- ทำให้หลายๆ Worker สามารถรันพร้อมกันได้โดยไม่แย่งงานกัน (High Concurrency 🧵)

---

## 🔬 ขยายความ (Extend)

### การดูแลรักษาในระดับ Production

**1. ระวัง Table Bloat!**
ทุกครั้งที่ Job ทำงานเสร็จ แถวข้อมูลในตารางจะถูกลบหรือย้าย (Archive) ซึ่งจะสร้าง"ขยะ" (Dead Tuples)
- *วิธีแก้:* ต้องตั้งค่า **Autovacuum** ให้ดุดันเป็นพิเศษสำหรับตารางของ pg-boss

```sql
ALTER TABLE pgboss.job SET (autovacuum_vacuum_scale_factor = 0.01);
```**2. การใช้ Singleton Job**บางครั้งเราไม่อยากให้งานซ้ำซ้อนรันพร้อมกัน (เช่น การสรุปยอดเงินรายวัน)
- pg-boss รองรับ`singletonKey`: หากมีงานชื่อเดียวกันและ Key เดียวกันอยู่ในคิวแล้ว มันจะไม่เพิ่มงานใหม่เข้าไปอีกจนกว่างานเก่าจะเสร็จ

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:** อะไรคือข้อดีที่สุดของ pg-boss เมื่อเทียบกับ BullMQ (Redis)?
`SKIP LOCKED` ช่วยแก้ปัญหาอะไรในการทำ Job Queue?
ทำไมเราถึงควรตั้งค่า`autovacuum` ให้ทำงานบ่อยกว่าปกติสำหรับตาราง pg-boss?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>**Transactional Integrity**(สามารถใส่การส่งงานเข้าคิวไว้ใน DB Transaction เดียวกันได้)
ช่วยให้ **Worker หลายคนหยิบงานได้พร้อมกันโดยไม่ติด Lock กันเอง**(เพิ่ม Throughput)
เพราะมีการ Insert/Delete ข้อมูลบ่อยมาก ทำให้เกิด **Table Bloat**(ขยะในตาราง) ได้เร็วกว่าตารางปกติ

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ในโปรเจกต์ของคุณ มีจุดไหนที่"การส่งใบเสร็จ" หรือ"การตัดสต็อก" ทำงานไม่ตรงกับข้อมูลในฐานข้อมูลไหม? การเลือกใช้เครื่องมือที่ให้ความสำคัญกับความถูกต้อง (Consistency ⛓️) มากกว่าความเร็ว (Performance) คือการตัดสินใจที่ Senior Engineer ต้องทำเพื่อความยั่งยืนของระบบ

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[02-bullmq-redis-performance|BullMQ: เมื่อความเร็วคือปัจจัยหลัก]]
- [[../Postgres/05-vacuum-mvcc|เจาะลึกกลไก VACUUM และ MVCC ใน Postgres]]
- [[../Distributed/02-dual-write|ปัญหา Dual Write: เมื่อระบบต้องเขียนข้อมูลลงสองที่พร้อมกัน]]
