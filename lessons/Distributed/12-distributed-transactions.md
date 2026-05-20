---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [system-design, distributed, database, consistency, microservices]
prerequisites: [docs/Learn/Lessons/Distributed/00-overview.md, docs/Learn/Lessons/Distributed/02-dual-write.md]
---

# Distributed Transactions (ธุรกรรมในระบบกระจาย: Saga vs Outbox Pattern)

---

## 🎯 ปฐมนิเทศ (Orient)

ในระบบ Monolith การโอนเงินหรือตัดสต็อกเป็นเรื่องง่ายเพราะเราใช้`BEGIN TRANSACTION` ในฐานข้อมูลตัวเดียว แต่ใน **Microservices ** เมื่อ Order Service อยู่คนละเครื่องกับ Inventory Service เราไม่สามารถใช้ ACID Transaction แบบเดิมได้อีกต่อไป หากเครื่องหนึ่งสำเร็จแต่อีกเครื่องพัง ข้อมูลจะขัดแย้งกันทันที บทเรียนนี้จะสอนวิธีจัดการ **Distributed Consistency ** โดยไม่ต้องใช้ Distributed Lock ที่แสนช้า

---

## 🧪 ลองทำก่อน (Attempt)

> ** สถานการณ์:** คุณกำลังออกแบบระบบจองตั๋วเครื่องบินที่ประกอบด้วย 3 เซอร์วิส:
> 1.**Booking Service:** สร้างคำขอจอง (Postgres)
> 2.**Payment Service:** ตัดเงินจากบัตรเครดิต (External API)
> 3.**Seat Service:** ล็อคที่นั่งในระบบ (MySQL)
> 
> ** โจทย์:** เมื่อผู้ใช้กดจอง ระบบต้องทำทั้ง 3 อย่างให้สำเร็จ ถ้าตัดเงินผ่านแต่ล็อคที่นั่งไม่ได้ คุณต้อง"คืนเงิน" ให้ผู้ใช้โดยอัตโนมัติ
> 
> ** คำถาม:** คุณจะเลือกใช้กลยุทธ์ใดเพื่อให้มั่นใจว่าข้อมูลจะสอดคล้องกัน (Eventually Consistent) โดยที่ระบบยังสามารถรองรับ Traffic สูงๆ ได้?
>
> **✋ หยุดตรงนี้ก่อน **— ลองคิดดูว่าระหว่างการใช้ **Two-Phase Commit (2PC)** กับ **Saga Pattern ** แบบไหนจะทำให้ระบบของคุณ"ล่ม" ได้ง่ายกว่ากันหากมี Network Latency สูง

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"ใช้ Two-Phase Commit (2PC)" | ❌ ** อันตรายในระดับ Scale!**2PC บังคับให้ทุก Database ต้องล็อคแถวข้อมูลไว้จนกว่าทุกคนจะพร้อม หากมีหนึ่งเซอร์วิสช้า ระบบทั้งหมดจะค้าง (Blocking) และเสี่ยงต่อการเกิด Deadlock มหาศาล |
|"เขียน Code เช็ค if-else ปกติ" | ⚠️ ** เสี่ยงข้อมูลหาย!** หาก Server ดับไปในจังหวะที่ตัดเงินเสร็จแต่ยังไม่ได้ล็อคที่นั่ง ระบบจะลืมทำรายการที่เหลือทิ้งไว้เป็นกำพร้า (Zombie transactions) |
|"ใช้ Saga Pattern (Compensating Transactions)" | ✅ **Senior-level Thinking!** คุณยอมรับว่า Strong Consistency นั้นแพงเกินไป และเลือกใช้ **Eventual Consistency ** โดยการเตรียม"รายการชดเชย" (Compensating Actions) ไว้แก้คืนเมื่อเกิดข้อผิดพลาด |

**ทำไมการให้เหตุผลแบบนี้สำคัญ?** เพราะในระบบกระจาย **"Availability" สำคัญกว่า"Instant Consistency"** วิศวกรอาวุโสจะออกแบบระบบให้"ซ่อมแซมตัวเองได้" (Self-healing) แทนที่จะพยายามล็อคโลกทั้งใบไว้ด้วยกัน [source: Pat Helland — Life beyond Distributed Transactions]

---

## 📖 คำอธิบาย (Explain)

### 1. ปัญหาของ Two-Phase Commit (2PC)
2PC พยายามทำ Distributed ACID โดยใช้ Coordinator สั่ง"Prepare" และ"Commit"
-** ข้อเสียหลัก:** มันเป็น **Synchronous & Blocking ** ถ้าโหนดหนึ่งช้า ทุกคนช้าหมด และถ้า Coordinator ตาย ระบบจะค้างอยู่ในสถานะกึ่งกลาง (In-doubt state)

### 2. Saga Pattern: ทางออกที่ทันสมัย
Saga คือชุดของ Local Transactions ที่รันต่อเนื่องกัน ถ้าขั้นตอนหนึ่งพัง Saga จะรัน **Compensating Transactions ** เพื่อย้อนกลับสิ่งที่ทำไปก่อนหน้า

