---
contentType: learning-loop
level: senior
status: polished
tags: [devops, system-design, zero-downtime, database-migrations]
prerequisites: [09-load-balancer, 10-monolith-microservice-monorepo]
---

# Zero Downtime Deployment: เมื่อการอัปเดตระบบต้องไม่สะดุด

---

## 🎯 ปฐมนิเทศ (Orient)

การกดปุ่ม Deploy แล้วภาวนาไม่ให้ระบบล่มคือสัญลักษณ์ของระบบที่ยังไม่โตพอ (Junior-level Ops) ในโลกของระบบขนาดใหญ่ การอัปเดตซอฟต์แวร์ต้องเกิดขึ้นได้ตลอดเวลาโดยที่ผู้ใช้ **ไม่รู้สึกตัวแม้แต่นิดเดียว **(Zero Downtime)

อย่างไรก็ตาม ปัญหาที่แท้จริงของการทำ Zero Downtime ไม่ใช่แค่การสลับ Traffic ระหว่างเซิร์ฟเวอร์ แต่คือการจัดการ **"ความไม่เข้ากันของข้อมูล" (Schema Incompatibility)** เมื่อโค้ดเวอร์ชันใหม่ต้องรันคู่กับฐานข้อมูลเวอร์ชันเก่า (หรือกลับกัน) ในระหว่างการเปลี่ยนผ่าน

---

## 🧪 ลองทำก่อน (Attempt)

> ** สถานการณ์:** คุณใช้ **Blue-Green Deployment ** เพื่ออัปเดตระบบ E-commerce
> -** โจทย์:** คุณต้องเปลี่ยนชื่อคอลัมน์จาก`user_name` เป็น`full_name` ในฐานข้อมูล PostgreSQL
> -** สถานะปัจจุบัน:**Blue (v1) กำลังรันอยู่และใช้คอลัมน์`user_name`
>
> ** คำถาม:** หากคุณรัน Migration เพื่อเปลี่ยนชื่อคอลัมน์ (RENAME COLUMN) ทันทีที่เริ่ม Deploy เวอร์ชันใหม่ (Green - v2) อะไรจะเกิดขึ้นกับระบบ? และคุณจะแก้ปัญหานี้อย่างไรให้ Zero Downtime จริงๆ?
>
> **✋ หยุดตรงนี้ก่อน **— อย่าเพิ่งตอบว่า"ก็แค่สลับ Traffic ให้เร็ว" เพราะต่อให้สลับใน 1 มิลลิวินาที ระบบ Blue ที่เหลืออยู่ก็อาจจะพังไปแล้ว!

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"รัน Migration แล้วรีบสลับ Blue เป็น Green" | ❌ ** พังแน่นอน!** ในระหว่างที่ Green กำลังไล่รัน Health Check เซิร์ฟเวอร์ Blue ที่ยังรับ Traffic อยู่จะ Error ทันทีเพราะหาคอลัมน์`user_name` ไม่เจอ (เนื่องจากชื่อโดนเปลี่ยนไปแล้ว) |
|"เข้า Maintenance Mode สัก 5 นาที" | ❌ ** ไม่ตรงโจทย์!** นี่คือ Downtime แม้จะสั้นแต่มันส่งผลต่อ SLA และประสบการณ์ผู้ใช้ |
|"ใช้ท่า Expand-Contract (Parallel Change)" | ✅ ** นี่คือภูมิปัญญาของ Senior!** คุณเข้าใจว่าต้อง"แตก (Expand)" ให้ DB รองรับทั้งสองชื่อพร้อมกันก่อน แล้วค่อย"หุบ (Contract)" หลังจากทุกอย่างนิ่งแล้ว นี่คือวิธีเดียวที่ปลอดภัย 100% |

**ทำไมการให้เหตุผลแบบนี้สำคัญ?** เพราะ Zero Downtime คือเรื่องของ **Backward & Forward Compatibility **Senior Engineer จะไม่มองแค่สถานะ A ไป B แต่จะมองสถานะ"A และ B รันพร้อมกัน" (Transient State) ซึ่งเป็นช่วงที่เปราะบางที่สุด

---

### คำอธิบาย (Explain)

การเลือกยุทธศาสตร์การ Deploy ขึ้นอยู่กับงบประมาณและความเสี่ยงที่ยอมรับได้ โดยมีเป้าหมายสูงสุดคือการเปลี่ยนเวอร์ชันโดยไม่กระทบผู้ใช้ [source: AWS Documentation — Blue-Green and Canary Deployment Best Practices]

### 1. ยุทธศาสตร์การ Deploy (Deployment Strategies)


| Strategy | วิธีการ | ข้อดี | สิ่งที่ต้องแลก (Trade-off 🤝) |
|---|---|---|---|
|**Rolling Update **| ค่อยๆ เปลี่ยนทีละเครื่องใน Pool | ใช้ทรัพยากรเท่าเดิม | ระบบมี 2 เวอร์ชันรันพร้อมกันนานที่สุด |
|**Blue-Green **| มี Pool ใหม่ (Green) เท่ากับของเดิม (Blue) แล้วสลับทีเดียว | Rollback เร็วมาก (แค่สลับคืน) | ต้องใช้ทรัพยากร x2 (เปลืองเงิน) |
|**Canary **| ปล่อยเวอร์ชันใหม่ให้ผู้ใช้แค่ 5-10% ก่อน | เจอ Bug เร็วโดยเจ็บตัวน้อย | จัดการ Traffic ยาก (ต้องใช้ Sticky Session หรือ Header) |

