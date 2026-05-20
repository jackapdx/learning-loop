---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, system-design, distributed]
---

# Dual Write Problem (ปัญหาเขียนสองที่พร้อมกัน)

---

## 🎯 ปฐมนิเทศ (Orient)

Dual Write Problem คือหนึ่งใน Distributed Systems Bug ที่อันตรายที่สุด — เกิดขึ้นเมื่อคุณต้องเขียน Database และ Publish Event"พร้อมกัน" แต่ไม่มี Distributed Transaction ปัญหานี้เป็นกับดักที่แม้แต่ Senior ก็พลาด คุณจะได้เรียนรู้ 4 วิธีแก้ พร้อมข้อดีข้อเสียของแต่ละวิธี

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️ **สถานการณ์:**คุณมี Order Service ที่เมื่อรับออเดอร์แล้วต้อง:
> 1. เขียน Order ลง PostgreSQL
> 2. ส่ง Event`OrderCreated` เข้า Kafka/Google PubSub ให้ Notification 📱 Service
>
>**คำถาม:**เกิดอะไรขึ้นถ้า... PostgreSQL เขียนสำเร็จ แต่ Kafka/PubSub publish ไม่สำเร็จ? และ _กลับกัน_ ถ้า Kafka publish สำเร็จ แต่ PostgreSQL เขียนไม่สำเร็จ? ระบบของคุณรับมือกับทั้งสองกรณีได้หรือไม่?**✋ หยุดตรงนี้**— เขียนแนวทางแก้ของคุณก่อนอ่านต่อ

---

## 💬 ผลตอบรับ (Feedback)

| ถ้าคุณตอบว่า... | การวิเคราะห์ |
|---|---|
|"ใช้ Transaction — ถ้าอันใดหนึ่งพังก็ Rollback ทั้งคู่" | ⚠️ PostgreSQL กับ PubSub คนละระบบ — ทำ Distributed Transaction ไม่ได้ (ไม่มี 2PC ใน PubSub) |
|"เขียน DB ก่อน แล้วค่อยส่ง Event — ส่งไม่สำเร็จก็ไม่เป็นไร" | ❌ Notification 📱 Service ไม่รู้ว่ามี Order ใหม่ → ผู้ใช้ไม่ได้ Notification 📱 → ระบบไม่สมบูรณ์ |
|"ใช้ Outbox Pattern" | ✅ **ถูกทาง!**เก็บ Event ไว้ใน DB table เดียวกับ Business Data → Atomically ปลอดภัย 🛡️ → Worker ค่อยไปส่ง |
|"ใช้ CDC (Change Data Capture)" | ✅**ถูกต้องเช่นกัน!**อ่านจาก DB Write-ahead Log → ส่ง Event — ไม่ต้องเปลี่ยน Business Logic เลย |**คนส่วนใหญ่ตอบผิดเพราะ:**ไม่รู้ว่า Distributed Transaction ระหว่างสองระบบที่แตกต่างกัน _ไม่มีอยู่จริง_ — หรือคิดว่า"แค่ Retry" ก็พอ

---

## 📖 คำอธิบาย (Explain)

### ปัญหาหลัก

```text
           ┌─ Order Service ─┐
           │                 │
           ▼                 ▼
    ┌─────────────┐   ┌──────────────┐
    │ PostgreSQL  │   │ Google PubSub│
    └─────────────┘   └──────────────┘

    เป็นไปไม่ได้ที่จะเขียนทั้งสองที่แบบ Atomic:
    - BEGIN/COMMIT ครอบคลุมแค่ DB
    - PubSub Publish อยู่นอก Transaction
    - ถ้าพังกลางทาง → Data Inconsistency
```

### 4 รูปแบบความล้มเหลว

| กรณี | DB Write | PubSub Publish | ผลลัพธ์ |
|---|---|---|---|
| 1. Happy Path | ✅ | ✅ | ถูกต้อง |
| 2. DB พังก่อน | ❌ | ไม่ได้เรียก | ถูกต้อง (แค่ Retry ทั้งหมด) |
| 3. DB สำเร็จ PubSub พัง | ✅ | ❌ | ❌**Order อยู่ใน DB แต่ Notification 📱 ไม่ส่ง**|
| 4. PubSub สำเร็จ DB พัง | ❌ | ✅ | ❌ **Notification 📱 ส่งแล้ว แต่ Order ไม่มีอยู่จริง** |

### 4 วิธีแก้ — เรียงจากง่ายไปซับซ้อน

