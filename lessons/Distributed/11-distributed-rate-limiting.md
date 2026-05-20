---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [system-design, distributed, scalability, security, performance]
prerequisites: [docs/Learn/Lessons/Distributed/00-overview.md, docs/Learn/Lessons/09-load-balancer.md]
---

# Distributed Rate Limiting (การควบคุมปริมาณ Request ในระบบกระจาย)

---

## 🎯 ปฐมนิเทศ (Orient)

เมื่อระบบของคุณขยายตัวจาก Server เครื่องเดียวเป็น Cluster ที่มี 50 เครื่อง การทำ Rate Limiting แบบเดิมๆ (In-memory) จะเริ่มมีปัญหา หากคุณตั้งโควต้าไว้ที่ 100 req/min แต่ละเครื่องจะนับของตัวเอง ทำให้ผู้ใช้อาจยิงได้ถึง 5,000 req/min! บทเรียนนี้จะสอนวิธีทำ **Global Rate Limiting ** ให้แม่นยำและรวดเร็ว โดยไม่ให้ตัววัดความเร็วกลายเป็นคอขวดเสียเอง

---

## 🧪 ลองทำก่อน (Attempt)

> ** สถานการณ์:** คุณเป็นวิศวกรที่ระบบ Chat ระบบหนึ่งซึ่งมี API Server 20 เครื่อง โจทย์คือต้องจำกัดการส่งข้อความของผู้ใช้ที่"10 ข้อความต่อนาที" เพื่อป้องกัน Spam
> 
> ** ข้อจำกัด:**
> 1. การเช็ค Rate Limit ต้องใช้เวลาไม่เกิน 5ms (Latency-sensitive)
> 2. ห้าม"เผลอปล่อย" ให้ยิงเกินโควต้าเด็ดขาด (Accuracy is important)
> 3. ระบบต้องทำงานได้แม้จะมี API Server บางเครื่องตายไป
> 
> ** คำถาม:** คุณจะเลือกสถาปัตยกรรมแบบใดในการเก็บสถานะ (State) ของการนับ? และจะเลือกใช้อัลกอริทึมใดระหว่าง **Fixed Window ** กับ **Sliding Window Log **?
>
> **✋ หยุดตรงนี้ก่อน **— ลองพิจารณาดูว่าการเก็บข้อมูลไว้ที่ Redis กลาง กับการนับที่เครื่องตัวเอง (Local) มีข้อดีข้อเสียต่างกันอย่างไรในแง่ของความแม่นยำ

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"นับที่เครื่องใครเครื่องมัน (Local Counter)" | ⚠️ ** ไม่แม่นยำ!** ผู้ใช้สามารถยิงไปที่ Server อื่นเพื่อเริ่มนับใหม่ได้ ทำให้โควต้าจริงสูงกว่าที่ตั้งไว้มาก เหมาะสำหรับกรณีที่ต้องการแค่"คร่าวๆ" เพื่อรักษาเครื่องตัวเองเท่านั้น |
|"ใช้ Redis กลาง + Fixed Window" | ✅ ** ใช้งานได้จริง!** เป็นวิธีที่นิยมที่สุดเพราะเร็วและแชร์โควต้าร่วมกันได้ แต่ต้องระวังปัญหา **Traffic Spike ** ที่ขอบหน้าต่างเวลา (Window boundary) |
|"ใช้ Redis + Sliding Window Log" | ✅ ** แม่นยำสูงสุด!** ป้องกันปัญหาขอบหน้าต่างเวลาได้ 100% แต่ต้องแลกมาด้วยพื้นที่เก็บข้อมูลที่มากกว่าและการคำนวณที่ซับซ้อนขึ้น (CPU/Memory usage) |

**ทำไมการให้เหตุผลแบบนี้สำคัญ?** เพราะ Senior Engineer ต้องเลือกเครื่องมือตาม **"Cost of Error"** หากการปล่อยให้คนยิงเกินนิดหน่อยไม่ทำให้ระบบพัง วิธีที่ง่ายและเร็วที่สุดมักจะชนะ แต่ถ้าเป็นระบบจ่ายเงินที่ซีเรียส ความแม่นยำย่อมสำคัญกว่า [source: Cloudflare — How we built rate limiting]

---

## 📖 คำอธิบาย (Explain)

### 1. สถานที่เก็บข้อมูล (Where to store?)

| แบบ (Type) | ความแม่นยำ | Latency | สิ่งที่ต้องแลก (Trade-off) |
|---|---|---|---|
|**Local (In-memory)**| ❌ ต่ำ (ต่อเครื่อง) | ✅ ต่ำมาก (< 1ms) | นับยอดรวมไม่ได้, จัดการลำบาก |
|**Centralized (Redis)**| ✅ สูง (Global) | ⚠️ ปานกลาง (Network hop) |**SPOF **: ถ้า Redis พัง Rate Limit จะใช้งานไม่ได้ |
|**Hybrid (Local + Sync)**| ✅ ปานกลาง | ✅ ต่ำ | ซับซ้อนมาก ต้องซิงค์ข้อมูลระหว่างเครื่องตลอดเวลา |

