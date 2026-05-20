---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [system-design, storage, networking, fundamentals]
prerequisites: [03-cache-invalidation]
---

# Buffer vs Cache: จุดที่คนสับสนบ่อยที่สุด

---

## 🎯 ปฐมนิเทศ (Orient)

ในวิศวกรรมซอฟต์แวร์ เราใช้"พื้นที่เก็บข้อมูลชั่วคราว" อยู่ตลอดเวลา แต่คำว่า **Buffer ** และ **Cache ** มักถูกใช้สลับกันจนน่าปวดหัว แม้ว่าทั้งคู่จะทำงานคล้ายกันคือ"เก็บข้อมูลไว้ชั่วคราว" แต่จุดประสงค์ (Intent) ของพวกมันต่างกันอย่างสิ้นเชิง

การใช้ Buffer ในที่ที่ควรใช้ Cache หรือในทางกลับกัน ไม่เพียงแต่จะทำให้ระบบช้าลง แต่อาจทำให้เกิดปัญหาคอขวด (Bottleneck) ที่คุณคาดไม่ถึง

---

## 🧪 ลองทำก่อน (Attempt)

> ** สถานการณ์:** คุณกำลังออกแบบระบบ"บันทึกวิดีโอสด (Live Streaming)" 
> -** ฝั่งส่ง (Producer):** กล้องส่งข้อมูลภาพดิบมาด้วยความเร็วสูงมากแต่ไม่คงที่ (Bursty)
> -** ฝั่งรับ (Consumer):** ระบบประมวลผล (Encoding) ทำงานด้วยความเร็วคงที่และช้ากว่าความเร็วสูงสุดของกล้อง
>
> ** โจทย์:** คุณต้องมี"ที่พักข้อมูล" ระหว่างกลางเพื่อไม่ให้ข้อมูลภาพหลุดหาย (Data Loss)
>
> ** คำถาม:** ในบริบทนี้ สิ่งที่คุณต้องการคือ **Buffer ** หรือ **Cache **? และ"คุณสมบัติ" ที่สำคัญที่สุดของที่พักข้อมูลนี้คืออะไร?
>
> **✋ หยุดตรงนี้ก่อน **— ลองคิดดูว่าคุณต้องการ"ความเร็วในการอ่านซ้ำ" หรือ"ความสามารถในการรอคิว"?

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"ต้องการ Cache" | ❌ ** ผิดจุดประสงค์!**Cache มีไว้เพื่อให้"อ่านข้อมูลเดิมซ้ำได้เร็วขึ้น" แต่ใน Live Streaming ข้อมูลไหลผ่านไปแล้วไปเลย (One-way flow) การอ่านซ้ำไม่ได้ช่วยอะไร |
|"ต้องการ Buffer" | ✅ ** ถูกต้อง!** คุณต้องการที่พักข้อมูลเพื่อจัดการความต่างของความเร็ว (Speed Mismatch) ระหว่างคนส่งที่เร็วบ้างช้าบ้าง กับคนรับที่ทำงานสม่ำเสมอ |
|"ต้องการทั้งคู่" | ⚠️ ** อาจจะเกินจำเป็น!** ในสถานการณ์นี้ Buffer คือพระเอกหลัก Cache อาจช่วยได้ในแง่อื่นแต่ไม่ใช่การแก้ปัญหาเรื่องอัตราการไหลของข้อมูล (Flow Control) |

**ทำไมการแยกแยะแบบนี้สำคัญ?** เพราะการออกแบบ **Buffer ** จะเน้นเรื่อง"ลำดับ (FIFO)" และ"การจัดการล้น (Overflow Strategy)" ส่วนการออกแบบ **Cache ** จะเน้นเรื่อง"ความสด (Freshness)" และ"กลยุทธ์การลบ (Eviction Policy)"

---

## 📖 คำอธิบาย (Explain)

### 1. ความแตกต่างที่สำคัญ (The Core Difference)

ความแตกต่างระหว่าง Buffer และ Cache อยู่ที่"ความตั้งใจ" ในการจัดการข้อมูล: Buffer มีไว้เพื่อการ"ส่งผ่าน" (Transit) ในขณะที่ Cache มีไว้เพื่อการ"นำกลับมาใช้ใหม่" (Reuse) [source: The Varnish Book — Content Streaming vs Caching]

| มิติ | Buffer (ที่พัก) | Cache (ที่ซ่อน) |
|---|---|---|
|** จุดประสงค์ (Goal)**|** ประสานความเร็ว ** ระหว่างสองฝั่งที่ทำงานไม่เท่ากัน (Speed Mismatch) |** เพิ่มความเร็ว ** ในการเข้าถึงข้อมูลเดิมที่ใช้บ่อย (Latency Reduction) |
|** พฤติกรรม (Behavior)**| ข้อมูลถูกเขียนแล้ว"ส่งต่อ" (Write once, Read once) | ข้อมูลถูกเขียนแล้ว"เก็บไว้รออ่านซ้ำ" (Write once, Read many) |
|** ลำดับ (Order)**| สำคัญมาก (มักเป็น FIFO - First In, First Out) | ไม่สำคัญ เน้นความเร็วในการหา (Key-Value) |
|** ตัวอย่าง **| Video Buffering, TCP Socket Buffer, Disk Write Buffer | Browser Cache, Redis, CDN, CPU L1/L2 |

### 2. Buffering Patterns ใน System Design

