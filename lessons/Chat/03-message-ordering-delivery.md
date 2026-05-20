---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, messaging, consistency, distributed-systems]
prerequisites: [Chat/01-websocket-realtime]
---

# Message Ordering & Delivery (การรับประกันลำดับและความถูกต้องของข้อความ)

---

## 🎯 ปฐมนิเทศ (Orient)

ในระบบกระจายตัว (Distributed Systems) การส่งข้อความไม่ใช่เรื่องง่ายอย่างที่คิด ลองนึกภาพคุณส่งข้อความ"สวัสดี" ตามด้วย"เป็นไงบ้าง" แต่เพื่อนของคุณดันเห็น"เป็นไงบ้าง" ขึ้นมาก่อน"สวัสดี" — นี่คือปัญหาเรื่อง **Message Ordering ** และยังมีเรื่องของข้อความที่อาจจะหายไปหรือปรากฏซ้ำ (Duplicates) บทเรียนนี้จะสอนวิธีแก้ปัญหาเหล่านี้ด้วยกลยุทธ์ระดับ Senior ที่เน้นการจัดการที่ปลายทาง (End-to-End Principle)

---

## 🧪 ลองทำก่อน (Attempt)

> ** สถานการณ์:** คุณใช้ Google Pub/Sub (หรือ Kafka) ในการส่งข้อความแชทให้กับผู้ใช้ 1 ล้านคน
> ** เหตุการณ์:**
> 1. ผู้ใช้ A ส่งข้อความ:"สวัสดี" (Msg 1)
> 2. ผู้ใช้ A ส่งข้อความ:"หิวข้าวยัง?" (Msg 2)
> 3. ระบบ Broker เกิดอาการสะดุด (Network Retry) ทำให้ Msg 1 ต้องถูกส่งซ้ำ
>
> ** ข้อจำกัด:**
> - ต้องรับประกันว่าผู้รับจะเห็นลำดับที่ถูกต้อง 100% (Correct Timeline)
> - ระบบต้องรองรับ High Throughput (ไม่สามารถรอให้ Msg 1 สำเร็จก่อนส่ง Msg 2 ได้)
>
> ** คำถาม:** คุณจะใช้เทคนิคใดเพื่อให้แอปของผู้รับแสดงลำดับข้อความได้ถูกต้องเสมอ แม้ Broker จะส่งสลับลำดับมาก็ตาม? และคุณจะจัดการกับ"ข้อความที่อาจจะซ้ำ" ได้อย่างไร?
>
> **✋ หยุดตรงนี้ก่อน **— ลองคิดดูว่า"เวลาที่ Server" กับ"เวลาที่ Client" อย่างไหนน่าเชื่อถือกว่ากันในการจัดลำดับ?

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"Broker จะเรียงให้เอง" | ❌ ** อันตราย!**Broker ส่วนใหญ่รับประกันลำดับแค่บางเงื่อนไข (เช่น ภายใน Partition เดียวกัน) แต่หากเกิด Network 📡 Retry ลำดับอาจสลับได้ทันที |
|"ใช้ Timestamp ของ Server" | ⚠️ ** ใกล้เคียง!** แต่ถ้ามีข้อความเข้ามาในมิลลิวินาทีเดียวกัน หรือ Server หลายตัวมี Clock ไม่ตรงกัน (Clock Skew) ลำดับก็ยังพังได้ |
|"Client-side Sequence Numbers + Idempotency Keys" | ✅ **Senior-level!** คุณเข้าใจว่าความถูกต้องที่เป๊ะที่สุดต้องถูกจัดการที่ชั้น Application โดยใช้หมายเลขลำดับ (Sequence) และ UUID เพื่อกันความซ้ำซ้อน |

**ทำไมการให้เหตุผลแบบนี้สำคัญ?** เพราะในระบบ Scale ใหญ่ เรามักเลือกความเร็ว (Availability) มาก่อนลำดับที่เป๊ะๆ จากตัว Broker (Strict Ordering) ดังนั้นเราจึงต้องมีวิธีจัดการลำดับที่ปลายทาง (Application Layer)

---

## 📖 คำอธิบาย (Explain)

### 3 มาตรฐานการส่งข้อมูล (Delivery Semantics)

| Semantics | คำอธิบาย | ความเสี่ยง | ความยาก |
|---|---|---|---|
|**At-most-once **| ส่งครั้งเดียว ไม่ตามผล | ข้อความหาย (Data Loss) | ง่ายที่สุด |
|**At-least-once **| ส่งจนกว่าจะถึง | ข้อความซ้ำ (Duplicates) | ปานกลาง (นิยมที่สุด) |
|**Exactly-once **| ส่งครั้งเดียวและไม่ซ้ำ | ช้าลง (Latency เพิ่ม) | ยากที่สุด (High Coordination) |

### วิธีแก้ 3 ปัญหาหลักของระบบแชท

