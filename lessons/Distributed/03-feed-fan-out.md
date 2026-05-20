---
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, system-design, distributed]
---

# Feed Fan-out (การกระจายข้อมูลข่าวสาร)

---

## ปฐมนิเทศ (Orient)

นี่คือคำถาม System Design ที่ถูกถาม **บ่อยที่สุด ** ในกลุ่มคำถามขั้นสูง — Design Instagram/Twitter Feed โมเดล Hybrid ที่ใช้จริงในอุตสาหกรรม และเกณฑ์ที่ใช้ตัดสินใจว่าจะ Push หรือ Pull

---

## ลองทำก่อน (Attempt)

> ** สถานการณ์:** คุณกำลังออกแบบ Feed ให้ Instagram ผู้ใช้คนหนึ่ง (Lisa แบล็คพิงค์) มีผู้ติดตาม 100 ล้านคน เธอโพสต์รูป 1 รูป
>
> ** คำถาม:** ถ้าคุณใช้ **Push 📱 Model **(Fan-out on Write) — ต้องเขียนข้อมูลกี่ครั้ง? และคุณคิดว่าระบบจะรับไหวไหม?

หยุดตรงนี้ — คำนวณคร่าวๆ ก่อนอ่านต่อ... (Hint: 100,000,000 เขียนต่อ 1 โพสต์)

---

## ผลตอบรับ (Feedback)

| ถ้าคุณตอบว่า... | การวิเคราะห์ |
|---|---|
|"100 ล้าน Writes — ไม่ไหวแน่นอน" | ✅ ถูกต้อง! นี่คือ Write Amplification — 1 โพสต์สร้าง 100M writes |
|"ก็ใช้ Pull Model สิ" | ⚠️ แก้ถูกทาง — แต่ถ้าผู้ใช้ปกติ (100 followers) ก็ใช้ Pull จะ _ช้าเกินไป_ สำหรับการอ่าน Feed |
|"Push 📱 สำหรับคนทั่วไป Pull สำหรับคนดัง" | ✅ **Hybrid — นี่คือคำตอบที่ใช่!**|

**คนส่วนใหญ่ตอบผิดเพราะ:** เลือกข้างใดข้างหนึ่ง (Push 📱 หรือ Pull) แบบเด็ดขาด — โดยไม่รู้ว่าโลกจริงใช้ ** ทั้งสองอย่าง ** ขึ้นอยู่กับจำนวนผู้ติดตาม

---

### คำอธิบาย (Explain)

การออกแบบระบบ Feed ที่มีผู้ติดตามมหาศาล (เช่น Twitter) ต้องเผชิญกับปัญหา"ความไม่เท่าเทียมของข้อมูล" (Data Skew) ซึ่งการเลือกใช้กลยุทธ์ Hybrid ระหว่าง Push และ Pull คือกุญแจสำคัญ [source: Twitter Engineering — Timelines at Scale]

### สองโมเดลหลัก

| โมเดล | วิธีการ | ข้อดี | ข้อเสีย |
|---|---|---|---|
|**Fan-out on Write (Push 📱)**| เมื่อมีโพสต์ใหม่ → เขียนลง Timeline ของ ผู้ติดตามทุกคน | อ่านเร็วมาก (O(1) — Timeline สร้างไว้แล้ว) | Write Amplification: 1 โพสต์ × N ผู้ติดตาม |
|**Fan-out on Read (Pull)**| เมื่อผู้ใช้เปิด Feed → ดึงโพสต์จากทุกคนที่ ติดตามมารวมกัน | เขียนถูกลงมาก (1 Write ต่อโพสต์) | อ่านช้า: ต้อง Query N คนที่ติดตาม แล้ว Merge + Sort |

### ตัวเลขที่จะช่วยให้เห็นภาพ

```text
Lisa (100M followers) โพสต์ 1 ครั้ง:

Push Model:  1 โพสต์ → 100,000,000 Writes → DB ล่ม 
Pull Model:  1 โพสต์ → 1 Write → แต่ 100M users อ่าน → 100,000,000 Queries/วินาที 
Hybrid:     100M followers → Pull | 100 followers → Push
```

### โมเดล Hybrid — คำตอบที่ใช่

```text
┌──────────────────────────────────────────┐
│          เมื่อมีโพสต์ใหม่                   │
├──────────────────────────────────────────┤
│  Follower count < 5,000?                  │
│  ├─ YES → Push: เขียนลง Timeline ทุกคน     │
│  └─ NO  → Pull: เก็บใน Celebrity Timeline │
│                                           │
│  เมื่อผู้ใช้เปิด Feed:                       │
│  ├─ อ่าน Timeline ของตัวเอง (Push data)    │
│  └─ ดึงจาก Celebrity Timeline (Pull data) │
│  └─ Merge + Sort + Return                 │
└──────────────────────────────────────────┘
```

---

## ขยายความ (Extend)

### เกณฑ์การสลับโหมด (The Threshold)

คำถามที่ผู้สัมภาษณ์ชอบถามต่อ:**"คุณใช้เกณฑ์อะไรตัดสินว่าเมื่อไหร่ควรสลับ?"**

**คำตอบระดับ Senior:**

