---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, system-design, postgres]
---

# Connection Pooling & Replicas (การขยายระบบให้รองรับโหลดมหาศาล)

---

## 🎯 ปฐมนิเทศ (Orient)

เมื่อแอปพลิเคชันของคุณโตขึ้น ปัญหาที่คุณจะเจอไม่ใช่แค่ Query ช้า แต่คือการที่ Database **"หมดลมหายใจ"** เพราะทนรับการเชื่อมต่อพร้อมกัน (Concurrent Connections) ไม่ไหว หรือไม่สามารถประมวลผลการอ่านข้อมูลมหาศาลได้ทันในเครื่องเดียว

บทเรียนนี้จะสอนวิธีแก้ปัญหาด้วย 2 อาวุธหนัก:**Connection Pooling**(เพื่อลดภาระการสร้าง Connection) และ **Read Replicas**(เพื่อแยกภาระการอ่านออกจากเครื่องหลัก)

---

## 🧪 ลองทำก่อน (Attempt)

> **สถานการณ์**:คุณรันแอปบน Kubernetes และตั้งค่า`max_connections` ของ Postgres ไว้ที่ 500 แต่เมื่อคุณ Scale Pods เพิ่มเป็น 50 Pods (แต่ละ Pod มี 20 connections) ระบบกลับพังทันทีพร้อมข้อความ:`FATAL: remaining connection slots are reserved for non-replication superuser connections`
>
>**คำถาม**:ในฐานะ Senior Engineer คุณจะแก้ปัญหานี้อย่างไร? ระหว่าง"เพิ่ม`max_connections` เป็น 2,000" กับ"ติดตั้ง PgBouncer"? และเพราะอะไร?**หยุดคิดสักครู่**— การเพิ่มเลข`max_connections` ให้สูงๆ มีราคาที่ต้องจ่ายหรือไม่?

---

## 💬 ผลตอบรับ (Feedback)

| สิ่งที่คุณอาจคิด | การวิเคราะห์ (Senior Perspective) |
|---|---|
|"แค่เพิ่ม`max_connections` ก็จบ" | ❌ **อันตราย!** ทุก Connection ใน Postgres คือ 1 Process ใน OS ซึ่งใช้ Memory และ CPU มหาศาล การมี Process เยอะเกินไปจะทำให้เกิด Context Switching จนระบบอืดลงอย่างมาก |
|"ใช้ Connection Pool ภายในแอป (เช่น HikariCP)" | ⚠️ ช่วยได้ในระดับหนึ่ง แต่ถ้าคุณมีหลายสิบ Microservices แต่ละตัวก็ยังจองที่นั่งของตัวเองจนเต็มอยู่ดี |
|"ติดตั้ง PgBouncer (External Pooler)" | ✅**ถูกต้อง!** PgBouncer จะเป็นตัวกลางที่ช่วยจัดการ"แชร์" Connection จริงๆ ให้กับแอป ทำให้คุณรองรับ Pods เป็นร้อยได้ด้วย Connection จริงเพียงไม่กี่สิบ |

---

### คำอธิบาย (Explain)

ในระบบที่มีการเชื่อมต่อจำนวนมาก การใช้ Connection Pooler อย่าง PgBouncer จะช่วยลดภาระในการสร้างและทำลาย Connection ของฐานข้อมูลได้อย่างมหาศาล โดยเฉพาะในโหมด Transaction [source: PgBouncer.org — Usage and Features]

### 1. Connection Pooling: หัวใจของการ Scaling

PostgreSQL ออกแบบมาให้ 1 Connection = 1 Process ซึ่งมีค่าใช้จ่าย (Overhead) สูงมาก

#### PgBouncer Pooling Modes:

*   **Session Mode:** 1 แอปจอง 1 Connection จนกว่าจะปิดแอป (เหมือนไม่ได้ใช้ Pooler)
*   **Transaction Mode (แนะนำ):** จอง Connection เฉพาะตอนรัน Transaction พอจบปุ๊บ คืนให้คนอื่นใช้ทันที! (เหมาะมากสำหรับ Microservices)
*   **Statement Mode:** คืนทันทีที่รัน 1 คำสั่งเสร็จ (ห้ามใช้ถ้ามีการใช้ Transaction)

### 2. Read Replicas: แบ่งเบาภาระเครื่องหลัก

