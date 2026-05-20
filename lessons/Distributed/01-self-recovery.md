---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, system-design, distributed]
---

# Self Recovery Problem (ระบบซ่อมตัวเองเมื่อพัง)

---

## 🎯 ปฐมนิเทศ (Orient)

Distributed Systems ไม่ได้แค่"พัง" — มันพังแบบแปลกๆ ตลอดเวลา คำถามที่แท้จริงคือ _เมื่อมันพัง มันซ่อมตัวเองได้ไหม?_ ในบทนี้คุณจะได้เรียนรู้กลไกการ Self-Healing ที่แยก Senior ออกจาก Junior — ตั้งแต่ Retry แบบมีสมอง ไปจนถึง Circuit Breaker และ Bulkhead

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️ **สถานการณ์:**คุณมี Microservice A ที่เรียก Microservice B ผ่าน HTTP B เริ่มตอบช้าเพราะ DB ของมันกำลังยุ่ง A ยังคงส่ง Request เข้าไปเรื่อยๆ ด้วย Timeout 5 วินาที — Request ค้างจน Thread 🧵 Pool ของ A เต็ม
>
>**คำถาม:**ควรทำอย่างไรกับ A? (Hint:"แค่เพิ่ม Timeout" ไม่ใช่คำตอบ)

หยุดตรงนี้ — คิดแนวทางแก้ก่อนอ่านต่อ

---

## 💬 ผลตอบรับ (Feedback)

| ถ้าคุณตอบว่า... | การวิเคราะห์ |
|---|---|
|"ลด Timeout เหลือ 1 วิ" | ⚠️ แค่เลื่อนปัญหา — ถ้า B ยังพัง Request ก็ยังเสียเวลา 1 วิและสะสมจน Thread 🧵 Pool เต็มอยู่ดี |
|"Retry when failed" | ❌**แย่กว่าเดิม!**— Retry โดยไม่คิด = เพิ่มโหลดให้ B สองเท่า → B พังหนักกว่าเดิม → Retry Storm |
|"Circuit Breaker — หยุดส่งไป B ชั่วคราว" | ✅ **ถูกต้อง!**หยุดการส่ง Request เมื่อ B พัง → ให้ B ฟื้นตัว → ระบบไม่ลุกลาม |
|"Circuit Breaker + Retry with Backoff + Fallback" | ✅**Senior-level!**ไม่ใช่แค่หยุดส่ง แต่มีแผนสำรองระหว่างรอ B ฟื้น |**คนส่วนใหญ่ตอบผิดเพราะ:**คิดว่า"Retry" แก้ทุกปัญหาได้ — โดยไม่รู้ว่า Retry ที่ไม่ควบคุมคือการฆ่าระบบที่กำลังป่วยให้ตายเร็วขึ้น

---

### คำอธิบาย (Explain)

ระบบที่"ซ่อมแซมตัวเองได้" (Self-healing) คือหัวใจของ Distributed Systems ยุคใหม่ โดยเราจะใช้แนวคิด**Chaos Engineering**เพื่อทดสอบความทนทานของระบบโดยการ"จงใจ" ทำให้ส่วนประกอบบางอย่างพังลง [source: Netflix Technology Blog — Principles of Chaos Engineering]

### ปัญหาหลัก: Cascading Failure

```text
Service A ──Request──▶ Service B ──Query──▶ DB
    │                      │                   │
    │                   B ช้าลง              DB โหลดสูง
    │                      │
    ├─ Thread ค้างรอ B ──┤
    ├─ Thread Pool A เต็ม
    ├─ A ตอบไม่ทัน ──▶ Load Balancer ถือว่า A พัง
    ├─ LB ส่ง Traffic ไป Instance อื่นของ A
    └─ A ทุก Instance พังต่อกันเป็น Domino 
```

การฟื้นตัวเอง (Self-Recovery) ไม่ได้แปลว่า"แก้ปัญหา Root Cause" — มันแปลว่า**"ป้องกันไม่ให้ปัญหาเล็กกลายเป็นปัญหาใหญ่"**### 5 อาวุธ Self-Recovery ที่ Senior ต้องรู้