>"ผมตั้งเกณฑ์ที่ ~5,000 followers — ไม่ใช่ตัวเลขตายตัว แต่ได้มาจากการคำนวณ: ถ้า 1 Write ใช้เวลา ⏰ ~1ms และเรายอมให้โพสต์ใช้เวลาไม่เกิน 5 วินาทีในการกระจาย → 5,000/5sec = 1,000 writes/sec/node → ด้วย 5 nodes → รองรับ ~5,000 followers ได้สบาย เกินกว่านั้นเริ่มมี Write Amplification ที่รับไม่ได้"
>
>"และที่สำคัญ — เกณฑ์นี้ควรเป็น **Dynamic ** ได้: เมื่อระบบโตขึ้นหรือ Hardware อัปเกรด เราสามารถปรับเกณฑ์ได้โดยไม่ต้องเปลี่ยน Logic หลัก"

### คนดังที่เปลี่ยนสถานะ (Celebrity Drift)

จะเกิดอะไรขึ้นถ้าผู้ใช้ธรรมดา (Push 📱) กลายเป็นคนดัง?

```text
User A: 4,900 followers → Push 
User A: 5,100 followers → ต้องเปลี่ยนเป็น Pull 
```

**ทางแก้:**Background Job ตรวจจับเมื่อ Follower Count เกินเกณฑ์ → ล้าง Timeline Push 📱 data → เปลี่ยนเป็น Pull — ทั้งหมดนี้เกิดโดยผู้ใช้ไม่รู้ตัว

### กรณีศึกษา: สถาปัตยกรรมระบบแชทจริง — Fan-out in Messaging

```text
สถาปัตยกรรมระบบแชทตัวอย่าง — Feed/Push Patterns:

Ticket Fan-out (Agent Assignment):
   ticket-loadbalance-consumer รับ Ticket ใหม่
   → Fan-out to 9 Pub/Sub Topics:
     - realtime-chat-notification (Push FCM)
     - chat-reply-consumer (Process Reply)
     - automated-message-consumer (Auto-reply)
     - ticket-management-service (Update Status)
     - message-service (Store Message)
     - ...etc

   นี่คือ Fan-out on Write (Push):
   ข้อดี: Consumer แต่ละตัว Independent — Process พร้อมกัน
   ข้อเสีย: ถ้า 1 Consumer พัง → DLQ → Ticket อาจ Delay

Agent Dashboard (Pull):
   Agent เปิด Dashboard → Poll ทุก 5 วิ:
   - GET /tickets?status=open&assigned_to=agent_123
   - MongoDB Query: { status:"open", assignee: agent_123 }
   - Sort by latest_message_at DESC

   นี่คือ Fan-out on Read (Pull):
   ข้อดี: ไม่มี Write Amplification — MongoDB Query ธรรมดา
   ข้อเสีย: Polling = 5 วิ Latency → Agent อาจเห็นข้อความช้า

Key Learning:
  ระบบตัวอย่างใช้ Push สำหรับ Real-time Events (Pub/Sub Fan-out)
  และ Pull สำหรับ Dashboard (Polling REST API)
  → Hybrid: Pub/Sub สำหรับ Real-time, REST Polling สำหรับ Dashboard

  Trade-off:
  - Pub/Sub Fan-out = High Write Amplification (9 Topics)
    แต่ Google Pub/Sub จัดการให้ → เราไม่ต้องเขียน Fan-out Logic
  - Dashboard Polling = Higher Read Load on MongoDB
    แต่ TTL Cache (Redis) + Index ช่วย → MongoDB Load < 10%
  - ถ้าเป็น Personal Chat (WhatsApp) → ต้อง Real-time Push to Client
    แต่ระบบ Customer Support → 5 วิ Latency Acceptable
```

---

## จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:** จับคู่สถานการณ์กับโมเดลที่เหมาะสม:

1. ผู้ใช้ใหม่ที่มีผู้ติดตาม 50 คน → ?
2. แบรนด์ดังที่มีผู้ติดตาม 50 ล้านคน → ?
3. ระบบต้องรองรับผู้ใช้ 500 ล้านคน มีทั้งคนทั่วไปและคนดัง → ?

<details>
<summary>ดูคำตอบ (คลิกเพื่อเปิด)</summary>

1.**Push 📱**— น้อยคน อ่านเร็วดี
2.**Pull **— ไม่เช่นนั้น 50M writes ต่อโพสต์
3.**Hybrid ** — เกณฑ์ ~5K followers ต่ำกว่าใช้ Push 📱 สูงกว่าใช้ Pull

</details>

---

## สะท้อนคิด (Reflect)

> 💭 ลองนึกถึงแอปที่คุณใช้ประจำ (Instagram, Twitter, TikTok, Facebook) — คุณคิดว่าเขาใช้ Push 📱 หรือ Pull? มีฟีเจอร์ไหนที่คุณรู้สึกว่าช้า — และมันเกี่ยวกับ Fan-out Strategy ไหม?

---

## หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[../01-trade-off-articulation|การอธิบาย Trade-off ในการออกแบบระบบ]]
- [[../04-database-sharding|การออกแบบ Database Sharding และ Scaling]]
