---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, system-design, distributed-systems, architecture]
prerequisites: [distributed/04-spof]
next: [distributed/08-multi-tenant]
---

# Stateless VS Stateful (ระบบไร้สถานะ vs ระบบมีสถานะ)

---

## 🎯 ปฐมนิเทศ (Orient)

"ระบบเราต้อง Scale แบบ Horizontal ได้" คือคำพูดติดปากของสถาปนิกซอฟต์แวร์ แต่เบื้องหลังความสามารถนั้นคือการออกแบบให้เป็น **Stateless ** ให้ได้มากที่สุด อย่างไรก็ตาม ในโลกความเป็นจริง เราไม่สามารถหนี **State ** พ้นได้ทั้งหมด (เช่น ฐานข้อมูลหรือระบบแชทแบบ Real-time) บทเรียนนี้จะสอนให้คุณแยกแยะว่าส่วนไหนควรเป็น Stateless เพื่อความง่ายในการขยายระบบ และส่วนไหนต้องยอมเป็น Stateful เพื่อประสิทธิภาพที่เหมาะสม

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️ ** สถานการณ์:** คุณกำลังออกแบบระบบ **Shopping Cart ** สำหรับเว็บ E-commerce ขนาดใหญ่ที่มีผู้ใช้หลักล้านคน ทีมงานถกเถียงกันเรื่องการเก็บข้อมูลสินค้าในตะกร้า:
> 1. เก็บไว้ใน **Memory ของ Web Server ** โดยตรง (รวดเร็วมาก)
> 2. เก็บไว้ใน **Redis **(Stateless server, Stateful storage 📦)
> 3. เก็บไว้ใน **Signed Cookie/JWT ** ที่ Client (ไม่ต้องมี Server storage 📦 เลย)
>
> ** คำถาม:** หากคุณต้องรองรับ Traffic ที่พุ่งสูงขึ้น 10 เท่าในวัน Black Friday และต้องการเพิ่ม Web Server จาก 2 เครื่องเป็น 20 เครื่อง"ทันที" โดยไม่ให้ผู้ใช้ตกใจว่า"ของในตะกร้าหายไปไหน" คุณจะเลือกวิธีใด? และวิธีนั้นมีข้อเสีย (Trade-off 🤝) อย่างไร?

**หยุดตรงนี้ก่อน **— ลองนึกภาพตามว่าถ้า Server เครื่องที่ผู้ใช้คนนั้นต่ออยู่เกิดตายขึ้นมา ข้อมูลจะยังอยู่ไหม?

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"เก็บใน Memory ของ Server" | 🔥** อันตราย!** หาก Load Balancer ส่งผู้ใช้ไปเครื่องอื่น หรือเครื่องนั้น Restart ข้อมูลจะหายทันที (Stateful logic ที่ Scale ยาก) |
|"เก็บใน Signed Cookie/JWT" | ⚠️ ** เกือบใช่!** ทำให้ Server เป็น Stateless สมบูรณ์แบบ แต่มีข้อจำกัดเรื่องขนาดข้อมูล (4KB) และความปลอดภัยหากต้องเก็บข้อมูลเยอะๆ |
|"เก็บใน Redis" | 🏆**Senior-level!** นี่คือแนวทาง **Stateless App with External State **— Server แต่ละเครื่องไม่มีสถานะของตัวเอง ทำให้สลับเครื่องไปมาได้โดยข้อมูลไม่หาย |

**ทำไมคนส่วนใหญ่ถึงพลาด?** เพราะคิดถึงแต่"ความเร็ว" (In-memory latency ⚡) แต่ลืมคิดถึง"ความยืดหยุ่น" (Elasticity) ของระบบกระจายตัว

---

### คำอธิบาย (Explain)

การตัดสินใจเลือกระหว่าง Stateless และ Stateful คือรากฐานของการวางโครงสร้างระบบ ซึ่งจะส่งผลโดยตรงต่อความสามารถในการขยายตัว (Scalability) และความซับซ้อนในการจัดการ [source: Microsoft Azure Architecture Center — Stateless vs. Stateful]

### 1. Stateless (ไร้สถานะ)

คือแนวคิดที่ Server แต่ละเครื่อง **"ไม่จำ"** อะไรเลยเกี่ยวกับคำขอก่อนหน้า (Request) ทุกคำขอที่ส่งมาต้องมีข้อมูลครบถ้วนในตัวเอง หรือไปดึงมาจากแหล่งเก็บข้อมูลกลาง (Centralized Store)

*   **ข้อดี:**Scale ง่ายมาก (Horizontal Scaling), ทำ Load Balancing ง่าย (Round Robin ได้เลย), ระบบทนทาน (Fault Tolerant) เพราะเครื่องไหนตายก็แทนกันได้
*   **ตัวอย่าง:**REST API ที่ใช้ JWT, ระบบคำนวณภาษี, Web Server ทั่วไป

### 2. Stateful (มีสถานะ)
คือแนวคิดที่ Server **"จำ"** ข้อมูลของผู้ใช้ไว้ในตัวเอง (In-process/In-memory) การสื่อสารครั้งต่อไปต้องคุยกับ Server"เครื่องเดิม" เท่านั้นถึงจะเข้าใจกัน

