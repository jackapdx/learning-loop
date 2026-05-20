---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [nosql, mongodb, locking, performance, system-design]
---

# Locking & Bottlenecks: เมื่อการเพิ่ม CPU กลับทำให้ระบบช้าลง

---

## 🎯 ปฐมนิเทศ (Orient)

*"คุณมีซูเปอร์คอมพิวเตอร์ 64 คอร์ แต่ทำไม Database กลับรันคำสั่งได้แค่ทีละอย่าง?"* นี่ไม่ใช่เรื่องตลก แต่เป็นความจริงที่เกิดขึ้นกับ **MongoDB**ในอดีต และยังคงเป็นบทเรียนสำคัญเรื่อง**Lock Granularity**(ระดับความละเอียดของการล็อก) บทเรียนนี้จะพาคุณไปดูเหตุการณ์ระบบล่มครั้งประวัติศาสตร์ของ **Foursquare**ที่ลากยาวถึง 11 ชั่วโมงเพียงเพราะ"แม่กุญแจตัวเดียว"

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️**สถานการณ์:**คุณอัปเกรดเซิร์ฟเวอร์ Database 📦 เป็นเครื่องที่แรงที่สุดในตลาด (96 Cores, 512GB RAM)
> - คุณหวังว่าจะรองรับ Write ได้เพิ่มขึ้น 10 เท่า
> - แต่เมื่อรันจริง Throughput กลับเท่าเดิม และ CPU % System กลับสูงปรี๊ด
> - เมื่อตรวจสอบพบว่า Thread 🧵 จำนวนมากติดสถานะ"Waiting for Lock"
>
>**คำถาม:**ในฐานะ Senior Engineer คุณจะอธิบายปรากฏการณ์นี้ว่าอย่างไร? และทำไมการเพิ่ม CPU ถึงไม่ช่วย (หรืออาจทำให้แย่ลง)?
>
>**หยุดตรงนี้ก่อน**— (คำใบ้: ลองนึกภาพคน 96 คน พยายามจะเขียนหนังสือเล่มเดียวกันพร้อมกัน โดยที่มีปากกาแค่ด้ามเดียว)

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"Disk Write ไม่ทัน" | ⚠️ **เกือบใช่!**แต่อาจไม่ใช่สาเหตุหลักที่ทำให้ CPU รอ Lock นานขนาดนั้น |
|"เกิด Global Write Lock" | ✅**นี่คือคำตอบ!**(Lock Contention) หาก Database 📦 ใช้ Lock ระดับกระบวนการ (Process-wide) ต่อให้มีกี่คอร์ ทุกคนก็ต้องต่อคิวใช้ Lock เดียวกันอยู่ดี |
|"RAM ไม่พอ" | ⚠️ **เป็นตัวกระตุ้น!**RAM ไม่พอทำให้เกิด Page Fault ซึ่งทำให้ตัวที่ถือ Lock อยู่ต้องรอ Disk นานขึ้น และขวางคนอื่นนานขึ้นตามไปด้วย |

**ทำไมคนส่วนใหญ่ถึงพลาด?**เพราะเรามักเชื่อว่าซอฟต์แวร์สมัยใหม่จะใช้พลังของ Multi-core ได้เต็มที่เสมอ แต่ความจริงแล้ว**Locking 🧵 Strategy**คือตัวกำหนดขีดจำกัดที่แท้จริง

---

## 📖 คำอธิบาย (Explain)

### 1. ลำดับขั้นของการ Lock (Lock Granularity)

ยิ่ง Lock ละเอียด ระบบยิ่งทำงานขนาน (Parallel) ได้ดี:
-**Global Lock:** ล็อกทั้ง Database 📦 (คนหนึ่งเขียน ทั้งโลกหยุดรอ) -> *แย่ที่สุด*
- **Database 📦 Lock:**ล็อกเฉพาะ DB นั้น (DB อื่นยังทำงานได้)
-**Collection/Table Lock:**ล็อกเฉพาะตาราง
-**Document/Row Lock:** ล็อกเฉพาะแถวที่กำลังแก้ -> *ดีที่สุด*

### 2. บทเรียนจาก Foursquare (The Page Fault Death Spiral)