| รูปแบบ (Implementation) | วิธีการ | เหมาะกับ |
|---|---|---|
|**Choreography **| แต่ละเซอร์วิสคุยกันผ่าน Event (ไม่มีคนคุม) | ระบบขนาดเล็กถึงกลาง, ทีมแยกกันอิสระ |
|**Orchestration **| มี"Orchestrator" ตัวกลางคอยสั่งการ | ระบบซับซ้อนที่มีหลายขั้นตอน, ต้องการควบคุม Flow ชัดเจน |

### 3. Transactional Outbox Pattern: การส่ง Event ที่เชื่อถือได้
เพื่อไม่ให้เกิดปัญหา **Dual Write **(DB สำเร็จแต่ส่ง Event เข้า Message Queue พัง) เราจะ:
1. เขียนข้อมูลและ Event ลงในฐานข้อมูลเดียวกันใน **Transaction เดียวกัน **
2. มี Worker ตัวเล็กๆ (Relay) คอยดึง Event จากตาราง Outbox ไปส่งเข้า Message Queue
> **Result:** รับประกันว่า Event จะถูกส่งอย่างน้อยหนึ่งครั้งแน่นอน (At-least-once delivery)

---

## 🔬 ขยายความ (Extend)

### การออกแบบ Compensating Transaction ให้ปลอดภัย

หัวใจของ Saga ไม่ใช่การ Rollback แต่คือการ **"คืนสภาพ"** ซึ่งมีข้อควรระวังดังนี้:
1.**Idempotency:** รายการชดเชยต้องรันซ้ำได้โดยไม่พัง (เช่น การคืนเงินซ้ำต้องไม่ทำให้ยอดติดลบ)
2.**Semantic Recovery:** บางอย่าง"ย้อนกลับ" ไม่ได้จริง (เช่น การส่งอีเมลไปแล้ว) ต้องใช้การส่ง"อีเมลขออภัย" แทน
3.**Isolation Issue:** ในระหว่างที่ Saga ยังไม่จบ ผู้ใช้อื่นอาจเห็นข้อมูลที่กึ่งกลาง (Dirty Read) คุณต้องตัดสินใจว่าจะรับความเสี่ยงนี้ได้ไหม หรือต้องมีสถานะ`PENDING` กำกับไว้

### เมื่อไหร่ควรใช้ Orchestration?
- เมื่อ Flow เริ่มมีเงื่อนไขเยอะ (If-Then-Else)
- เมื่อต้องการเห็นภาพรวม (Visualization) ว่าตอนนี้ Transaction ค้างอยู่ที่ขั้นตอนไหน
- เครื่องมือยอดนิยม:**Temporal.io **,**AWS Step Functions **,**Camunda **

---

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. ความแตกต่างที่สำคัญที่สุดระหว่าง Database Rollback กับ Saga Compensating Transaction คืออะไร?
> 2. ทำไม Outbox Pattern ถึงต้องใช้ Database เดียวกันกับตารางหลัก?
> 3. ในระบบ Saga ผู้ใช้สามารถเห็น"ข้อมูลที่ไม่ถูกต้องชั่วคราว" ได้หรือไม่?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.**Rollback ** คือการทำให้เหมือนไม่เคยเกิดขึ้น (Undo) ส่วน **Compensating ** คือการทำรายการใหม่เพื่อล้างผลกระทบ (Redo/Undo at App level) เพราะข้อมูลถูก Commit ไปแล้ว
2. เพื่อให้ใช้ **Local ACID Transaction ** ของฐานข้อมูลรับประกันว่า"ถ้าข้อมูลเซฟ Event ต้องเซฟด้วย" (Atomic)
3.** ได้ ** — นี่คือการแลกกับประสิทธิภาพที่สูงขึ้น (Eventual Consistency) หากยอมรับไม่ได้ต้องกลับไปใช้ 2PC หรือปรับ Architecture ใหม่

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ในระบบที่คุณทำอยู่ มีจุดไหนบ้างที่"เขียน DB หนึ่งที่แล้วไปเรียก API อีกที่" หรือไม่? ถ้า API นั้นพังหลังจากเขียน DB เสร็จ ข้อมูลในระบบของคุณจะเน่าหรือไม่? คุณมีแผนจะนำ Outbox หรือ Saga มาช่วยอย่างไร?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[02-dual-write|Dual Write Problem: ปัญหาพื้นฐานของระบบกระจาย]]
- [[../05-idempotency|Idempotency: การทำให้การรันซ้ำปลอดภัย]]
- [[../Messaging/03-event-bus|Event Bus และการสื่อสารแบบ Async]]
- [[docs/Upgrade Plan - Overview|ยุทธศาสตร์การออกแบบระบบใหม่ (Greenfield Arch)]]
eld Arch)]]