1.** ข้อความสลับลำดับ (Ordering):**
   - อย่าพึ่งพา Time-order เพียงอย่างเดียว
   - ใช้ **Logical Clocks ** หรือ **Sequence Numbers ** ที่กำกับโดย Client/Sender 
   - [source: Lamport Timestamps — Leslie Lamport, 1978]

2.** ข้อความซ้ำ (Duplicates):**
   - ใช้ **[[../../05-idempotency|Idempotency Key]] **(เช่น Client-generated UUID)
   - ฝั่งผู้รับต้องทำ Deduplication ก่อนประมวลผลหรือแสดงผล

3.** ข้อความหาย (Loss):**
   - ใช้ **Acknowledgment (Ack)** และ **Retries **
   - มีกลไก **Gap Detection ** เพื่อดึงข้อมูลส่วนที่หายไป (Sync) เมื่อพบว่าลำดับข้ามไป

---

## 🔬 ขยายความ (Extend)

### การใช้ Idempotency ในฐานข้อมูล
ตัวอย่าง SQL ที่ช่วยให้ระบบทนทานต่อการส่งซ้ำ:
```sql
-- ✅ ป้องกันการเขียนข้อมูลซ้ำแม้ Broker จะส่งมา 10 รอบ
INSERT INTO messages (message_id, text, sender_id, sequence)
VALUES ('uuid-abc-123', 'สวัสดี', 1, 101)
ON CONFLICT (message_id) DO NOTHING;
```

### กลยุทธ์ Reordering ที่ Client (The Buffer Strategy)
หาก Client ได้รับ Msg 102 ก่อน Msg 101:
1. เก็บ Msg 102 ไว้ใน **Buffer ** ชั่วคราว
2. รอสักครู่ (Short Timeout) หรือขอ Sync ใหม่สำหรับ Msg 101
3. เมื่อได้ Msg 101 แล้วค่อยแสดงผล Msg 101 และ 102 พร้อมกันตามลำดับ
-**Trade-off:** ยอมรับ Latency ที่เพิ่มขึ้นเล็กน้อยเพื่อแลกกับความถูกต้องของหน้าจอ (UI Consistency)

### กรณีศึกษา: ความท้าทายของการใช้ Pub/Sub ในระบบแชทจริง
ในระบบตัวอย่าง:
- เราใช้ Google Pub/Sub ซึ่งเป็น **At-least-once **
- เรายอมรับให้มีความซ้ำซ้อนไหลเข้ามาในระบบ (Write Amplification) แต่เรากรองออกที่ **Read Model **(View) โดยใช้ Message UUID เป็นตัวเช็ค
-** ผลลัพธ์:** ระบบมีความทนทาน (Resilient) สูงมาก แม้ Cloud Provider จะสะดุด ระบบก็ยังทำงานต่อได้โดยไม่มีข้อความหาย

---

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. ทำไมระบบแชทส่วนใหญ่ถึงเลือก At-least-once แทนที่จะพยายามทำ Exactly-once ให้ได้ 100%?
> 2. หากเราใช้"Sequence Number" ของผู้ส่งมาจัดลำดับ แล้วเกิดกรณีที่ผู้ส่งคนเดียวกันส่งจาก 2 อุปกรณ์พร้อมกัน (Mobile & Web) คุณจะแก้ปัญหาลำดับอย่างไร?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.** เพราะ Trade-off เรื่อง Performance **— Exactly-once ต้องใช้ Distributed Locking หรือ Two-phase Commit ซึ่งช้าและ Scale ยากมาก การใช้ At-least-once + Deduplication ที่ปลายทางให้ผลลัพธ์ที่เหมือนกันแต่เร็วกว่ามหาศาล
2.** ต้องใช้ Server-assigned Sequence หรือ Global Ordering Key ** — ในกรณีหลายอุปกรณ์ Client-side Sequence อย่างเดียวไม่พอ Server ต้องเป็นคนกำหนดลำดับกลาง (Global Order) อีกชั้นหนึ่งเพื่อรวมไทม์ไลน์ให้ถูกต้อง

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ลองนึกถึงแอปแชทที่คุณใช้อยู่ หากคุณส่งข้อความในลิฟต์ที่เน็ตขาดๆ หายๆ แล้วพอออกจากลิฟต์ ข้อความนั้นถูกส่งออกไป 2 ครั้ง คุณจะรู้สึกอย่างไร? แล้วถ้ามันไม่ถูกส่งไปเลยล่ะ? การออกแบบระบบคือการเลือก"สิ่งที่ผู้ใช้รับได้มากที่สุด" ในวันที่เทคโนโลยีทำงานไม่สมบูรณ์

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[../../05-idempotency|Idempotency: การป้องกันข้อมูลซ้ำซ้อน]]
- [[05-read-receipts-typing|Read Receipts: เมื่อการส่งสถานะ 'อ่านแล้ว' ก็ต้องการลำดับที่ถูกต้อง]]
- [Whitepaper: Exactly-once is possible (but at what cost?)](../../Research/exactly-once-tradeoffs.md)
