---
verified: false
contentType: learning-loop
level: intermediate
status: polished
tags: [messaging, architecture, event-driven]
prerequisites: [01-google-pubsub, 02-streaming-vs-queuing]
---

# Event Bus (บัสข้อมูลของระบบ)

---

## 🎯 ปฐมนิเทศ (Orient)

ในระบบ Microservices หรือแม้แต่ Monolith ขนาดใหญ่ เมื่อ Component หนึ่งทำงานเสร็จและต้องแจ้งให้ Component อื่นทราบ (เช่น เมื่อมี Order ใหม่ ต้องแจ้งระบบคลังสินค้า ระบบขนส่ง และระบบอีเมล) การเรียกหากันตรงๆ (Direct Call) มักจะทำให้ระบบผูกติดกันเกินไป (Tight Coupling) หากระบบใดระบบหนึ่งพังหรือช้า จะส่งผลกระทบเป็นทอดๆ (Cascading Failure) การออกแบบการสื่อสารข้ามเซอร์วิสจึงเป็นความท้าทายหลักที่ต้องรักษาสมดุลระหว่างความเร็วของระบบและความน่าเชื่อถือ

## 🧪 ลองทำก่อน (Attempt)

> **สถานการณ์:**คุณกำลังออกแบบระบบ E-commerce ที่มี Traffic สูง (5,000 orders/min) เมื่อลูกค้ากดสั่งซื้อ (Place Order) ระบบต้องทำ 4 อย่าง:
> 1. ตัดสต็อก (Inventory)
> 2. ตัดเงิน (Payment)
> 3. ส่งอีเมลยืนยัน (Email)
> 4. อัปเดตแดชบอร์ดการขาย (Analytics)
>
>**ข้อจำกัด:**> - ระบบ Payment มักจะช้า (Latency สูง) และบางครั้งล่ม
> - ระบบ Analytics ไม่จำเป็นต้องอัปเดตทันที (Real-time ล่าช้าได้ไม่กี่วินาที)
> - ระบบ Inventory ต้องแม่นยำที่สุด แต่ถ้า Place Order สำเร็จแล้ว สต็อกต้องถูกจองทันที
> - ประสบการณ์ของผู้ใช้ (UX) ฝั่ง Place Order ต้องตอบสนองเร็วที่สุด
>
>**คำถาม:**คุณจะออกแบบการสื่อสารระหว่างบริการเหล่านี้อย่างไรเพื่อให้ระบบ Place Order มีความเร็วสูงสุดและทนทานต่อการล่มของบริการอื่นๆ?
> 1. ใช้ HTTP Direct Call (REST/gRPC) จาก Order Service ไปยังทุก Service พร้อมกันแบบ Parallel
> 2. ให้ Order Service เขียนลง Database เดียวกันทั้งหมด แล้วใช้ Cron Job ดึงข้อมูลไปประมวลผลต่อตามรอบ
> 3. ใช้ Event Bus โดย Order Service ส่ง`OrderCreated` event แล้วให้ Service อื่นมา Subscribe เพื่อไปทำต่อ
> 4. ใช้ Distributed Transaction (2-Phase Commit) เพื่อให้มั่นใจว่าทุก Service ทำงานสำเร็จพร้อมกันทั้งหมด
>
>**✋ หยุดตรงนี้ก่อน! ลองคิดดูว่าแต่ละวิธีมีข้อดีและข้อเสียอย่างไรในแง่ของ Latency และ Reliability เมื่อระบบมีขนาดใหญ่ขึ้น**## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"HTTP Direct Call" | ⚠️**ขาดบริบทเรื่องความทนทาน!**วิธีนี้ทำง่าย แต่หาก Payment Service ช้า Order Service ก็จะช้าตาม (Latency Sync) และถ้า Email Service ล่ม Order อาจจะล้มเหลวทั้งที่ลูกค้าจ่ายเงินได้แล้ว |
|"Cron Job" | ⚠️**ถูกครึ่งเดียว!**ช่วยลด Coupling ได้ แต่เพิ่ม Latency มหาศาล และจัดการความถี่ของ Cron ได้ยากเมื่อ Traffic สูงขึ้นเรื่อยๆ อาจทำให้ Database รับภาระหนักตอนประมวลผล Batch |
|"Event Bus" | ✅**คิดเป็นระบบ!**วิธีนี้ตอบโจทย์ข้อจำกัด Order Service จะทำงานเสร็จทันทีที่ส่ง Event (Low Latency) และหาก Service อื่นล่ม ก็สามารถกลับมาประมวลผล Event ย้อนหลังได้ (Reliability) แม้จะต้องแลกกับ Eventual Consistency ในบางระบบก็ตาม |
|"Distributed Transaction" | ❌**สวนทางกับ Scale!**การทำ 2PC ในระบบกระจายตัวที่มีบาง Service ช้า จะทำให้ Latency สูงมาก (ต้องรอคอขวดที่ช้าที่สุด) และระบบจะพังง่ายมาก (Fragile) |**ทำไมการให้เหตุผลแบบนี้สำคัญ?**การเลือกใช้ Event-Driven Architecture ไม่ใช่เพราะมันทันสมัย แต่เพราะในบริบทนี้เรายอมแลก**ความสอดคล้องทันที (Immediate Consistency)**ในบางระบบ (เช่น Analytics, Email) เพื่อให้ได้มาซึ่ง**ความทนทาน (Reliability)**และ**ความเร็ว (Latency)**ในส่วนที่ผู้ใช้สัมผัสโดยตรง

