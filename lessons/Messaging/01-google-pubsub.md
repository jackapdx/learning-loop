---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [messaging, pubsub, cloud, system-design]
prerequisites: []
---

# Google Pub/Sub: พลังของ Serverless และข้อจำกัดที่ Senior ต้องรู้

---

## 🎯 ปฐมนิเทศ (Orient)

Google Cloud Pub/Sub คือ Message Broker ระดับโลกที่ทรงพลังและไม่ต้องบริหารจัดการ (Serverless) แต่การเลือกใช้มันเพียงเพราะ"มันเป็นของ Google" คือกับดักที่พบบ่อยในการสัมภาษณ์ System Design วิศวกรระดับ Senior ต้องเข้าใจว่า **"จุดอ่อน"** ของมันคืออะไร และเมื่อไหร่ที่คุณควรหันไปใช้ **Internal Queue**(อย่าง pg-boss) หรือ **Memory Queue**(อย่าง BullMQ) แทน

---

## 🧪 ลองทำก่อน (Attempt)

> **สถานการณ์**:คุณกำลังออกแบบระบบ **High-Frequency Trading Platform** ที่มีเงื่อนไขดังนี้:
> 1. ต้องการ **Latency < 5ms** ในการส่งคำสั่งซื้อขาย
> 2. ต้องรับประกัน **Message Ordering** อย่างเคร่งครัด (Strict FIFO across global scale)
> 3. ต้องสามารถ **Replay Events** ย้อนหลังได้ 1 ปี เพื่อทำ Audit (Event Sourcing)
>
>**ข้อจำกัด**:> - ระบบต้องรองรับการประมวลผลคำสั่งซื้อขายระดับล้านรายการต่อวินาที
> - ห้ามมีข้อความหายเด็ดขาด (Zero Data Loss)
>
>**คำถาม**:ในฐานะ Lead Architect คุณจะเลือกใช้ Google Pub/Sub สำหรับงานนี้หรือไม่? หากไม่ — คุณมีทางเลือกอื่นที่ตอบโจทย์กว่าอย่างไร?
>
>**✋ หยุดตรงนี้ก่อน**— ลองคิดดูว่า"บริการที่จัดการให้ทุกอย่าง (Fully Managed)" มักจะแลกมาด้วยอะไรในแง่ของ Performance?

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"ใช้ Pub/Sub ได้ เพราะมัน Scale ได้ไม่จำกัด" | ⚠️ **ขาดบริบท!** แม้ Pub/Sub จะ Scale ได้มหาศาล แต่ P95 Latency เฉลี่ยอยู่ที่ ~50ms ซึ่ง"ช้าเกินไป" สำหรับระบบ Trading ที่ต้องการระดับ < 5ms |
|"ใช้ Pub/Sub และเปิด Ordering Key" | ⚠️**ใกล้เคียง!** การเปิด Ordering Key ช่วยเรื่องลำดับได้ แต่จะสร้างคอขวด (Bottleneck) และเพิ่ม Latency มากขึ้นไปอีก และมันยังไม่ตอบโจทย์เรื่อง Replay 1 ปี |
|"ใช้ Kafka (Log-based Streaming)" | ✅**Senior-level!** คุณเข้าใจว่า Kafka ถูกออกแบบมาเพื่อ Streaming ที่มี Low Latency และรองรับ Retention นานเท่าที่ต้องการเพื่อทำ Replay (Event Sourcing) |**ทำไมการให้เหตุผลแบบนี้สำคัญ?** เพราะวิศวกรอาวุโสรู้ว่า Pub/Sub ถูกออกแบบมาเพื่อ **Asynchronous Messaging**(Fire-and-forget) ไม่ใช่ **High-speed Data Streaming** หรือ **Audit Log Storage** ระยะยาว

---

## 📖 คำอธิบาย (Explain)

### 1. ข้อจำกัดของ Pub/Sub (The Hard Truths)

-**Latency**: เนื่องจากเป็น Managed Service ที่มีหลาย Layer (gRPC -> Google Network 📡 -> Internal Storage) ทำให้ Latency สูงกว่าระบบที่อ่านจาก Memory (Redis/BullMQ)
-**Retention**: เก็บข้อมูลได้สูงสุด **31 วัน** เท่านั้น ไม่สามารถใช้เป็นแหล่งเก็บข้อมูลหลักสำหรับ Event Sourcing ระยะยาวได้
-**No Global Ordering:** การเรียงลำดับ (Ordering Key) ทำได้ดีแค่ภายใน Region เดียวกัน และจะทำให้ความสามารถในการ Scale ลดลง (Throughput capped per key)

