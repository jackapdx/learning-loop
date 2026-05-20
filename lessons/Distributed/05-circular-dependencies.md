---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [distributed-systems, reliability, infrastructure]
---

# วงจรประตูปิดตาย: ปัญหา Circular Dependencies ในระดับ Infra

---

## 🎯 ปฐมนิเทศ (Orient)

*"คุณจะเข้าบ้านได้อย่างไร ถ้ากุญแจบ้านถูกเก็บไว้ในตู้เซฟที่เปิดได้ด้วยรีโมทซึ่งต้องใช้ Wi-Fi ในบ้านเท่านั้น?"* นี่ไม่ใช่โจทย์ปริศนาธรรม แต่เป็นสิ่งที่เกิดขึ้นจริงกับบริษัทระดับโลกอย่าง **Meta (Facebook)** ในปี 2021 เมื่อระบบล่มจนวิศวกรเข้าออฟฟิศไม่ได้ และแก้ไขอะไรไม่ได้เพราะ"ทางแก้" ดันต้องพึ่งพา"ระบบที่พังอยู่" บทเรียนนี้จะสอนวิธีออกแบบระบบให้รอดพ้นจากวงจรประตูปิดตาย (Circular Dependency)

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️ ** สถานการณ์:** คุณกำลังออกแบบระบบ"Self-healing Infrastructure 🏗️" ที่ใช้ AI 🧠 ตรวจจับบั๊กและ Restart เซอร์วิสอัตโนมัติ
> - เซอร์วิส **AI 🧠-Monitor ** ทำหน้าที่คอยสั่ง Restart เซอร์วิสอื่นๆ
> - เซอร์วิส **API-Gateway ** เป็นทางผ่านเดียวที่จะเข้าไปสั่งการเซิร์ฟเวอร์ได้
> -**AI 🧠-Monitor ** ต้องรันอยู่บน Infrastructure 🏗️ ที่จัดการโดย **API-Gateway **
>
> ** คำถาม:** จะเกิดอะไรขึ้นถ้า **API-Gateway ** พัง? และคุณจะกู้ระบบกลับมาได้อย่างไรถ้า AI 🧠-Monitor ก็พังตามไปด้วย?
>
> ** หยุดตรงนี้ก่อน **— ลองวาดแผนผังความสัมพันธ์ในหัวดู

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"ก็แค่ไป Restart API-Gateway แมนนวล" | ⚠️ ** ยากกว่าที่คิด!** ถ้าคำสั่งแมนนวลต้องผ่าน API-Gateway หรือต้องใช้ระบบ Auth ที่พังอยู่ คุณจะเข้าถึงมันไม่ได้เลย |
|"ทำระบบสำรอง (Redundancy)" | ⚠️ ** ไม่พอ!** ถ้าตัวสำรองก็พึ่งพา Dependency ชุดเดียวกัน (เช่น DNS เดียวกัน) มันก็จะพังตามกันหมด |
|"ออกแบบ Level 0 Service" | ✅ ** นี่คือคำตอบ!** คุณต้องมีเซอร์วิสที่"ไม่พึ่งพาใครเลย" และสามารถสั่งการได้ผ่านทางลับ (Out-of-band) |

**ทำไมคนส่วนใหญ่ถึงพลาด?** เพราะเรามักมองความสัมพันธ์ของระบบเป็นชั้นๆ (Layered) แต่ลืมมองว่าบางครั้งชั้นล่างสุดดันแอบกลับไปพึ่งพาสิ่งที่อยู่ชั้นบนสุด (Circular)

---

### คำอธิบาย (Explain)

วงจรประตูปิดตาย (Circular Dependency) คือสถานการณ์ที่ระบบสองส่วนหรือมากกว่าพึ่งพากันเองจนทำให้ไม่สามารถกู้คืนระบบกลับมาได้หากเกิดความผิดพร้อมกัน [source: Meta Engineering — Understanding the 2021 Service Outage]

### 1. วงจรหายนะ (The Deadlock Cycle)

