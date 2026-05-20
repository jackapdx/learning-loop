---
contentType: learning-loop
level: senior
status: polished
tags: [observability, sre, monitoring, metrics]
---

# Levels of Monitoring: วัดอะไรให้รู้จริง (Golden Signals, RED, USE)

---

## ปฐมนิเทศ (Orient)

*"คุณมี Dashboard เป็นร้อยอัน แต่ทำไมเวลาระบบล่ม คุณกลับหาต้นเหตุไม่เจอ?"* นี่คือปัญหาของ"การวัดทุกอย่างแต่ไม่รู้อะไรเลย" (Metric Bloat) วิศวกรระดับ Senior จะไม่เสียเวลาสร้างกราฟที่ไม่ได้บอกสุขภาพของระบบ บทเรียนนี้จะสอน 3 กรอบแนวคิด (Frameworks) มาตรฐานโลกที่จะช่วยให้คุณเลือกวัดสิ่งที่"สำคัญ" จริงๆ

---

## ลองทำก่อน (Attempt)

> ✍️ **สถานการณ์:** คุณเป็น SRE ที่ดูแลระบบ **Microservices ** ขนาดใหญ่ 
> - ผู้ใช้เริ่มบ่นว่า"แอปช้า" (Slowness)
> - เมื่อคุณดู Dashboard พบว่า CPU Usage ของเซิร์ฟเวอร์ทุกตัวอยู่ที่ 20% (น้อยมาก)
> - แต่ Error Rate เริ่มค่อยๆ สูงขึ้น
>
> ** คำถาม:** หากคุณต้องเลือก Metrics 3 ตัวเพื่อหาคอขวดที่แท้จริง คุณจะเลือกอะไร?
> 1. CPU, RAM, Disk Space
> 2. Requests per second, Error Rate, Average Latency
> 3. Database 📦 Connection Count, Thread 🧵 Pool Queue, Disk I/O Wait
>
> ** หยุดตรงนี้ก่อน **— (คำใบ้: ลองนึกดูว่า 'ระบบช้า' ทั้งที่ 'CPU ว่าง' แปลว่ามันกำลัง 'รอ' อะไรบางอย่างอยู่หรือเปล่า?)

---

## ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"CPU, RAM, Disk" | ❌ ** ตกหลุมพราง!** นี่คือการวัด Resource ซึ่งบอกแค่ว่าเครื่องยังไม่ตาย แต่ไม่บอกว่า"ผู้ใช้เจออะไร" (User Experience) |
|"Req/s, Error, Latency" | ⚠️ ** เกือบใช่!**(RED Method) บอกอาการของเซอร์วิสได้ดี แต่ในเคสนี้มันยังไม่บอกว่า"ทำไมถึงช้า" |
|"Connections, Queue, Wait" | ✅ ** นี่คือระดับ Senior!**(Saturation) คุณกำลังมองหาสิ่งที่"เต็ม" หรือ"คอขวด" ที่ซ่อนอยู่แม้ CPU จะว่างก็ตาม |

**ทำไมคนส่วนใหญ่ถึงพลาด?** เพราะเรามักยึดติดกับ Resource Metrics (CPU/RAM) แต่ลืมมอง **Saturation **(การอิ่มตัวของทรัพยากรที่มองไม่เห็น เช่น Thread 🧵 Pool หรือ Database 📦 Connections)

---

## คำอธิบาย (Explain)

💡 ในโลก SRE มี 3 แนวทางหลักในการเลือก Metrics:

### 1. The Four Golden Signals (โดย Google)
หัวใจของการวัด"ประสบการณ์ผู้ใช้":
-**Latency:** เวลาที่ใช้ประมวลผล (ต้องแยก Success vs Error)
-**Traffic:** ปริมาณงานที่ไหลเข้าระบบ (Requests/s)
-**Errors:** อัตราการพังของระบบ (HTTP 500s)
-**Saturation:**"ความอิ่มตัว" — ระบบรับโหลดได้อีกเท่าไหร่? (เช่น Queue ที่รอประมวลผล)

### 2. The RED Method (สำหรับ Services)
เน้นไปที่การวัดประสิทธิภาพของ Microservice:
-**(R)ate:** จำนวน Request ต่อวินาที
-**(E)rrors:** จำนวน Request ที่พัง
-**(D)uration:** เวลาที่ใช้ (Latency)

### 3. The USE Method (สำหรับ Resources/Hardware)
เน้นไปที่การวิเคราะห์คอขวดของทรัพยากร:
-**(U)tilization:** ทรัพยากรถูกใช้ไปกี่ % (เช่น CPU 80%)
-**(S)aturation:** มีงานที่"รอคิว" ใช้ทรัพยากรนั้นไหม? (เช่น Disk I/O Wait)
-**(E)rrors:** ทรัพยากรนั้นพ่น Error ออกมาไหม?

---

## ขยายความ (Extend)

### ยุทธศาสตร์ Senior: การวัด Saturation ที่มองไม่เห็น
Saturation คือจุดที่แยกมือโปรออกจากมือสมัครเล่น:
-**Database 📦 Connections:** หาก App เชื่อมต่อ DB ได้สูงสุด 100 แล้วตอนนี้ใช้ไป 99 นี่คือ Saturation แม้ CPU DB จะอยู่ที่ 10% ก็ตาม
-**Thread 🧵 Pool:** หากแอปมี 10 Thread 🧵 และทุกตัวกำลังทำงานอยู่ งานที่ 11 ต้องรอคิว นี่คือสาเหตุของ"แอปช้าทั้งที่ CPU ว่าง"

### สรุปการเลือกใช้
| สถานการณ์ | Framework ที่ควรใช้ |
|:---|:---|
|** ออกแบบ Dashboard ให้ User เห็น **| Golden Signals |
|** ออกแบบ Alert ให้ทีม Developer **| RED Method |
|**Debug เมื่อระบบพัง (หาคอขวด)**| USE Method |

---

## จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:**
"P99 Latency" คืออะไร และทำไมถึงสำคัญกว่า"Average Latency"?
หาก Disk Utilization อยู่ที่ 50% แต่ Disk Saturation (Wait Time) สูงมาก ระบบจะช้าไหม?
RED Method ย่อมาจากอะไรบ้าง?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>

**P99 Latency ** คือเวลาที่ครอบคลุมผู้ใช้ 99% (มีเพียง 1% ที่ช้ากว่านี้) สำคัญเพราะค่าเฉลี่ย (Average) มักจะหลอกตาและซ่อนความทรมานของผู้ใช้ส่วนน้อยที่เจอความช้ามากๆ ไว้
**ช้าแน่นอน ** เพราะ Saturation บอกว่างานกำลัง"รอคิว" แม้ทรัพยากรจะยังใช้ไม่เต็ม 100% ก็ตาม
**(R)ate, (E)rrors, (D)uration **

</details>

---

## สะท้อนคิด (Reflect)

> 💭 ในระบบที่คุณดูแลอยู่ตอนนี้ คุณมี Alert ที่บอกเรื่อง **Saturation ** บ้างไหม? หรือคุณจะรู้ว่าระบบเต็มก็ต่อเมื่อ CPU มันแตะ 100% ไปแล้ว? การวัด Saturation คือการรู้ล่วงหน้าว่า"พายุล่มกำลังจะมา" ก่อนที่มันจะมาถึงจริงๆ

---

## หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[02-lgtm-stack|The LGTM Stack: เครื่องมือสำหรับเก็บ Metrics เหล่านี้]]
- [[../Distributed/01-self-recovery|Self-Recovery: การแก้ปัญหาอัตโนมัติจาก Metrics]]
- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
