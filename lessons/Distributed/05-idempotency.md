---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [system-design, distributed, patterns, idempotency]
prerequisites: []
---

# Idempotency (การทำงานซ้ำที่ให้ผลลัพธ์เดิม)

---

## 🎯 ปฐมนิเทศ (Orient)

ในระบบ Distributed Systems"ความผิดพลาดคือเรื่องปกติ" — เครือข่ายอาจตัดขาด, Server อาจ Restart หรือ Timeout สิ่งเหล่านี้ทำให้เกิดการ **Retry**(ส่งใหม่) และเมื่อมีการส่งใหม่ ปัญหาที่ตามมาคือ **"การทำงานซ้ำ" (Double Processing)**เช่น ลูกค้าถูกหักเงิน 2 รอบ หรือสินค้าถูกส่งซ้ำ 2 ชิ้น

สิ่งที่แยกวิศวกร Senior ออกจากคนอื่นคือการออกแบบระบบให้เป็น**Idempotent**— คือไม่ว่าคุณจะเรียกคำสั่งเดิมกี่ครั้ง ผลลัพธ์สุดท้ายต้องเหมือนกับการเรียกเพียงครั้งเดียวเสมอ บทเรียนนี้จะสอนให้คุณเข้าใจว่า"ความซ้ำซ้อน" ไม่ใช่เรื่องน่ากลัวถ้าคุณรู้วิธีจัดการ

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️ **สถานการณ์:**คุณกำลังออกแบบระบบ"Wallet" สำหรับแอปสั่งอาหาร เมื่อลูกค้ากด"ชำระเงิน" แอปจะเรียก API`/v1/payments/withdraw`
>
>**ปัญหา:**เนื่องจากสัญญาณ 5G ไม่นิ่ง หลังจากลูกค้ากดชำระเงิน แอปหมุนค้างอยู่ 10 วินาทีจน Timeout ลูกค้าจึงกด"ชำระเงิน" ซ้ำอีกรอบ
>
>**คำถาม:**ถ้า API ของคุณแค่ทำ`UPDATE balances SET amount = amount - 100 WHERE user_id = 1` จะเกิดอะไรขึ้น? และคุณจะแก้ไขอย่างไรโดยไม่ต้องพึ่งพา"โชค" ว่าเครือข่ายจะดีขึ้น?**หยุดตรงนี้ก่อน**— ลองนึกถึงคำสั่ง SQL หรือกลยุทธ์ที่คุณจะใช้ป้องกันการหักเงินซ้ำ

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"เช็คยอดเงินก่อนหัก" | ❌ **อันตราย!**เกิด Race Condition ได้ง่ายมาก ถ้า 2 Request เข้ามาพร้อมกัน (Read-Modify-Write problem) |
|"ใช้ Database 📦 Transaction" | ⚠️**เกือบใช่!**ช่วยให้ข้อมูลถูกต้องในรอบเดียว แต่ถ้า Client ส่งมา 2 รอบแยกกัน Transaction ก็ช่วยไม่ได้ |
|"ใช้ Idempotency Key (UUID)" | ✅**ถูกต้อง!**นี่คือมาตรฐานทองคำ — ให้ Client ส่ง Unique Key มาด้วย แล้ว Server เช็คว่า Key นี้เคยประมวลผลไปแล้วหรือยัง |**ทำไมคนส่วนใหญ่ถึงพลาด?**เพราะเรามักคิดว่าระบบจะทำงานได้สมบูรณ์แบบ (Happy Path) และลืมไปว่าในโลกของ Distributed Systems การได้รับ Message เดิมซ้ำ (At-least-once delivery) เป็นสิ่งที่หลีกเลี่ยงไม่ได้

---

## 📖 คำอธิบาย (Explain)

### ปัญหาหลัก (The Core Problem)

ในโลกของ Distributed Systems การได้รับ Message เดิมซ้ำ (At-least-once delivery) เป็นสิ่งที่หลีกเลี่ยงไม่ได้ สิ่งที่แยกวิศวกร Senior ออกจากคนอื่นคือการออกแบบระบบให้เป็น**Idempotent**— คือไม่ว่าคุณจะเรียกคำสั่งเดิมกี่ครั้ง ผลลัพธ์สุดท้ายต้องเหมือนกับการเรียกเพียงครั้งเดียวเสมอ [source: Stripe Engineering — Designing robust and predictable APIs with idempotency]

### Idempotent vs Non-Idempotent Operations

| ประเภท | ตัวอย่างคำสั่ง | ความเป็น Idempotent |
|:---:|---|:---:|
|**Absolute Set**|`SET x = 10` | ✅ ใช่ (ทำกี่ครั้ง x ก็เป็น 10) |
|**Incremental**|`SET x = x + 1` | ❌ ไม่ใช่ (ทำซ้ำ x จะเพิ่มขึ้นเรื่อยๆ) |
|**Delete**|`DELETE FROM users WHERE id = 5` | ✅ ใช่ (ลบครั้งแรกหาย ครั้งที่สองก็ยังไม่มีอยู่ดี) |
|**Create**|`INSERT INTO orders (...)` | ❌ ไม่ใช่ (ถ้าไม่มี Unique Constraint จะได้ Record ซ้ำ) |