### 2. การเลือกใช้ตามสถานการณ์ (Trade-off Matrix)

| คุณสมบัติ |**Google Pub/Sub**|**BullMQ (Redis)**|**Kafka**|
|:---|:---|:---|:---|
|**Latency**| ปานกลาง (~50ms) |**สูงมาก (< 1ms)**| ต่ำ (< 10ms) |
|**ความยาก (Ops)**|**Zero (Managed)**| ปานกลาง (Manage Redis) | สูงมาก (Manage Cluster) |
|**Retention**| 7 - 31 วัน | สั้นมาก (RAM-based) |**นานเท่าที่ต้องการ**|
|**จุดเด่น**| Fan-out ไป 100+ เซอร์วิส | งานเบื้องหลังที่เร็ว | Streaming & Replay |

---

## 🔬 ขยายความ (Extend)

### ยุทธศาสตร์ Senior: การจัดการ Duplicates (Idempotency)

Pub/Sub รับประกันเพียง **"At-least-once Delivery"** หมายความว่าคุณต้องเจอ Message ซ้ำแน่นอน:
1.**Idempotency Key:** ใช้ UUID ที่ Client สร้างมา (เช่น`request_id`) เก็บใน Redis/DB เป็นเวลา 24 ชม.
2.**Atomic Write:** ใช้`ON CONFLICT DO NOTHING` ใน SQL เพื่อให้แน่ใจว่าประมวลผลแค่ครั้งเดียว
- [source: Cloud Pub/Sub Documentation — At-least-once delivery]

### กรณีศึกษา: สถาปัตยกรรมระบบแชทจริง (Message Backbone)

ในระบบตัวอย่างที่เราศึกษา เราใช้ Pub/Sub เป็นหัวใจหลักในการส่งข้อความข้าม 19 Microservices:
-**ทำไมถึงเลือก?** เพราะเราต้องการ **Native Fan-out**— เมื่อมีข้อความใหม่ 1 ข้อความ เราต้องส่งไปทั้ง`Notification-Service`,`Analytics-Service`, และ`Search-Indexer`
-**Trade-off**: เรายอมรับ Latency ที่เพิ่มขึ้น 50ms (ซึ่งผู้ใช้แชทไม่รู้สึก) เพื่อแลกกับการไม่ต้องจัดการ Infrastructure ของ Message Broker เอง และความง่ายในการเพิ่ม Consumer ใหม่ๆ

---

## ✅ จุดตรวจสอบ (Checkpoint)

>**Quick Check:**> 1. หากต้องการทำระบบ"สรุปยอดขายรายปี" โดยการอ่านข้อมูลย้อนหลัง 12 เดือนจากคิว Pub/Sub สามารถทำได้หรือไม่?
> 2. ข้อดีที่สุดของ Pub/Sub เมื่อเทียบกับการเขียน API เรียกกันเอง (Direct HTTP) คืออะไร?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.**ไม่ได้**— เพราะ Pub/Sub เก็บข้อมูลได้สูงสุดแค่ 31 วัน (คุณควรย้ายข้อมูลจาก Pub/Sub ลง BigQuery หรือ Cloud Storage เพื่อวิเคราะห์ระยะยาว)
2.**Decoupling & Reliability** — ถ้าเซอร์วิสปลายทางล่ม (Down) Pub/Sub จะช่วยเก็บข้อความไว้ให้ (Buffer) และส่งใหม่เมื่อปลายทางกลับมาออนไลน์ ทำให้ระบบโดยรวมไม่พังตามกันไป (Cascading Failure)

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭"เครื่องมือที่ดีที่สุด คือเครื่องมือที่คุณรู้ว่ามันจะพังตอนไหน" ในระบบปัจจุบันของคุณ มีจุดไหนที่คุณใช้ Pub/Sub เพียงเพราะ"มันง่าย" ทั้งที่จริงๆ แล้วต้องการความเร็ว (Latency) ที่สูงกว่านี้หรือไม่?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[02-streaming-vs-queuing|Streaming vs. Queuing: Kafka vs. RabbitMQ]]
- [[../../05-idempotency|Idempotency: มาตรฐานการรับมือการรันงานซ้ำ]]
- [[../Distributed/02-dual-write|ปัญหา Dual Write: การเขียน DB พร้อมส่ง Message]]