####**Load Leveling (การเกลี่ยภาระ)**
ใช้ Message Queue (เช่น Kafka, RabbitMQ) เป็น Buffer ตัวใหญ่ เพื่อรับแรงกระแทกจาก Traffic ที่มาเป็นลูกคลื่น (Spikes) ไม่ให้ Database หรือ Backend ล่ม
-**Gain:** ระบบไม่ล่มเมื่อมีคนเข้าพร้อมกันมหาศาล
-**Sacrifice:** ข้อมูลอาจจะดีเลย์ (Consistency ⛓️/Staleness) เพราะต้องรออยู่ในคิว

####**Double Buffering **
ใช้พื้นที่เก็บข้อมูล 2 ชุดสลับกัน ฝั่งหนึ่งกำลังเขียน (Write) ในขณะที่อีกฝั่งกำลังประมวลผล (Process) เพื่อให้งานไหลลื่นไม่สะดุด (เช่น ในงาน Graphic หรือ Real-time ⏰ Signal Processing)

---

## 🔬 ขยายความ (Extend)

### เมื่อ Buffer กลายเป็นปัญหา (Bufferbloat)
หากคุณทำ Buffer ใหญ่เกินไปเพื่อหวังว่าจะไม่เสียข้อมูลเลย (No Data Loss) คุณจะเจอกับปัญหา **Latency มหาศาล ** เพราะข้อมูลต้องต่อคิวนานเกินไปก่อนจะถูกประมวลผล
-**Senior Tip:** ในระบบ Real-time ⏰ (เช่น Voice Call) บางครั้งการ"ทิ้งข้อมูล (Drop Packets)" ยังดีกว่าการ"รอใน Buffer นานเกินไป"

### ผสมโรง: Buffer Pool ใน Database
ในฐานข้อมูลอย่าง PostgreSQL หรือ MySQL มีสิ่งที่เรียกว่า **Buffer Pool **(หรือ Buffer Cache) ซึ่งทำหน้าที่"ลูกครึ่ง":
1.** เป็น Buffer:** พักข้อมูลที่เพิ่งเขียน (Dirty Pages) ไว้ใน RAM ก่อนจะ Flush ลง Disk เพื่อลดจำนวน I/O
2.** เป็น Cache:** เก็บข้อมูลที่เพิ่งอ่านไว้ใน RAM เพื่อให้ Query ครั้งต่อไปไม่ต้องไปอ่านจาก Disk

### สรุปย่อเพื่อการสัมภาษณ์
- หากคุณพูดถึง **"การรับมือกับ Traffic Spikes"**→ ให้ใช้คำว่า **Buffering **(Message Queues)
- หากคุณพูดถึง **"การลด Latency ของการอ่าน"**→ ให้ใช้คำว่า **Caching **(Redis/CDN)

---

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. ในระบบ YouTube การที่วิดีโอ"หมุนๆ (Buffering)" เกิดจากอะไรพยายามแก้ปัญหาอะไร?
> 2. ทำไมเราถึงไม่เรียก Redis ว่าเป็น"Buffer" ในงานส่วนใหญ่?
> 3. หากคุณต้องเลือกระหว่าง"Buffer เล็กแต่เร็ว" กับ"Buffer ใหญ่แต่ช้า" ในระบบ Streaming หุ้น (Stock Price) คุณจะเลือกอันไหน?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.**Buffering ** พยายามแก้ปัญหา **Network Instability **(ความเร็วเน็ตไม่คงที่) โดยการสะสมข้อมูลไว้ล่วงหน้าเพื่อให้วิดีโอเล่นได้ต่อเนื่องแม้เน็ตจะกระตุกชั่วคราว
2. เพราะ Redis ถูกออกแบบมาเพื่อ **Read Many **(อ่านซ้ำๆ) และเน้นความเร็วในการเข้าถึง Key มากกว่าการรันคิวแบบ FIFO (แม้จะทำได้ก็ตาม)
3.**Buffer เล็กแต่เร็ว ** เพราะข้อมูลหุ้นเน้นความสด (Real-time ⏰) ข้อมูลที่มาช้าไปเพียง 1 วินาทีอาจไร้ค่า การสะสมข้อมูลไว้ใน Buffer ขนาดใหญ่จะทำให้เกิด Latency ที่ยอมรับไม่ได้

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ในโปรเจกต์ของคุณ มีจุดไหนที่คุณใช้คำว่า"Cache" แต่จริงๆ แล้วมันกำลังทำหน้าที่เป็น"Buffer" หรือไม่? การเข้าใจหน้าที่ที่แท้จริงจะช่วยให้คุณปรับแต่ง (Tune) พารามิเตอร์ของระบบได้แม่นยำขึ้นมาก

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)
- [[03-cache-invalidation|Cache Invalidation: ปัญหาโลกแตกของ Caching]]
- [[Messaging/01-google-pubsub|Pub/Sub & Load Leveling]]
- [[Networking/02-tcp-vs-udp|TCP Flow Control & Buffering]]
- [[Postgres/10-explain-analyze|Postgres Buffers Analysis]]

> ** อ้างอิง:**
> - [Designing Data-Intensive Applications, Ch. 3: Storage and Retrieval]
> - [Cloud Design Patterns: Queue-Based Load Leveling](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling)
> - [Buffer vs Cache: What is the Difference?](https://www.geeksforgeeks.org/difference-between-buffer-and-cache/)