### 2. หัวใจของ Zero Downtime DB: Expand-Contract Pattern
การเปลี่ยน Schema แบบทำลายล้าง (Breaking Changes) ต้องทำเป็น 5 ขั้นตอนเสมอ:

1.**Expand (Phase 1):** เพิ่มคอลัมน์ใหม่ (`full_name`) แบบ Nullable เข้าไปใน DB (ห้ามลบอันเก่า!)
2.**Migrate (Phase 2):** อัปเดตโค้ดเวอร์ชันใหม่ให้ ** เขียนลงทั้งสองคอลัมน์ **(Dual Write) แต่ยังอ่านจากอันเก่า
3.**Backfill (Phase 3):** รันสคริปต์ย้ายข้อมูลจาก`user_name` ไป`full_name` สำหรับข้อมูลเก่า
4.**Switch (Phase 4):** อัปเดตโค้ดให้อ่านและเขียนจาก`full_name` อย่างเดียว
5.**Contract (Phase 5):** เมื่อมั่นใจว่าไม่มีใครใช้`user_name` แล้ว จึงค่อย DROP คอลัมน์นั้นทิ้ง

---

## 🔬 ขยายความ (Extend)

### การจัดการ Stateful Sessions
หากแอปของคุณเก็บ Session ไว้ใน Memory (In-memory Session) เมื่อมีการ Deploy และเครื่องเก่าถูกปิด ผู้ใช้จะหลุดทันที (Session Drop)
-** วิธีแก้:** ใช้ **Distributed Session Cache **(เช่น Redis) เพื่อให้ทุกเวอร์ชันเข้าถึงข้อมูลเดียวกันได้ หรือใช้ **Graceful Shutdown ** เพื่อรอให้ Request ที่ค้างอยู่ทำงานจนจบก่อนปิดเครื่อง

### Health Checks กับการ Deploy
-**Readiness Probe:** บอก Load Balancer ว่า"ฉันพร้อมรับ Traffic แล้วนะ" (Green ต้องผ่านอันนี้ก่อน Blue จะโดนตัด)
-**Liveness Probe:** บอกระบบว่า"ฉันยังไม่ตาย" (ถ้าพังให้รีสตาร์ท)
**Senior Tip:** อย่าเซ็ต Readiness ให้ผ่านเร็วเกินไป ควรเผื่อเวลาให้แอปทำ Warm-up (เช่น อุ่น Cache หรือเชื่อมต่อ DB) ก่อนรับงานจริง

---

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. หากคุณใช้ Blue-Green Deployment แต่ฐานข้อมูลของคุณมีเพียงตัวเดียว (Single Instance) คุณยังสามารถทำ Zero Downtime ได้หรือไม่?
> 2. ในระหว่างการทำ Expand-Contract ช่วงไหนที่มีความเสี่ยงสูงสุดเรื่อง Data Consistency?
> 3. ทำไมเราถึงต้องรอสักพัก (เช่น 1-2 วัน) ก่อนจะรันขั้นตอน Contract (ลบคอลัมน์เก่า)?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.** ได้ ** แต่ต้องใช้ท่า Expand-Contract เพราะโค้ดทั้ง Blue และ Green จะต่อเข้าหา DB ตัวเดียวกัน
2.** ช่วง Backfill ** เพราะข้อมูลอาจจะเปลี่ยนไประหว่างที่สคริปต์กำลังรัน (ต้องใช้ Transaction หรือ Dual Write ให้ครอบคลุม)
3.** เพื่อการ Rollback ** หากเวอร์ชันใหม่มี Bug ร้ายแรงและต้องสลับกลับไป Blue (เวอร์ชันเก่า) เราต้องมั่นใจว่า Blue ยังทำงานได้เพราะคอลัมน์เก่ายังอยู่

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ลองนึกถึงการ Deploy ครั้งที่พังที่สุดของคุณ: ปัญหานั้นเกิดจาก"ตัวโค้ด" หรือเกิดจาก"ความไม่เข้ากันของข้อมูลระหว่างเปลี่ยนผ่าน"? การนำ Expand-Contract มาใช้จะช่วยป้องกันเหตุการณ์นั้นได้หรือไม่?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)
- [[09-load-balancer|Load Balancer: ตัวจัดระเบียบ Traffic]]
- [[Distributed/01-self-recovery|Self-Recovery & Health Checks]]
- [[Postgres/11-transactions-isolation|Transactions & Concurrency]]
- [[Distributed/02-dual-write|Dual Write Problem]]

> ** อ้างอิง:**
> - [Martin Fowler — Blue Green Deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)
> - [Parallel Change Pattern](https://martinfowler.com/bliki/ParallelChange.html)
> - [AWS Blog — Zero Downtime Database Migrations](https://aws.amazon.com/blogs/database/automating-zero-downtime-database-migrations/)