### กลยุทธ์การทำ Idempotency ในทางปฏิบัติ

**Idempotency Key (แนะนำที่สุด):**
    *   Client สร้าง UUID สำหรับทุก Transaction
    *   Server เก็บ Key นี้ลงในตาราง`idempotency_keys` พร้อมผลลัพธ์
    *   ถ้าได้รับ Key เดิมซ้ำ ให้คืนผลลัพธ์เดิมจาก DB ทันทีโดยไม่ประมวลผลซ้ำ
**Unique Constraints (Database 📦 Level):**
    *   ใช้`UNIQUE INDEX` บนฟิลด์ที่รวมกันแล้วต้องไม่ซ้ำ (เช่น`user_id` +`order_ref`)
    *   ใช้`ON CONFLICT DO NOTHING` หรือ`ON CONFLICT DO UPDATE` (Upsert)
**State Machine Validation:**
    *   เช็ค State ของ Object ก่อนทำงาน เช่น"จ่ายเงินได้เฉพาะ Order ที่อยู่ในสถานะ PENDING เท่านั้น"
    *  `UPDATE orders SET status = 'PAID' WHERE id = 1 AND status = 'PENDING'`

---

## 🔬 ขยายความ (Extend)

### การออกแบบ Idempotent Consumer (สำหรับ Kafka/PubSub)

ในระบบ Messaging เรามักเจอ **At-least-once delivery**หมายความว่า Consumer อาจได้รับ Message เดิมซ้ำได้เสมอ**ท่ามาตรฐานของ Senior:**

```typescript
async function processOrder(message: Message) {
  const { orderId, idempotencyKey } = message.data;

  // 1. เช็คในตาราง Idempotency ก่อน (หรือใช้ Redis)
  const processed = await db.idempotency.findUnique({ where: { key: idempotencyKey } });
  if (processed) return processed.result;

  // 2. ประมวลผลใน Transaction เดียวกันกับการบันทึก Key
  return await db.$transaction(async (tx) => {
    const result = await tx.order.create({ data: { id: orderId, ... } });
    await tx.idempotency.create({ data: { key: idempotencyKey, result } });
    return result;
  });
}

```

### ระวัง: Side Effects ที่ไม่ใช่ Database

ถ้าฟังก์ชันของคุณต้อง**ส่ง Email**หรือ**เรียก API ภายนอก**(เช่น Stripe) คุณต้องมั่นใจว่า API ภายนอกเหล่านั้นรองรับ Idempotency Key เช่นกัน (ซึ่ง Stripe และผู้ให้บริการระดับโลกส่วนใหญ่รองรับผ่าน Header`Idempotency-Key`)

---

## ✅ จุดตรวจสอบ (Checkpoint)

> 🎯**Quick Check:**> 1. ถ้าคำสั่ง SQL ของคุณคือ`UPDATE users SET points = 100 WHERE id = 1` คำสั่งนี้เป็น Idempotent หรือไม่?
> 2. ในการออกแบบ API ชำระเงิน ใครควรเป็นคนสร้าง Idempotency Key (Client หรือ Server)?
> 3. ทำไมการใช้`INSERT IGNORE` อย่างเดียวอาจไม่เพียงพอสำหรับการทำ Idempotency ที่สมบูรณ์?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>**เป็น Idempotent**เพราะไม่ว่าจะรันกี่ครั้ง`points` ก็จะเป็น 100 เท่าเดิม (ต่างจาก`points = points + 100`)**Client** ควรเป็นคนสร้าง เพราะ Client รู้ว่า"ความตั้งใจ (Intent)" ในการกดครั้งนั้นคือครั้งเดิม แม้จะมีการ Retry จากฝั่ง Client เองก็ตาม
เพราะ`INSERT IGNORE` แค่ป้องกัน Error แต่ไม่ได้ช่วยคืนผลลัพธ์เดิม (Response) ที่เคยเกิดขึ้นไปแล้วให้ Client ซึ่งอาจทำให้ Client สับสนได้

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ลองนึกถึงระบบที่คุณทำอยู่ตอนนี้ มี API ไหนที่มีความเสี่ยงจะถูกเรียกซ้ำแล้วข้อมูลพังไหม? คุณได้ฝากความหวังไว้ที่ UI (เช่นการ Disable ปุ่มหลังกด) เพียงอย่างเดียวหรือเปล่า? จำไว้ว่า"UI Validation ไม่ใช่ Security และไม่ใช่ Reliability"

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[02-consistency-vs-availability|CAP Theorem และ Reliability]]
- [[Distributed/02-dual-write|Dual Write: เมื่อการเขียน 2 ที่พร้อมกันต้องการ Idempotency]]
- [[Distributed/12-distributed-transactions|Distributed Transactions: Saga และการรันชดเชยข้อมูล]]
- [[Messaging/01-google-pubsub|Google Pub/Sub: การรับมือกับ Message ซ้ำ]]
- [[Workers/02-bullmq-redis-performance|Worker & Idempotency: การรันงานซ้ำอย่างปลอดภัย]]