*   **ข้อดี:** ประสิทธิภาพสูงมาก (Latency ต่ำที่สุดเพราะไม่ต้องคุยกับ DB/Network 📡), เหมาะกับงานที่ต้องคุยกันต่อเนื่องตลอดเวลา
*   **ตัวอย่าง:** ฐานข้อมูล 📦 (PostgreSQL), ระบบแชท (WebSockets), ระบบเกมออนไลน์

### ตารางเปรียบเทียบเชิงลึก

| หัวข้อเปรียบเทียบ | Stateless | Stateful |
|:---|:---|:---|
|** การขยายระบบ (Scaling)**| ง่ายมาก (แค่เพิ่มเครื่อง) | ยาก (ต้องจัดการ Data Consistency ⛓️) |
|** การกระจายโหลด **| ใช้ Load Balancer แบบทั่วไปได้ | ต้องใช้ **Sticky Sessions **(Session Affinity) |
|** ความทนทาน (Resilience)**| สูงมาก เครื่องแทนกันได้หมด | ต่ำ เครื่องตายข้อมูลในตัวหายทันที |
|** ความซับซ้อน **| โค้ดง่าย แต่ต้องจัดการที่เก็บข้อมูลกลาง | โค้ดซับซ้อน (Concurrency 🧵, Locks) |

---

## 🔬 ขยายความ (Extend)

### เมื่อไหร่ที่เรา"หนี" Stateful ไม่พ้น?

ในระบบขนาดใหญ่ เรามักจะทำแอปให้เป็น Stateless แต่เราต้องมี **Stateful Infrastructure 🏗️ ** มาช่วย:
**Distributed Caching (Redis/Memcached):** เพื่อแชร์สถานะระหว่าง Stateless Server
**WebSocket 📡 Management:** เมื่อผู้ใช้ต่อ Socket กับ Server A แล้ว Server B จะไม่รู้เรื่องด้วย วิธีแก้คือใช้ **Pub/Sub (Redis)** เพื่อบรอดแคสต์ข้อความข้ามเครื่อง
**StatefulSets ใน Kubernetes:** หากคุณต้องรัน Database 📦 หรือ Kafka บน K8s คุณต้องใช้ StatefulSet เพื่อให้เครื่องนั้นมี"ชื่อเดิม" และ"Storage เดิม" เสมอแม้จะโดนย้ายไปรัน Node อื่น

### กลยุทธ์"Sticky Sessions" (Session Affinity)
หากจำเป็นต้องใช้ Stateful (เช่น แอปเก่าที่แก้ไม่ได้) Load Balancer จะต้องจดจำว่า IP นี้ต้องไปที่ Server เครื่องเดิมเสมอ:
-** ข้อเสีย:** หาก Server เครื่องนั้นคอขวด (Hot Spot) เราจะไม่สามารถกระจายโหลดไปเครื่องอื่นได้เลย จนกว่า Session จะหมดอายุ

---

## ✅ จุดตรวจสอบ (Checkpoint)

> 🎯**Quick Check:**
> 1. หากใช้ JWT ในการทำ Authentication ระบบนั้นถือว่าเป็น Stateless หรือ Stateful?
> 2. ข้อเสียที่ใหญ่ที่สุดของการเก็บ Session ไว้ใน Memory ของ Web Server คืออะไร?
> 3. ทำไม Load Balancer ของระบบที่เป็น Stateless ถึงทำงานได้ประสิทธิภาพดีกว่าระบบ Stateful?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>

**Stateless ** เพราะสถานะการล็อกอินถูกเก็บไว้ที่ฝั่ง Client (ในตัว JWT) และ Server ไม่ต้องเก็บสถานะนี้ไว้ใน DB หรือ Memory เพื่อตรวจสอบในทุก Request
**Scalability และ Fault Tolerance **— คุณไม่สามารถเพิ่ม/ลดเครื่องได้ตามใจชอบ และถ้าเครื่องล่ม ข้อมูล Session ทั้งหมดในเครื่องนั้นจะหายวับไปทันที
**ความยืดหยุ่นในการกระจายโหลด ** — Load Balancer สามารถส่ง Request ไปยังเครื่องที่ว่างที่สุดได้ทันที (Least Connections/Round Robin) โดยไม่ต้องกังวลเรื่องการเชื่อมต่อค้างไว้กับเครื่องเดิม

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭"Everything is stateless until it isn't." — ภารกิจของวิศวกรคือการผลัก State ออกไปให้ไกลจาก Application logic ให้มากที่สุด เพื่อให้ระบบของคุณสามารถ"เกิดและดับ" ได้ตลอดเวลาโดยไม่มีผลกระทบต่อผู้ใช้

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[../Distributed/02-consistency-vs-availability|Consistency vs Availability: เมื่อ State ต้องกระจายตัว]]
- [[../Networking/01-load-balancing-l4-l7|Load Balancing: การจัดการ Sticky Session]]
- [[../Messaging/01-google-pubsub|Pub/Sub: หัวใจของการแชร์สถานะในระบบ Real-time]]