| กลไก | มันคืออะไร | คำถามในสัมภาษณ์ |
|---|---|---|
|**Retry with Backoff**| ลองใหม่ แต่ _เพิ่มระยะห่าง_ ทุกครั้ง |"Exponential Backoff + Jitter เพื่ออะไร?" |
|**Circuit Breaker**| ตัดวงจรเมื่อ Error Rate สูงเกินเกณฑ์ |"คุณตั้งเกณฑ์เปิดวงจรที่เท่าไหร่? แล้ว Half-Open คืออะไร?" |
|**Bulkhead**| แยก Thread 🧵 Pool ตามประเภทงาน |"ถ้า Payment กับ Notification 📱 ใช้ Pool เดียวกันจะเกิดอะไร?" |
|**Deadline Propagation**| ส่ง Timeout ตาม Chain ไม่ใช่ตั้งทีละ Service |"ถ้า A Timeout 5 วิ แต่ B Timeout 10 วิ — ปัญหาคืออะไร?" |
|**Health Check + Auto-restart**| Orchestrator เช็คสุขภาพและ Restart ถ้าพัง |"Liveness vs. Readiness Probe ต่างกันอย่างไร?" |

### Circuit Breaker — พระเอกของบทนี้

Circuit Breaker มี 3 สถานะ:

```text
     ┌──────────────┐
     │   CLOSED     │ ◀── ปกติ ทุก Request ผ่าน
     └──────┬───────┘
            │ Error Rate > 50% ใน 10 วิ
            ▼
     ┌──────────────┐
     │    OPEN      │ ◀── ตัดวงจร! Request ถูกปฏิเสธทันที
     └──────┬───────┘
            │ Timer หมด (เช่น 30 วิ)
            ▼
     ┌──────────────┐
     │  HALF-OPEN   │ ◀── ลองส่ง 1 Request ไปทดสอบ
     └──────────────┘
      Success? → CLOSED    Fail? → OPEN (วนกลับ)
```

**คำถามที่ผู้สัมภาษณ์ชอบถาม:**_"คุณตั้งเกณฑ์ตรงไหนว่า Circuit ควร Open?"_

คำตอบระดับ Senior:
>"ไม่ใช่ตัวเลขตายตัว — ขึ้นอยู่กับ Service ถ้าเป็น Payment Service ผมอาจตั้งที่ Error Rate 10%/10วินาที เพราะเงินหายไม่ได้ แต่ถ้าเป็น Recommendation Service อาจตั้งที่ 50%/10วินาที เพราะผู้ใช้ไม่สังเกต"

### Retry + Exponential Backoff + Jitter

```text
Request 1: ทันที → Fail
Request 2: รอ 200ms → Fail
Request 3: รอ 400ms → Fail
Request 4: รอ 800ms → Fail
Request 5: รอ 1600ms → Fail (เกิน Max Retry → Circuit เปิด)

            และที่สำคัญ: JITTER
            แทนที่จะรอ 200, 400, 800, 1600 เป๊ะๆ
            ให้เติม +random(0, 200ms) ทุกครั้ง

            ทำไม? ถ้า 100 instances Retry พร้อมกัน → Thundering Herd
            Jitter ทำให้ไม่มีใคร Retry พร้อมกัน
```

---

## 🔬 ขยายความ (Extend)

### Bulkhead Pattern

แรงบันดาลใจจากเรือเดินทะเล: ถ้าเรือรั่วหนึ่งห้อง น้ำจะไม่ทะลักเข้า _ทุก_ ห้อง — Bulkhead ใน Code ก็เช่นกัน

```text
แย่:
Thread Pool 100 threads ใช้ร่วมกันทั้ง Payment และ Notification
→ Payment ถล่ม → Threads หมด → Notification ก็พังตาม 

ดี:
Thread Pool A: 50 threads สำหรับ Payment
Thread Pool B: 50 threads สำหรับ Notification
→ Payment พัง → Notification ยังทำงานได้ 
```

### Deadline Propagation (สำคัญมาก!)

```text
Client → A → B → C → DB

ถ้า Client Timeout = 5 วิ
   A Timeout = 5 วิ
   B Timeout = 10 วิ  ← อันตราย!
   C Timeout = 10 วิ  ← อันตราย!

เกิดอะไรขึ้น: Client Timeout ไปแล้ว แต่ B, C ยังทำงานต่อ
→ เปลืองทรัพยากร → หรือแย่กว่านั้น: B, C ทำ Side Effect แล้ว Client ไม่รู้

แก้ด้วย Deadline Propagation:
   Client บอก A ว่า"Deadline = now + 5s"
   A ส่งต่อไปให้ B"Deadline = now + 4s" (เหลือเวลาให้ตัวเอง 1s)
   B ส่งต่อไปให้ C"Deadline = now + 2s"
   ทุกคนเช็ค Deadline ก่อนทำงาน — ถ้าเลยแล้ว → ยกเลิกเลย
```