#### วิธีที่ 1: Outbox Pattern (แนะนำที่สุด)

Transactional Outbox Pattern ช่วยให้มั่นใจว่า Event จะถูกส่งออกไปอย่างแน่นอน (Guaranteed Delivery) โดยการใช้ประโยชน์จาก ACID properties ของฐานข้อมูล [source: Chris Richardson — Transactional Outbox Pattern]

```text
Order Service:
   BEGIN TRANSACTION
     INSERT INTO orders (...)
     INSERT INTO outbox (event_type, payload)  ← ตารางเดียวกัน!
   COMMIT

Outbox Processor (แยก Process):
   WHILE true:
     SELECT * FROM outbox WHERE status = 'PENDING' LIMIT 100
     FOR EACH event:
       PUBLISH to PubSub
       UPDATE outbox SET status = 'SENT'
```

**ข้อดี:**Atomic (บันทึกใน Transaction เดียว) — ไม่มีวันหาย
**ข้อเสีย:**At-least-once delivery (ต้องทำ [[../../05-idempotency|Idempotent Consumer]])
**เมื่อใช้:**เกือบทุกกรณี — เป็น Pattern ที่ได้รับการยอมรับอย่างกว้างขวางเพราะแก้ปัญหา Dual Write ได้โดยไม่ต้องเปลี่ยน Business Logic

#### วิธีที่ 2: CDC — Change Data Capture

```text
PostgreSQL WAL Log ──▶ Debezium/Kafka Connect ──▶ Kafka/PubSub
                            │
                            └── อ่านทุก INSERT/UPDATE/DELETE จาก DB
                                โดยไม่ต้องแก้ Business Logic เลย
```**ข้อดี:**ไม่ต้องเปลี่ยน Code เดิม — แค่เสียบเข้าไป**ข้อเสีย:**เพิ่ม Infrastructure 🏗️ Complexity (ต้องรัน Debezium)**เมื่อใช้:**Microservices เยอะ (10+) ที่แชร์ DB เดียวกัน

#### วิธีที่ 3: Transactional Outbox + Polling Publisher

```typescript
// แค่ปรับปรุงจาก Outbox: ใช้ Listen/NOTIFY แทน Polling
await db.query(`
  BEGIN;
  INSERT INTO orders (...);
  INSERT INTO outbox (event_type, payload) VALUES (...);
  SELECT pg_notify('outbox_channel', 'new_event');
  COMMIT;
`);

// Listener: รับ event ทันที ไม่ต้อง Poll
connection.on('notification', (msg) => {
  processOutbox();
});
```

**ข้อดี:**Latency ต่ำกว่า Outbox Polling
**ข้อเสีย:**เพิ่ม Connection ให้ PostgreSQL

#### วิธีที่ 4: สอง Phase Commit (2PC) — ไม่แนะนำ

```text
2PC ไม่ทำงานกับ External Systems (PubSub, Kafka)
Coordinator เป็น Single Point of Failure
ช้ามาก — Lock ค้างระหว่างรอ Commit
ไม่มีใครใช้ 2PC ใน Production สำหรับ Event-Driven Systems
```

---

## 🔬 ขยายความ (Extend)

### Outbox Pattern — Implementation Deep Dive

```text
┌─────────────────────────────────────────────────┐
│                  orders Table                    │
│  id │ user_id │ total │ status │ created_at     │
├─────────────────────────────────────────────────┤
│  1  │   42    │ 99.99 │ PENDING│ 2026-05-11...  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                  outbox Table                    │
│  id │ aggregate_id │ event_type  │ payload │... │
├─────────────────────────────────────────────────┤
│  1  │      1       │OrderCreated │ {...}   │PEND│
└─────────────────────────────────────────────────┘

   1. INSERT INTO orders + INSERT INTO outbox = Atomic (Transaction เดียว)
   2. Outbox Processor อ่าน outbox WHERE status='PENDING'
   3. Publish to Pub/Sub — ถ้า Fail → ไม่อัปเดต status → ลองใหม่ในรอบหน้า
   4. At-least-once guarantee → Consumer ต้อง [[../../05-idempotency|Idempotent]]
```

### คำถามที่ผู้สัมภาษณ์ชอบถาม:"Outbox Processor ใช้ Pull แบบไหน?"**คำตอบระดับ Senior:**>"ผมใช้ Polling Interval แบบ Adaptive: ปกติ Poll ทุก 2 วินาที แต่ถ้าเจอ Records เยอะในรอบก่อน → ลด Interval เหลือ 100ms ถ้าไม่มี Records → เพิ่มเป็น 5 วินาที เราเรียกสิ่งนี้ว่า Adaptive Polling — มันบาลานซ์ระหว่าง Latency กับ DB Load ได้ดี"