ในเหตุการณ์ของ Meta:
**BGP (Network 📡)** พัง ทำให้คนเข้าถึง Data Center ไม่ได้
**DNS ** อยู่ใน Data Center นั้น — เมื่อ Network 📡 พัง DNS ก็หาไม่เจอ
**Internal Tools **(Slack, Workplace) พึ่งพา DNS — เมื่อ DNS พัง วิศวกรก็คุยกันไม่ได้
**Door Badges **(บัตรพนักงาน) พึ่งพา Network 📡 — วิศวกรจึงเข้า Data Center ไปแก้ Router ไม่ได้!

นี่คือ **Circular Dependency ** ที่สมบูรณ์แบบ: คุณต้องมี Network 📡 เพื่อแก้ Network 📡

### 2. วิธีการแก้: Level 0 Architecture

ในระบบที่ซับซ้อน เราต้องแบ่ง Priority ของ Dependency:
-**Level 0 (Bootstrap):** เซอร์วิสที่ต้องทำงานได้โดยไม่พึ่งพาใคร (เช่น Local Auth, Hard-coded IPs)
-**Level 1 (Core):** เซอร์วิสพื้นฐาน (DNS, Database 📦, Network 📡)
-**Level 2 (Application):** เซอร์วิสของผู้ใช้งาน

**กฎเหล็ก:**Level 0 ห้ามพึ่งพา Level 1 และ Level 1 ห้ามพึ่งพา Level 2 เด็ดขาด

---

## 🔬 ขยายความ (Extend)

### Out-of-band Management: ทางลับสำหรับ Engineer

Senior Engineer จะไม่ยอมให้"ทางเข้าหลัก" เป็นทางเดียวที่เข้าถึงระบบได้:
-**Serial Console / IPMI:** การเข้าถึง Server ผ่านสายแลนแยกต่างหากที่ไม่ยุ่งกับ Network 📡 หลัก
-**Static Configurations:** มีไฟล์คอนฟิกที่รันได้ทันทีโดยไม่ต้องดึงจาก Cloud หรือ Database 📦
-**Emergency Access:** ระบบกุญแจแมนนวล หรือบัตรพนักงานที่ทำงานได้แม้ Offline

### การทำ Dependency Mapping

ใช้เครื่องมือหรือทำ Diagram เพื่อหา **"Hidden Circles"**:
-**Auth Cycle:**App เรียก Auth Service แต่ Auth Service ดันต้องรันบน App Engine ที่ต้องการ Auth เพื่อ Start
-**Logging Cycle:** ระบบจะพ่น Error ลง Kafka แต่ Kafka ล่มเพราะ Disk เต็มเนื่องจาก Log ของระบบพ่น Error มากเกินไป

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:**
ในเหตุการณ์ Meta อะไรคือจุดที่ทำให้วิศวกร"เข้าบ้านไม่ได้" (เข้า Data Center ไม่ได้)?
"Out-of-band Management" หมายถึงอะไรในบริบทของระบบ Reliability?
ทำไมการมี Backup หลายๆ ตัว (Redundancy) ถึงไม่ช่วยแก้ปัญหา Circular Dependency?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>

**ระบบบัตรพนักงาน (Badge Reader)** พึ่งพา Network 📡 หลักที่ล่มอยู่ ทำให้ระบบยืนยันตัวตนใช้งานไม่ได้
การมี ** ช่องทางสื่อสารหรือสั่งการแยกขาด ** จากระบบหลัก (เช่น มี Network 📡 พิเศษสำหรับจัดการ Server โดยเฉพาะ)
เพราะถ้าทุกตัว (รวมถึงตัว Backup)** ติดอยู่ในวงจร Dependency เดียวกัน ** มันจะพังพร้อมกันทั้งหมด

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ในโปรเจกต์ของคุณตอนนี้ มีระบบไหนที่คุณ"เข้าไม่ถึง" ถ้า Domain Name (DNS) พังไหม? หรือถ้า Database 📦 ของคุณ Start ไม่ได้ คุณมีทางแก้ไขโดยไม่ต้องใช้ Tool ที่พึ่งพา Database 📦 นั้นหรือไม่? การออกแบบระบบที่กู้คืนได้ (Recoverable) สำคัญพอๆ กับการออกแบบระบบที่ไม่พัง

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[04-spof\|Single Point of Failure: จุดอ่อนเดียวที่ทำลายทั้งระบบ]]
- [[../Postgres/06-connection-pooling-replicas\|การจัดการ Database ในสภาวะวิกฤต]]