### กรณีศึกษา: กลไกการซ่อมแซมตัวเองในระบบจริง

```text
สถาปัตยกรรมระบบแชทตัวอย่าง — รูปแบบการซ่อมแซมตัวเอง:

Pub/Sub Dead Letter Queue (DLQ):
   ทุก Consumer มี DLQ → ถ้า Message Process Fail 5 ครั้ง
   → ย้ายไป DLQ → Alert Ops → Manual Investigation
   → ป้องกัน Poison Message ไม่ให้ Block Consumer

MongoDB Connection Retry:
   ทุก Service ใช้ Mongoose autoReconnect + Retry with Backoff:
   - Initial: 1s → 2s → 4s → 8s → 16s (Max 30s)
   - Jitter: +random(0, 500ms)
   - Health Check: /healthz → Check mongoose.connection.readyState

BullMQ (AI Agent Pipeline) — Bulkhead:
   - Queue:"ai-processing" (3 workers) — แยกจาก Chat Consumer
   - Queue:"automated-messages" (2 workers) — แยกจาก AI
   - ถ้า AI Queue เต็ม → Chat Reply ยังทำงานได้ 

Docker Healthcheck + Auto-restart:
   ทุก Container มี HEALTHCHECK:
   - Liveness: HTTP GET /healthz → 200 = Alive
   - Readiness: HTTP GET /readyz → 200 = Ready (DB/MQ Connected)
   - Docker auto-restart: unless-stopped + restart delay 5s

Key Learning:
  สถาปัตยกรรมนี้ไม่ได้ใช้ Circuit Breaker Library (เช่น resilience4j)
  แต่ใช้ DLQ + Backoff Retry + Bulkhead Queues + Docker Restart
  → Simple แต่ครอบคลุม — เหมาะกับทีม 3-5 คนที่ดูแล 19 Services

  Trade-off:
  - No Circuit Breaker → ถ้า Consumer A พัง, Consumer B ยังส่ง Request?
    → ไม่ใช่ปัญหาเพราะ Pub/Sub Decouple — Consumer ไม่ Call กันโดยตรง
  - DLQ = Manual Recovery → ถ้าข้อความสำคัญตก DLQ ตอนตี 3?
    → Alert ผ่าน OpsGenie → On-call ตื่นมาแก้ → Acceptable สำหรับ B2B
  - ถ้าเป็น B2C (WhatsApp/Line) → ต้อง Auto-Retry จาก DLQ ด้วย
```

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:**เลือกกลไก Self-Recovery ให้ถูกต้อง:

1. Payment Service เรียก Inventory Service ที่พังอยู่ → ?
2. User Service ส่ง Notification 📱 ไม่สำเร็จเพราะ Network 📡 ขัดข้องชั่วครู่ → ?
3. Thread 🧵 Pool ของ Image Processing Service เต็มเพราะมี Video Processing แย่ง Threads → ?

<details>
<summary>ดูคำตอบ (คลิกเพื่อเปิด)</summary>

1.**Circuit Breaker**— หยุดส่ง Request ไปยัง Service ที่พัง ป้องกัน Retry Storm
2.**Retry with Exponential Backoff + Jitter**— Network 📡 ขัดข้องชั่วครู่ ลองใหม่แป๊บเดียวก็ผ่าน
3.**Bulkhead** — แยก Thread 🧵 Pool ตามประเภทงาน Image กับ Video ไม่ควรแย่งกัน

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ดูระบบที่คุณกำลังสร้างอยู่ตอนนี้ — ถ้า Service B พัง Service A ของคุณจะทำอย่างไร? มี Circuit Breaker ไหม? Retry ทุกครั้งที่ Fail หรือเปล่า? ถ้าต้องอธิบายให้ผู้สัมภาษณ์ฟังว่า"ระบบนี้ฟื้นตัวเองตอนตี 3 โดยไม่มีใครต้องตื่น" — คุณอธิบายได้ไหม?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[../Distributed/02-consistency-vs-availability|CAP Theorem และความสอดคล้องของข้อมูล]]
- [[04-spof|Single Point of Failure — ค้นหาและกำจัดจุดเปราะบาง]]
- [[02-dual-write|Dual Write Problem — เมื่อต้องเขียนสองที่พร้อมกัน]]