### เมื่อ Outbox โตขึ้น: Tombstone Strategy

```text
Outbox Table โตเรื่อยๆ → ทุกวันมี 1 ล้าน Records → SELECT ช้าลง

ทางแก้:
Partition by date: outbox_20260511, outbox_20260510...
Cron Job ลบ Records เก่ากว่า 7 วัน (ที่ status='SENT')
หรือใช้ TTL Index ถ้า DB รองรับ
```

### กรณีศึกษา: สถาปัตยกรรมระบบแชทจริง — Outbox in Practice

```text
สถาปัตยกรรมระบบแชทตัวอย่าง — Dual Write Patterns:

Chat Message Flow:
   loadbalance-consumer รับ Message จาก Webhook
   → เขียน message-service (MongoDB) + Publish Pub/Sub Topic
   → Dual Write Problem! MongoDB กับ Pub/Sub

   ทางแก้ของระบบตัวอย่าง:
   - เขียน MongoDB ก่อน (Source of Truth)
   - ถ้า MongoDB สำเร็จ → Publish Pub/Sub
   - ถ้า Pub/Sub Fail → Message อยู่ใน MongoDB แล้ว
     → Dashboard Poll ทุก 5 วิ → Agent เห็นข้อความ (Pull, ไม่ใช่ Push)
   - Pub/Sub Retry ภายใน (Google Pub/Sub Retry Policy)

Ticket Assignment Flow:
   ticket-switcher → MongoDB (UPDATE ticket.assignee) + Pub/Sub
   → Same Pattern: MongoDB First, Pub/Sub Best-Effort
   → ถ้า Pub/Sub Fail → Consumer อ่านจาก MongoDB โดยตรง (Polling Fallback)

Key Learning:
  ระบบตัวอย่างไม่ได้ใช้ Outbox Table — แต่ใช้ MongoDB เป็น Implicit Outbox:
  - เขียน MongoDB = ข้อมูล Safe
  - Pub/Sub = Best-effort Notification
  - ถ้า Pub/Sub พัง → Consumer มี Polling Fallback (อ่านจาก MongoDB)
  
  Trade-off:
  - No Outbox Table → Simpler, Less Infrastructure
  - แต่: Pub/Sub อาจ Delay (Notification ไม่ Real-time)
  - Consumer ต้องมี Polling Logic เพิ่ม (เพิ่ม MongoDB Load ~5%)
  - Acceptable สำหรับ Customer Support B2B (ไม่ใช่ B2C Chat)
```

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:** คุณมี User Service ที่เวลา ⏰ User Register ต้อง:
INSERT INTO users
Publish`UserRegistered` Event
ส่ง Welcome Email

คุณจะเรียงลำดับยังไง? Event ควรส่ง _ก่อน_ หรือ _หลัง_ Welcome Email?

<details>
<summary>ดูคำตอบ (คลิกเพื่อเปิด)</summary>

```text
BEGIN;
  INSERT INTO users (...);
  INSERT INTO outbox (event_type='UserRegistered', payload=...);
COMMIT;

-- After Commit:
Outbox Processor → Publish UserRegistered Event
  → Notification Service → ส่ง Welcome Email

Welcome Email ต้องเป็น _ผลลัพธ์จากการ consume Event_
ไม่ใช่เป็นส่วนหนึ่งของ User Service
```

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 กลับไปดู Service ที่คุณเขียน — มีตรงไหนที่เขียน DB แล้วส่ง Event/Message ทันที โดยไม่มี Transactional Guarantee บ้าง? ถ้า Process ตายระหว่างนั้น — ข้อมูลจะหายไปเงียบๆ หรือเปล่า? นี่คือ Bug ที่ตรวจไม่เจอใน Unit Test — มันเจอเฉพาะใน Production เวลา ⏰ 3am

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[../../05-idempotency|Idempotency — มาตรฐานการรันงานซ้ำในระบบกระจายตัว]]
- [[12-distributed-transactions|Distributed Transactions — Saga และ Outbox Pattern]]
- [[../12-google-pubsub-limitations|Google Pub/Sub — ข้อจำกัดและเมื่อไม่ควรใช้]]
- [[01-self-recovery|Self Recovery — ระบบซ่อมตัวเองเมื่อพัง]]
- [[../../02-consistency-vs-availability|CAP Theorem และ Consistency Model]]