ในปี 2010 Foursquare ล่มเพราะ MongoDB รุ่นเก่าใช้ **Global Write Lock**:
ข้อมูลโตจนเกิน RAM ทำให้เกิด **Page Fault**(ต้องไปดึงจากดิสก์)
MongoDB ถือ **Global Lock**ค้างไว้ระหว่างรออ่านดิสก์ที่แสนช้า
ทุก Request อื่นๆ (แม้แต่การอ่าน) ต้องมา**ต่อแถวรอ**หลัง Global Lock นั้น
ยิ่งคนรอเยอะ แถวยิ่งยาว จนระบบน็อคไปทั้งระบบ

### 3. วิวัฒนาการสู่ WiredTiger

MongoDB แก้ปัญหานี้ถาวรโดยการเปลี่ยน Storage Engine เป็น**WiredTiger**ซึ่งใช้:
-**Document-level Locking 🧵:**ยอมให้คนเขียนคนละหน้ากระดาษพร้อมกันได้
-**Optimistic Concurrency 🧵:**สมมติว่าไม่มีใครแก้ข้อมูลชนกัน แล้วค่อยเช็คตอนจบ ถ้าชนค่อยแก้ใหม่

---

## 🔬 ขยายความ (Extend)

### ยุทธศาสตร์ Senior: การหา Serial Bottleneck

จำกฎของ**Amdahl's Law**: ความเร็วของระบบจะถูกจำกัดด้วยส่วนที่"รันขนานไม่ได้" (Sequential part)
- หากระบบของคุณมีการ Lock ที่คอขวด ต่อให้คุณเพิ่มเซิร์ฟเวอร์หรือ CPU เท่าไหร่ ประสิทธิภาพจะไม่มีวันเพิ่มขึ้นแบบ Linear

### วิธีสังเกตอาการ"ติด Lock" ใน Production

**High CPU Wait / System CPU:**คอร์ทำงานหนักกับการ"จัดการคิว" ไม่ใช่งานจริง**Lock Percentage > 50%:**(ในเครื่องมือ Monitor) บอกว่า Database 📦 ใช้เวลาส่วนใหญ่ไปกับการถือ Lock ค้างไว้
**Thread 🧵 State"Locked":**เมื่อใช้คำสั่ง`db.currentOp()` แล้วเจอคำว่า`waitingForLock: true` จำนวนมาก

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:**ทำไมการเกิด Page Fault ถึงทำให้อาการ Global Lock เลวร้ายลง?
"Optimistic Concurrency 🧵" ต่างจาก"Pessimistic Locking 🧵" อย่างไร?
ระหว่างการ Query ข้อมูล (Read) และการ Update ข้อมูล (Write) ตัวไหนมักจะสร้างปัญหา Lock มากกว่ากัน?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>

เพราะ Page Fault ทำให้เครื่องต้อง**รอ Disk I/O**ซึ่งช้ากว่า RAM นับพันเท่า หากถือ Lock ค้างไว้ระหว่างรอดิสก์ ทุกคนในระบบก็จะถูกบล็อกนานขึ้นตามไปด้วย**Optimistic**จะ"ลองทำไปก่อน" แล้วค่อยเช็คว่าพังไหม (เหมาะกับงานที่ชนกันน้อย) ส่วน**Pessimistic**จะ"ขอล็อกก่อนทำ" (ชัวร์กว่าแต่ช้ากว่า)**Write** มักสร้างปัญหามากกว่าเพราะต้องขอยืม Lock แบบ Exclusive (ห้ามคนอื่นอ่าน/เขียน) ในขณะที่ Read มักจะใช้ Shared Lock (อ่านพร้อมกันได้หลายคน)

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 คุณเคยตรวจสอบ"Locking 🧵 Strategy" ของเครื่องมือที่คุณใช้ไหม? ไม่ว่าจะเป็น Database 📦, Message Broker หรือแม้แต่ Code ในภาษาที่คุณเขียน (เช่น`synchronized` ใน Java หรือ`lock` ใน C#) การออกแบบให้ระบบ"Lock น้อยที่สุดและสั้นที่สุด" คือกุญแจสู่ระบบที่สเกลได้จริง

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[../Postgres/09-locking-concurrency|Locking ใน PostgreSQL: ความต่างจาก NoSQL]]
- [[../Observability/01-monitoring-levels|การวัด Saturation และการรอทรัพยากร]]
- [Foursquare Post-mortem: The 11-hour Outage](http://highscalability.com/blog/2010/10/15/foursquare-outage-post-mortem.html)