## 📖 คำอธิบาย (Explain)

Event Bus ทำหน้าที่เป็น**Message Broker**ที่ยอมให้ผู้ส่ง (Publisher) กระจายข้อมูลออกไปโดยไม่ต้องสนใจว่าใครจะนำไปใช้ต่อ (Decoupling)

### การเปรียบเทียบรูปแบบการสื่อสาร

| Approach | สิ่งที่แก้ปัญหาได้ (Solves) | สิ่งที่ต้องแลก (What You Give Up) | เหมาะกับสถานการณ์ (Best When) |
|---|---|---|---|
|**Synchronous (HTTP/gRPC)**| ความซับซ้อนต่ำ, ทราบผลลัพธ์จากปลายทางทันที | Latency สะสม, ระบบผูกติดกัน (High Coupling), ความทนทานต่อ Partial Failure | ต้องการ Strong Consistency, ระบบภายในที่เชื่อถือได้สูงมาก |
|**Shared Database (Polling)**| ข้อมูลรวมศูนย์, ใช้เครื่องมือที่ทีมคุ้นเคย | คอขวดที่ DB เดียว, ภาระ CPU ตอน Polling, Scale ข้ามระบบยาก | ระบบขนาดเล็ก, ทีมเดียวดูแลทั้งหมด |
|**Event-Driven (Event Bus)**| Latency ต่ำ, Decoupling, ความทนทาน | ความง่ายในการติดตาม (Observability), ต้องจัดการ Eventual Consistency | ระบบที่มี Traffic สูง, งานที่ทำแบบ Asynchronous ได้ |

### กลไกสำคัญของ Event Bus:

1.**Fan-out:**ส่ง 1 Message แต่มีผู้รับ (Subscriber) ได้หลายคน (1-to-Many)
2.**Durability:**หากผู้รับพัง Message ยังคงค้างอยู่ในระบบจนกว่าจะกลับมาทำงาน
3.**Retries:**หากประมวลผลพลาด สามารถสั่งให้ Bus ส่งมาใหม่ได้ หรือส่งเข้า Dead Letter Queue (DLQ)

```javascript
// ✅ Publisher: Order Service
// ไม่ต้องรอ Service อื่นทำงานเสร็จ
// ⚠️ ข้อควรระวัง: ต้องมั่นใจว่า Event ถูกเขียนลง Bus สำเร็จ (อาจใช้ Transactional Outbox pattern ช่วย)
await eventBus.publish('OrderCreated', {
  orderId: 'ORD-123',
  userId: 'USER-456',
  items: [...]
});

// ⚠️ Consumer: Email Service
// ทำงานตามความเร็วที่ตัวเองไหว (Backpressure)
// ⚠️ ข้อควรระวัง: ต้องรองรับกรณีที่ Message เดิมถูกส่งมาซ้ำ (Idempotency)
eventBus.subscribe('OrderCreated', async (event) => {
  await sendEmail(event.userId, 'ขอบคุณที่สั่งซื้อ');
});
```

