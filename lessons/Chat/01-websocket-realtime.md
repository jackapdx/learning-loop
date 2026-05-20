---
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, real-time, websocket, networking]
prerequisites: [Chat/00-overview]
---

# WebSocket & Real-time Connections (ยุทธศาสตร์การเชื่อมต่อแบบ Real-time)

---

## ปฐมนิเทศ (Orient)

คำถาม"ออกแบบระบบ Chat" มักเริ่มต้นด้วย"คุณจะส่งข้อความแบบ Real-time ได้อย่างไร?" แม้คำตอบจะมีมากมายตั้งแต่ WebSocket ไปจนถึง gRPC แต่สิ่งที่แยกแยะความเป็น Senior คือการเลือก Protocol ตาม **Trade-offs ** ของเครือข่ายและความคุ้มค่าของทรัพยากร ไม่ใช่เพียงการทำตามกระแสเทคโนโลยี

---

## ลองทำก่อน (Attempt)

> ** สถานการณ์:** คุณต้องออกแบบแอปแชทที่มีผู้ใช้ใช้งานพร้อมกัน (Concurrent Users) 1 ล้านคน โดยมีโจทย์คือ:
> 1. ผู้ใช้กระจัดกระจายอยู่ทั่วโลก รวมถึงพื้นที่ที่อินเทอร์เน็ตไม่เสถียร (High packet loss)
> 2. ต้องประหยัดแบตเตอรี่โทรศัพท์มือถือของผู้ใช้ให้มากที่สุด (Strict battery optimization)
>
> ** ข้อจำกัด:**
> - Server มีทรัพยากรจำกัด (RAM 16GB ต่อโหนด)
> - ต้องรองรับการทำงานในสภาวะที่แอปถูกย้ายไปทำงานใน Background
>
> ** คำถาม:** คุณจะเลือกใช้โปรโตคอลใด และมีกลยุทธ์การ Reconnection อย่างไรเพื่อให้ระบบยังคงมีเสถียรภาพโดยไม่ผลาญแบตเตอรี่?
>
> **✋ หยุดตรงนี้ก่อน **— ลองใช้เวลาคิดสัก 30 วินาทีถึงผลกระทบของการ"ถือสายค้างไว้" (Keep-alive) ในสภาวะเน็ตไม่ดี

---

## ผลตอบรับ (Feedback)

| หากคุณตอบว่า...                                   | การวิเคราะห์                                                                                                                                                     |
| :------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|"ใช้ WebSocket 📡 อย่างเดียวทุกกรณี"              | ⚠️ ** เสี่ยง!** ในพื้นที่เน็ตไม่ดี WebSocket จะหลุดบ่อย การ Reconnect ทันทีแบบถี่ๆ จะผลาญแบตเตอรี่และสร้าง Thundering Herd 🐂 ให้ Server จนล่มซ้ำซ้อน             |
|"ใช้ HTTP Polling"                                | ❌ ** พังแน่นอน!**1 ล้านคนที่เรียก API ทุกๆ 2-3 วินาที จะทำให้ Server น็อคทันทีจาก Overhead ของ HTTP Headers และ TCP Handshakes                                   |
|"WebSocket 📡 + Push 📱 Notification 📱 Fallback" | ✅ **Senior-level!** คุณแยกแยะระหว่างการส่งข้อมูลแบบ Real-time (Active) และการประหยัดพลังงาน (Background) และเข้าใจว่า Protocol เดียวไม่สามารถตอบโจทย์ได้ทุกสภาวะ |

**ทำไมการให้เหตุผลแบบนี้สำคัญ?** เพราะวิศวกรอาวุโสมองว่า"Connectivity" เป็นทรัพยากรที่มีราคา (Resource Cost) การ Reconnect แต่ละครั้งมีค่าใช้จ่ายทั้ง CPU, Memory และ Battery

---

## คำอธิบาย (Explain)

### 4 โปรโตคอลหลักสำหรับการสื่อสาร Real-time

| โปรโตคอล | Latency | ภาระ Server | ภาระแบตเตอรี่ | ข้อดี | สิ่งที่ต้องแลก (Trade-off) |
|:---|:---:|:---:|:---:|---|---|
|**WebSocket 📡**| ต่ำที่สุด | สูง | ปานกลาง | Full-duplex, real-time | Stateful, Scale ยาก (Sticky Session) |
|**SSE **| ต่ำ | ปานกลาง | ต่ำ | ทำงานบน HTTP ปกติ, Auto-reconnect | รับข้อมูลได้ทางเดียว (Uni-directional) |
|**Long Polling **| สูง | สูงมาก | สูง | รองรับ Browser เก่าๆ | สร้าง Connection ใหม่บ่อยมาก |
|**Push 📱**| ปานกลาง | ต่ำ | ต่ำที่สุด | ทำงานได้แม้แอปปิด | ควบคุม Latency ไม่ได้ (Best-effort) |