### 2. อัลกอริทึมยอดนิยม

1.**Fixed Window Counter:** แบ่งเวลาเป็นช่องๆ เช่น 1 นาทีพอดิบพอดี ง่ายที่สุด แต่มีจุดอ่อนคือผู้ใช้สามารถยิง 10 ครั้งตอนท้ายนาทีที่ 1 และ 10 ครั้งตอนต้นนาทีที่ 2 รวมเป็น 20 ครั้งในเวลาไม่กี่วินาที
2.**Token Bucket:** มี"ถัง" เก็บเหรียญ เหรียญจะเติมเข้าถังด้วยความเร็วคงที่ Request ต้องหยิบเหรียญไปถึงจะผ่านได้ **(รองรับ Burst traffic ได้ดี)**
3.**Sliding Window Log:** เก็บ Timestamp ของทุก Request ไว้ใน Set (เช่น Redis Sorted Set) เมื่อมี Request ใหม่เข้ามา จะลบ Timestamp ที่เก่าเกินไปทิ้งแล้วนับจำนวนที่เหลือ **(แม่นยำที่สุด แต่เปลือง RAM)**

---

## 🔬 ขยายความ (Extend)

### การทำ Rate Limiting ในระดับโปร (Advanced Patterns)

### ประสิทธิภาพ: Redis + Lua Scripts
การเช็ค Rate Limit ใน Redis มักใช้คำสั่งหลายตัว (GET, INCR, EXPIRE) หากส่งแยกกันจะเสียเวลา Network Round-trip 
**Solution:** ใช้ **Lua Script ** เพื่อส่งคำสั่งทั้งหมดไปรันที่ Redis ในครั้งเดียว (Atomic operation) ช่วยลด Latency และป้องกัน Race Conditions

### ความทนทาน: Fail-open vs Fail-closed
ถ้า Redis (Rate Limiter) พัง ระบบคุณจะทำอย่างไร?
-**Fail-open:** ปล่อยให้ Request ผ่านไปก่อน (เน้น Availability)
-**Fail-closed:** บล็อคทุกอย่าง (เน้น Security/Budget)
> **Senior Advice:** ในระบบส่วนใหญ่ เรามักเลือก **Fail-open ** พร้อมกับมี Local Rate Limit สำรองไว้ เพื่อไม่ให้ระบบล่มเพราะตัวเช็คพัง

### Multi-tier Rate Limiting
อย่าพึ่งพาระดับเดียว:
-**L4/L7 (Infrastructure):** บล็อคที่ Cloudflare/NGINX (เน้นป้องกัน DDoS)
-**API Gateway (App level):** บล็อคตาม API Key/UserID (เน้น Business Logic)

---

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. ปัญหา"Boundary Spike" เกิดขึ้นกับอัลกอริทึมใด? และแก้ได้อย่างไร?
> 2. ทำไมเราถึงควรใช้ Lua Script เมื่อทำ Rate Limiting ด้วย Redis?
> 3. หากคุณต้องทำ Rate Limit ให้กับระบบที่มีผู้ใช้ 100 ล้านคน และแต่ละคนมีโควต้าต่างกัน อัลกอริทึมไหนจะ"เปลือง RAM" ที่สุด?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.**Fixed Window **— แก้ได้โดยใช้ **Sliding Window **(แบบ Log หรือแบบ Weight) เพื่อเฉลี่ยการนับตามเวลาจริง
2.** เพื่อความเป็น Atomicity และลด Latency **— ลดจำนวนครั้งที่ต้องคุยกับ Redis (Round-trip) และป้องกันไม่ให้ข้อมูลเปลี่ยนไประหว่างที่กำลังเช็คและอัปเดต
3.**Sliding Window Log ** — เพราะต้องเก็บทุุก Timestamp ของทุกผู้ใช้ (ถ้า 1 คนยิง 100 ครั้ง ก็ต้องเก็บ 100 ตัวเลข) ในขณะที่แบบ Counter เก็บแค่ตัวเลขเดียว

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ลองดูระบบที่คุณทำอยู่ — ถ้าพรุ่งนี้มีบอทมารุมยิง API ของคุณล้านครั้งต่อวินาที ระบบจะป้องกันตัวเองได้ไหม? จุดไหนที่จะพังก่อนกันระหว่าง Database หรือ Rate Limiter?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[09-load-balancer|Load Balancer: การกระจายงานให้เครื่องลูกข่าย]]
- [[../14-kong-api-gateway|Kong API Gateway และการทำ Rate Limiting สำเร็จรูป]]
- [[../Messaging/02-streaming-vs-queuing|การใช้ Message Queue เพื่อจัดการ Backpressure แทน Rate Limiting]]
- [[../NoSQL/01-sql-vs-nosql-tradeoffs|Redis vs SQL: ทำไม Redis ถึงเหมาะกับการเก็บสถานะชั่วคราว]]
