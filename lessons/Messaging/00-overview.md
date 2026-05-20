---
verified: false
contentType: overview
level: senior
status: polished
tags: [chat-exp, system-design, messaging, pubsub]
---

# Messaging & Event Streaming — ยุทธศาสตร์การสื่อสารข้ามเซอร์วิส

> [!info] ปฐมนิเทศ
> เมื่อ Microservices ต้องคุยกันโดยไม่รอคำตอบ (Asynchronous) หรือต้องกระจายข้อมูลไปหาเซอร์วิสหลายๆ ตัวพร้อมกัน (Fan-out)"Message Broker" คือพระเอกของงานนี้
>
> ซีรีส์นี้จะพาคุณไปเจาะลึก **Google Cloud Pub/Sub**เครื่องมือระดับ Global ที่ทรงพลังแต่แฝงไปด้วยข้อจำกัดที่คุณต้องรู้ เพื่อเปรียบเทียบกับทางเลือกอื่นๆ อย่าง Kafka หรือ RabbitMQ
>
> Each lesson takes**5-10 minutes**based on the **Learning Loop**principle.

## 🗺️ แผนผังการเรียนรู้ (Roadmap)

### Path A: Managed Cloud Messaging → #1

[[01-google-pubsub|Google Cloud Pub/Sub]] — พลังของ Serverless Messaging และขีดจำกัดที่คุณต้องระวัง

### Path B: Streaming vs. Queuing → #2

[[02-streaming-vs-queuing|Streaming vs. Queuing]] — เปรียบเทียบ Log-based Streaming (Kafka) vs. Smart Brokers (RabbitMQ)

### Path C: Event-Driven Design → #3

[[03-event-bus|Event Bus]] — ลดความผูกมัด (Decoupling) เพื่อเพิ่มความทนทานและความเร็ว

## 📋 รายชื่อบทเรียนทั้งหมด (Lesson List)

| # | บทเรียน | คำถามสัมภาษณ์ |
|---|---|---|
| 1 | [[01-google-pubsub\|Google Pub/Sub]] |"ทำไมถึงไม่ควรใช้ Pub/Sub ทำ Event Replay? และวิธีจัดการกับ Duplicates" |
| 2 | [[02-streaming-vs-queuing\|Streaming vs. Queuing]] |"เมื่อไหร่ควรใช้ RabbitMQ แทนที่จะเป็น Kafka? และ Trade-off 🤝 ของ Log-based Architecture 🏗️" |
| 3 | [[03-event-bus\|Event Bus]] |"เมื่อไหร่ควรเปลี่ยนจาก Synchronous API มาใช้ Event Bus? และจะรับมือกับ Eventual Consistency อย่างไร?" |

> [!question] ลองทำก่อน
> หากคุณต้องเลือก Message Broker สำหรับ **"ระบบแจ้งเตือนราคาหุ้นที่ต้องการความเร็วระดับ < 5ms"**:
> 1. Google Pub/Sub (Serverless) เป็นตัวเลือกที่ดีที่สุดหรือไม่?
> 2. ความแตกต่างระหว่าง"Message Queue" (เหมือน pg-boss) กับ"Pub/Sub" (เหมือน GCP Pub/Sub) คืออะไร?
>
> หยุดคิด 30 วินาที... แล้วเริ่มเรียนบทที่ 1
