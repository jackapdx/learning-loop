---
verified: false
contentType: overview
level: senior
status: polished
tags: [chat-exp, system-design, distributed]
---

# Distributed Systems Patterns — ซีรีส์ออกแบบระบบกระจาย

> [!info] ปฐมนิเทศ
> Distributed Systems ไม่ได้พังแบบ"มี Bug" — มันพังแบบ"ทุกอย่างทำงานถูกต้องตาม Design แต่ระบบยังพัง" เพราะธรรมชาติของ Distributed Systems เต็มไปด้วย Partial Failures, Network 📡 Partitions, และ Timing Assumptions ที่ผิด
>
ซีรีส์นี้รวบรวม **13 บทเรียน ** ที่ครอบคลุม Patterns ที่ใช้แก้ปัญหาเหล่านี้ใน Production จริง

Each lesson takes **5-10 minutes **based on the **Learning Loop **principle.

## 🗺️ แผนผังการเรียนรู้ (Roadmap)

### Path A: Resilience & Scalability → #1, 4, 7, 10, 11
[[01-self-recovery|Self-Recovery]] (Circuit Breaker) + [[04-spof|Single Point of Failure]] + [[07-stateless-vs-stateful|Stateless vs Stateful]] + [[10-distributed-id-generation|Distributed ID Generation]] + [[11-distributed-rate-limiting|Distributed Rate Limiting]] — ทำให้ระบบไม่พังและ Scale ได้แบบ Horizontal โดยไม่มีคอขวดที่ ID และป้องกันการโดนถล่มด้วย Request

### Path B: Data Consistency & Optimization → #2, 3, 9, 12, 13
[[02-dual-write|Dual Write Problem]] (DB + Event Bus) + [[03-feed-fan-out|Feed Fan-out]] (Push 📱/Pull Hybrid) + [[09-cqrs|CQRS]] (Read/Write Segregation) + [[12-distributed-transactions|Distributed Transactions]] + [[13-probabilistic-data-structures|Probabilistic Data Structures]] — ทำให้ข้อมูลถูกต้อง อ่านเร็ว และประหยัด RAM สูงสุดด้วย Bloom Filters

### Path C: Infrastructure Reliability → #5, 6, 8
[[05-circular-dependencies|Circular Dependencies]] + [[06-blast-radius-guardrails|Blast Radius & Guardrails]] + [[08-multi-tenant|Multi-Tenant Architecture]] — ออกแบบโครงสร้างพื้นฐานให้ทนทานและรองรับลูกค้าหลายรายอย่างปลอดภัย

## 📋 รายชื่อบทเรียนทั้งหมด (Lesson List)

| # | บทเรียน | คำถามสัมภาษณ์ |
|---|---|---|
| 1 | [[01-self-recovery\|Self-Recovery]] |"Service B พัง — Service A ควรทำยังไง? (ไม่ใช่แค่ Retry)" |
| 2 | [[02-dual-write\|Dual Write Problem]] |"เขียน DB กับ Pub/Sub พร้อมกัน — ถ้าอันใดอันหนึ่งพังล่ะ?" |
| 3 | [[03-feed-fan-out\|Feed Fan-out]] |"Push 📱 หรือ Pull? แล้ว Hybrid คืออะไร?" |
| 4 | [[04-spof\|Single Point of Failure]] |"SPOF ในระบบคุณ — หาให้ครบทุกระดับ (รวม DNS, CI/CD, คน)" |
| 5 | [[05-circular-dependencies\|Circular Dependencies]] |"ทำไม Meta ถึงล่มจนวิศวกรเข้าออฟฟิศไม่ได้? และวิธีแก้ด้วย Level 0 Service" |
| 6 | [[06-blast-radius-guardrails\|Blast Radius & Guardrails]] |"การจำกัดพลังทำลายล้าง: วิธีป้องกันไม่ให้ Script เดียวทำพังทั้งภูมิภาค" |
| 7 | [[07-stateless-vs-stateful\|Stateless vs Stateful]] |"ทำไมเราถึงต้องผลัก State ออกไปไว้ที่ Redis? และ Sticky Session มีข้อเสียอย่างไร?" |
| 8 | [[08-multi-tenant\|Multi-Tenant Architecture]] |"วิธีแก้ปัญหา 'เพื่อนบ้านเสียงดัง' (Noisy Neighbor) ในระบบ SaaS คืออะไร?" |
| 9 | [[09-cqrs\|CQRS]] |"เมื่อไหร่ควรแยก Read Database ออกจาก Write Database? และจะซิงค์ข้อมูลยังไงให้เร็ว?" |
| 10 | [[10-distributed-id-generation\|Distributed ID Generation]] |"UUID v4, v7 หรือ Snowflake? เลือก ID ยังไงไม่ให้ Index พัง?" |
| 11 | [[11-distributed-rate-limiting\|Distributed Rate Limiting]] |"ตั้งโควต้า 100 req/min แต่มี 50 Servers จะคุมยังไงไม่ให้เกินจริง?" |
| 12 | [[12-distributed-transactions\|Distributed Transactions]] |"Saga vs 2PC: จะจัดการ Transaction ข้าม Microservices ยังไงโดยไม่ให้ระบบค้าง?" |
| 13 | [[13-probabilistic-data-structures\|Probabilistic Data Structures]] |"นับ User 1,000 ล้านคนด้วย RAM 1.5 KB? และ Bloom Filter ช่วยลด Disk I/O ได้ยังไง?" |





> [!question] ลองทำก่อน
> ก่อนเริ่มเรียน ลองตอบคำถามนี้:
>
> ระบบ E-commerce ของคุณใช้ Microservices — Order Service ต้อง:
> 1. เขียน Order ลง PostgreSQL
> 2. ส่ง Event`OrderCreated` เข้า Kafka
> 3. ลด Stock ใน Inventory Service
>
> ถ้า Kafka พังหลังจาก PostgreSQL สำเร็จ — Order ถูกสร้างแต่ Event ไม่ส่ง — ระบบจะรู้ได้อย่างไร? และจะแก้ไขด้วยตัวเองได้ไหม?
>
> หยุดคิด 30 วินาที... แล้วเริ่มเรียนบทที่ 1 และ 2
