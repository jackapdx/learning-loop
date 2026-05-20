---
verified: false
contentType: overview
level: senior
status: polished
tags: [chat-exp, system-design, networking]
---

# Networking & Protocols — ซีรีส์พื้นฐานการสื่อสารของระบบใหญ่

> [!info] ปฐมนิเทศ
> ระบบที่สเกลได้ไม่ได้วัดกันที่แค่เขียนโค้ดเก่ง แต่วัดกันที่ว่าคุณเข้าใจ"ท่อ" ที่ข้อมูลไหลผ่านดีแค่ไหน ตั้งแต่การเลือก Protocol (TCP vs UDP) ไปจนถึงการจัดระเบียบ Traffic ด้วย Load Balancer
>
> ซีรีส์นี้จะพาคุณไปดูเบื้องหลังของการสื่อสารในระบบ Distributed Systems ที่ Senior Engineer ต้องรู้
>
> Each lesson takes **5-10 minutes **based on the **Learning Loop **principle.

## 🗺️ แผนผังการเรียนรู้ (Roadmap)

### Path A: Traffic Management → #1, 2
[[../09-load-balancer|Load Balancer Fundamentals]] → [[01-load-balancing-l4-l7|Load Balancing (L4 vs L7)]] + [[02-cdn-edge-computing|CDN & Edge]] — วางรากฐานและกระจายโหลดให้ผู้ใช้ทั่วโลก

### Path B: Communication Protocols → #3, 4
[[03-tcp-vs-udp|TCP vs UDP]] + [[04-grpc-vs-rest|gRPC vs REST]] — เลือกเครื่องมือสื่อสารให้เหมาะกับงาน (Speed vs Reliability)

## 📋 รายชื่อบทเรียนทั้งหมด (Lesson List)

| # | บทเรียน | คำถามสัมภาษณ์ |
|---|---|---|
| 1 | [[01-load-balancing-l4-l7\|Load Balancing]] |"Layer 4 กับ Layer 7 ต่างกันยังไง? และเมื่อไหร่ควรใช้ตัวไหน?" |
| 2 | [[02-cdn-edge-computing\|CDN & Edge]] |"ทำไมแค่มี Cache ที่ Server ถึงไม่พอ? กลยุทธ์การลดระยะทางข้อมูล" |
| 3 | [[03-tcp-vs-udp\|TCP vs UDP]] |"ออกแบบแอป Zoom หรือเกมออนไลน์ — คุณจะเลือก Protocol ไหน?" |
| 4 | [[04-grpc-vs-rest\|gRPC vs REST]] |"ทำไม Microservices ถึงนิยมใช้ gRPC มากกว่า REST ในการคุยกันเอง?" |

> [!question] ลองทำก่อน
> หากคุณต้องออกแบบระบบ **Video Streaming **(เช่น Netflix):
> 1. การเลือก Server เพื่อส่งไฟล์วิดีโอควรใช้เงื่อนไขอะไร? (IP, Headers, หรือ Geographic?)
> 2. คุณจะใช้ Load Balancer ระดับไหนเพื่อดูว่า User คนนี้กำลังขอวิดีโอเรื่องอะไร?
>
> หยุดคิด 30 วินาที... แล้วเริ่มเรียนบทที่ 1