>**อ้างอิง:**> - [AWS Architecture Blog — What is an Event-Driven Architecture?](https://aws.amazon.com/event-driven-architecture/)
> - [Martin Fowler — What do you mean by"Event-Driven"?](https://martinfowler.com/articles/201701-event-driven.html)

## 🔬 ขยายความ (Extend)

### ควรใช้ Event Bus เมื่อ...

- ✅ ต้องการลด Latency ของ User-facing Action โดยย้ายงานที่ทำทีหลังได้ไปเป็น Background
- ✅ มีหลาย Services ที่ต้องการรับรู้ข้อมูลจากแหล่งเดียวกัน (Fan-out)
- ✅ ต้องการเพิ่มความทนทาน (Reliability) ให้ระบบสามารถฟื้นตัวจากการล่มบางส่วนได้ (Partial Failure)

### ควรหลีกเลี่ยง Event Bus เมื่อ...

- ❌ ระบบต้องการ**Strong Consistency**ระหว่าง Services (เช่น การโอนเงินข้ามธนาคารที่ยอดต้องตรงกันเป๊ะในทุกระบบทันที)
- ❌ สถาปัตยกรรมยังเป็น Simple Monolith ขนาดเล็ก การเพิ่ม Event Bus เข้ามาจะกลายเป็นการเพิ่ม Operational Cost โดยไม่จำเป็น

### สิ่งที่ต้องแลก (Trade-offs)

-**Eventual Consistency:**ข้อมูลในระบบต่างๆ จะอัปเดตไม่พร้อมกัน ต้องจัดการ UX ให้ผู้ใช้ไม่สับสน (เช่น ขึ้นสถานะว่า"กำลังดำเนินการ")
-**Observability:**ติดตามยากว่าคำสั่งซื้อนี้ไปติดค้างอยู่ที่ Service ไหน (มักต้องใช้ Distributed Tracing อย่าง Jaeger/OpenTelemetry)
-**Idempotency:**ต้องเขียน Consumer ให้รองรับการทำงานซ้ำ เพราะในระบบกระจายตัวมีความเป็นไปได้ที่จะเกิด At-least-once delivery

## ✅ จุดตรวจสอบ (Checkpoint)

>**Quick Check:**> 1. ในสถานการณ์ที่ Payment Service ล่ม การใช้ Event Bus จะช่วยให้ Order Service ทำงานต่อไปได้อย่างไร?
> 2. ถ้าเราเปลี่ยนเงื่อนไขว่า"ระบบ Analytics ต้องแสดงยอดขายตรง 100% เสมอแบบ Real-time จริงๆ" Event Bus ยังเหมาะสมหรือไม่?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.**ช่วยปลดล็อก (Decoupling) Order Service ออกมา**— Order Service จะส่ง Event เข้าบัสแล้วจบงานทันที ส่วน Event ที่ค้างอยู่จะถูกเก็บไว้ เมื่อ Payment Service กลับมาออนไลน์ มันจะดึง Event ที่ค้างอยู่ไปประมวลผลย้อนหลังเอง
2.**อาจไม่เหมาะสม** — เพราะ Event Bus ทำงานบนพื้นฐานของ Eventual Consistency ซึ่งจะมี Latency Lag เสมอ หากต้องการ Strong Real-time Consistency อย่างแท้จริง อาจต้องกลับไปใช้ Synchronous API หรือ Shared Database ซึ่งต้องแลกมากับข้อเสียด้าน Coupling และ Performance

</details>

## 🤔 สะท้อนคิด (Reflect)

> ในระบบที่คุณดูแลอยู่ มีจุดไหนที่ยังเรียกหากันแบบ Sync API ทั้งที่จริงแล้วเป็นงานที่สามารถรอได้ (Asynchronous) บ้างหรือไม่? และถ้าคุณจะเปลี่ยนมาใช้ Event Bus คุณพร้อมรับมือกับปัญหาเรื่อง การส่งข้อความซ้ำ (Duplication) และความล่าช้า (Lag) แล้วหรือยัง?

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[01-google-pubsub|Google Cloud Pub/Sub]]
- [[02-streaming-vs-queuing|Streaming vs Queuing]]
- [[../Distributed/02-dual-write|Distributed/Dual Write Problem]]
- [[../Distributed/05-idempotency|Distributed/Idempotency]]