หากเครื่อง Primary ของคุณเริ่มรับโหลด"การอ่าน" ไม่ไหว (CPU 100%) ทางแก้คือการสร้างสำเนาข้อมูล (Replica)

#### กลไกการทำ Replication:

*   **Physical Replication:** ส่งไฟล์ WAL (Logs) ไปทั้งดุ้น เร็วและแม่นยำที่สุด
*   **Synchronous**: เขียน Primary เสร็จ ต้องรอ Replica ยืนยัน (ปลอดภัยแต่ช้า ⚡)
*   **Asynchronous (ยอดนิยม):** เขียน Primary เสร็จแล้วค่อยส่งไป Replica (เร็วแต่ข้อมูลอาจ Delay หลักมิลลิวินาที)

---

## 🔬 ขยายความ (Extend)

### Load Balancing: ใครจะอ่านเครื่องไหน?

เมื่อมีเครื่องอ่าน (Read Replicas) หลายเครื่อง แอปของคุณต้องรู้ว่าจะส่ง Query ไปที่ไหน
*   **Application Level:** ใน Code ต้องแยก Database 📦 Connection ระหว่าง`Writer` (Primary) และ`Reader` (Replica Cluster)
*   **Infrastructure 🏗️ Level:** ใช้ Proxy เช่น **HAProxy** หรือ **Cloud Load Balancer** เพื่อกระจายงานไปยัง Replicas

### Replication Lag: สิ่งที่ต้องระวัง

เนื่องจากข้อมูลส่งไปแบบ Async บางครั้งคุณเขียนข้อมูลลง Primary ปุ๊บ แล้วไปอ่านจาก Replica ทันที ข้อมูลอาจจะยังไปไม่ถึง! (เกิดอาการ"หาข้อมูลที่เพิ่งสร้างไม่เจอ")
*   **วิธีแก้**: สำหรับ Logic ที่สำคัญมาก (เช่น เพิ่งกดจ่ายเงินเสร็จ) ให้บังคับอ่านจาก Primary เสมอ

### กรณีศึกษา: สถาปัตยกรรมระบบแชทจริง (Scaling Strategy)

ในระบบตัวอย่างที่เราศึกษา ซึ่งรองรับ Agent นับพันคนพร้อมกัน:
*   ใช้ **PgBouncer** ในโหมด **Transaction** เพื่อรับโหลดจาก 19 Microservices
*   ใช้ **Read Replicas** เพื่อให้ระบบ Dashboard ของ Agent ดึงข้อมูลประวัติแชทมหาศาลโดยไม่รบกวนการรับส่งข้อความ Real-time ⏰ ในเครื่อง Primary

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:** ทำไมการมี`max_connections` เยอะๆ ถึงทำให้ CPU ทำงานหนักขึ้น?
ความแตกต่างระหว่าง Transaction Mode และ Session Mode ใน PgBouncer คืออะไร?
หากต้องการทำ Report ประจำปีที่ต้องสแกนตารางทั้งใบ ควรส่ง Query นี้ไปที่เครื่องใด?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>

เพราะเกิด **Context Switching**— CPU ต้องสลับไปมาเพื่อจัดการ Process จำนวนมากจนไม่มีเวลาทำงานจริง
**Session Mode** จองขาด (1 แอป : 1 DB Connection) |**Transaction Mode** จองเฉพาะช่วงที่ทำงาน (จบ COMMIT/ROLLBACK ปุ๊บ คืนให้คนอื่นทันที)**Read Replica** — เพื่อป้องกันไม่ให้การสแกนข้อมูลมหาศาลไปแย่งทรัพยากรจากการทำงานปกติในเครื่อง Primary

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 วันนี้ระบบของคุณมี Connection Pooler หรือยัง? และถ้าคืนนี้ Traffic พุ่งขึ้น 10 เท่า ระบบของคุณจะขยายตัวได้ทันที หรือจะล่มเพราะ"ที่นั่ง (Connections) เต็ม"?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[01-table-partitioning\|Table Partitioning — การเตรียมข้อมูลให้พร้อมสำหรับการสแกนใน Replicas]]
- [[11-transactions-isolation\|Isolation Levels — เข้าใจว่าความล่าช้าของข้อมูล (Lag) ใน Replica มีผลกับความถูกต้องอย่างไร]]
- [[../Core/04-database-sharding\|Database Sharding — เมื่อการทำ Replicas เครื่องเดียวไม่พอรับโหลดการเขียน]]