### WebSocket: ราคาที่ต้องจ่ายในระดับ OS

เมื่อคุณ Scale ถึงระดับล้านสาย คุณจะเจอปัญหาที่ไม่ได้อยู่ใน Tutorial:
1.**File Descriptors:**1 Connection = 1 File Descriptor (ต้องปรับ`ulimit` ใน Linux)
2.**Memory Per Connection:** แม้จะไม่ได้ส่งข้อมูล แต่ Buffer ของ TCP stack ก็กิน RAM (ประมาณ 4KB-16KB ต่อสาย)
3.**Sticky Sessions:** เมื่อมี Server หลายตัว คุณต้องใช้ Redis Pub/Sub เพื่อ"ตะโกน" บอก Server ตัวอื่นว่า User ที่เชื่อมต่ออยู่กับคุณได้รับข้อความแล้ว

การจัดการการเชื่อมต่อระดับล้านคนต้องการสถาปัตยกรรมแบบ Distributed Gateway ที่แยกส่วน Connection termination ออกจาก Business logic [source: Discord Engineering — How Discord Scaled Elixir to 5,000,000 Concurrent Users]

---

---

## ขยายความ (Extend)

### Connection Strategy: เมื่อไหร่ควรใช้อะไร?

**1. Client กำลัง Active (Forefront):**
- ใช้ **WebSocket 📡** เป็นหลัก
- ใช้ **Exponential Backoff ** ในการ Reconnect (เช่น 1s, 2s, 4s, 8s...) เพื่อป้องกันการรุมถล่ม Server

**2. Client อยู่ใน Background:**
-** ตัดสาย WebSocket ทิ้งทันที!** คืนทรัพยากรให้ Server
- ใช้ **Push 📱 Notification 📱** เพื่อแจ้งเตือน และปลุกแอปให้มาดึงข้อมูล (Fetch) เฉพาะเมื่อจำเป็น

### กรณีศึกษา: สถาปัตยกรรมระบบแชทจริง

ในระบบจริงของเรา เราไม่ได้เขียน WebSocket Server เองทั้งหมด แต่ใช้แนวทาง Hybrid:
-**Firebase Realtime DB:** ใช้สำหรับ State ที่ต้อง Sync ทันที (Typing Indicators, Presence)
-**Google Pub/Sub:** ใช้เป็น Message Backbone ระหว่าง 19 Microservices
-**Trade-off:** เรายอมเสียค่าใช้จ่ายรายเดือนให้ Firebase เพื่อแลกกับการไม่ต้องดูแลเรื่อง Reconnection Logic และ Scaling ในระดับ Low-level เอง

---

## จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. ทำไม"Exponential Backoff" ถึงเป็นหัวใจสำคัญของระบบ Real-time ขนาดใหญ่?
> 2. ในสภาวะที่ต้องการส่ง"ราคาหุ้น" ที่เปลี่ยนตลอดเวลา แต่ Client ไม่ต้องส่งอะไรกลับมา ทำไม SSE ถึงอาจจะดีกว่า WebSocket?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.** เพื่อป้องกัน Thundering Herd Problem **— เมื่อ Server ล่มและกลับมาออนไลน์ หาก Client ล้านเครื่องพยายามเชื่อมต่อพร้อมกัน Server จะล่มอีกรอบทันที การสุ่มเวลาและค่อยๆ เพิ่มเวลาในการเชื่อมต่อช่วยกระจายโหลด
2.** เพราะ SSE ง่ายและเบากว่า ** — SSE ทำงานบน HTTP ปกติ ไม่ต้องทำ Protocol Upgrade และมีกลไกจัดการเรื่องการหลุดแล้วเชื่อมต่อใหม่มาให้ในตัว (Native Reconnection) ประหยัดทรัพยากร Server ในการถือสถานะ (State) มากกว่า

</details>

---

## สะท้อนคิด (Reflect)

> 💭 หากพรุ่งนี้ระบบของคุณมีผู้ใช้เพิ่มขึ้น 10 เท่าจากปัจจุบัน กลยุทธ์การเชื่อมต่อที่คุณใช้อยู่จะ"พัง" ตรงไหนก่อน? และ"ราคาที่ต้องจ่าย" เพื่อแก้ปัญหานั้นคืออะไร?

---

## หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[02-presence-detection|การจัดการสถานะ Online/Offline เมื่อ WebSocket หลุด]]
- [[04-push-notifications|กลยุทธ์การส่ง Push Notification เมื่อไม่ได้เชื่อมต่อ WebSocket]]
- [Case Study: การจัดการ Thundering Herd ในระบบขนาดใหญ่](../../Architecture/thundering-herd.md)
