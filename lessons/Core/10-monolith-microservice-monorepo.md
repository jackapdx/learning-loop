---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [system-design, architecture, microservices, monorepo]
prerequisites: []
---

# Monolith, Microservices & Monorepo: การจัดระเบียบโค้ดและระบบ

---

## 🎯 ปฐมนิเทศ (Orient)

หนึ่งในความเข้าใจผิดที่พบบ่อยที่สุดในการออกแบบระบบคือการสับสนระหว่าง **"วิธีการเก็บโค้ด" (Code Organization)** กับ **"วิธีการรันระบบ" (Runtime Architecture)**

หลายทีมกระโดดเข้าหา **Microservices ** เพราะคิดว่าจะแก้ปัญหาความยุ่งเหยิงของโค้ด แต่กลับต้องเจอกับ"ความยุ่งเหยิงบนเครือข่าย" แทน ในขณะที่บางทีมพยายามทำ **Monorepo ** แต่ดันเผลอทำ **Distributed Monolith ** ที่รวมจุดอ่อนของทั้งสองโลกเข้าด้วยกัน บทเรียนนี้จะช่วยให้คุณแยกแยะและเลือกโครงสร้างที่เหมาะสมกับ"ขนาดทีม" และ"ความซับซ้อนของธุรกิจ" อย่างแท้จริง

---

## 🧪 ลองทำก่อน (Attempt)

> ** สถานการณ์:** คุณกำลังคุมทีมวิศวกร 20 คน (3 ทีมย่อย) สร้างแอปพลิเคชัน E-commerce 
> -** ปัญหาปัจจุบัน:** โค้ดปนกันมั่วไปหมด (Spaghetti Code) การแก้ไขหนึ่งจุดกระทบส่วนอื่นแบบคาดเดาไม่ได้
> -** โจทย์:** ต้องการความเร็วในการ Deploy (Agility) และความชัดเจนในความเป็นเจ้าของโค้ด (Code Ownership)
> -** ข้อจำกัด:** ทีม DevOps มีเพียง 1 คน และคุณยังไม่มีระบบ Automated Monitoring/Tracing ที่แข็งแกร่ง
>
> ** คำถาม:** คุณจะเลือกแนวทางใดเพื่อให้ทีมส่งมอบฟีเจอร์ได้เร็วที่สุดโดยไม่เพิ่มภาระในการดูแลระบบจนเกินตัว?
> 1. แตกเป็น **Microservices ** แยก Repo ตามทีม (Polyrepo)
> 2. ออกแบบเป็น **Modular Monolith ** ใน Monorepo
> 3. ทำ **Microservices ** ทั้งหมดให้อยู่ใน Monorepo เดียวกัน
>
> **✋ หยุดตรงนี้ก่อน **— อย่าเพิ่งรีบเลือก"Microservices" เพียงเพราะมันฟังดูทันสมัย!

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"Microservices (ทั้ง Polyrepo หรือ Monorepo)" | ⚠️ ** ระวัง! นี่คือ Over-engineering!** ด้วยทีม 20 คนและ DevOps 1 คน การจัดการ Network Latency, Distributed Auth, และ Transaction Consistency จะกินเวลาทีมไปมากกว่า 50% คุณจะ Deploy ช้าลงกว่าเดิมเพราะต้องแบก"Distributed Tax" |
|"Modular Monolith ใน Monorepo" | ✅ ** นี่คือภูมิปัญญาของ Senior!** คุณแยกโค้ดเป็นสัดส่วน (Logical Isolation) ทำให้ Code Ownership ชัดเจน แต่ยังรันอยู่ในก้อนเดียว (Monolith) ลดภาระ DevOps และขจัดปัญหาความซับซ้อนของเครือข่ายออกไปจนกว่าจะถึงจุดที่จำเป็นจริงๆ |
|"Monolith แบบดั้งเดิม" | ❌ ** ไม่ตอบโจทย์!** ปัญหา Spaghetti Code ของคุณจะยังคงอยู่หากไม่มีการบังคับโครงสร้าง (Modularization) ที่ชัดเจน |

**ทำไมการให้เหตุผลแบบนี้สำคัญ?** เพราะ Senior Engineer ไม่ได้เลือกเทคโนโลยีตามกระแส แต่เลือกตาม **"ขีดความสามารถในการปฏิบัติงาน (Operational Capacity)"** ของทีม การใช้ Microservices โดยที่ Infra ไม่พร้อม คือการฆ่าตัวตายทางการบริหาร

---

## 📖 คำอธิบาย (Explain)

### 1. Runtime Architecture: Monolith vs. Microservices
คือการตัดสินใจว่า **"เมื่อรันระบบ มันอยู่ใน Process เดียวกันหรือเปล่า?"**

-**Monolith:** ทุกฟังก์ชันรันอยู่ใน Binary/Container เดียวกัน
    - ✅ ** ข้อดี:** ง่ายในการพัฒนา, ทดสอบ, และ Debug, Latency ต่ำ (Function Call), Data Integrity สูง (Acid Transactions)
    - ❌ ** ข้อเสีย:**Scalability ต่ำ (ต้อง Scale ทั้งก้อน), Deployment นาน, เทคโนโลยี Lock-in
-**Microservices:** แยกฟังก์ชันออกเป็นเซอร์วิสเล็กๆ คุยกันผ่าน Network (HTTP/gRPC/Messaging)
    - ✅ ** ข้อดี:**Scale แยกส่วนได้, Deploy แยกส่วนได้ (Agility), เลือกเทคโนโลยีที่เหมาะกับงานได้
    - ❌ ** ข้อเสีย:** **Operational Complexity มหาศาล **, Network Latency, ความยากในการจัดการ Distributed Transactions และ Consistency

### 2. Code Organization: Monorepo vs. Polyrepo
คือการตัดสินใจว่า **"โค้ดทั้งหมดอยู่ที่ไหน?"**

-**Polyrepo (Multi-repo):**1 เซอร์วิส = 1 Repo
    - ✅ ** ข้อดี:** สิทธิการเข้าถึงชัดเจน (Isolation), Tooling ต่อ Repo เบาและเร็ว
    - ❌ ** ข้อเสีย:** แชร์โค้ดยาก (ต้องทำ Private NPM/NuGet), จัดการ Version ของ Library ข้ามระบบยาก
-**Monorepo:** ทุกเซอร์วิสและ Library อยู่ใน Repo เดียวกัน
    - ✅ ** ข้อดี:** แชร์โค้ดง่าย, ทำ Atomic Changes (แก้ที่เดียว อัปเดตทุกเซอร์วิส), Tooling สอดคล้องกันทั้งบริษัท
    - ❌ ** ข้อเสีย:** ต้องใช้ Tooling เฉพาะทาง (เช่น Nx, Turbo, Bazel), ปัญหาเรื่องสิทธิการเข้าถึง (ทุกคนเห็นโค้ดกันหมด)

### 3. ตารางสรุปการตัดสินใจ

| มิติ | Monolith | Microservices |
|---|---|---|
|** ขนาดทีมที่แนะนำ **| 1 - 15 คน | 20 คนขึ้นไป (แยกทีมชัดเจน) |
|** ความเร็วในการเริ่ม **| สูงมาก | ต่ำ (ต้องวาง Infra เยอะ) |
|** การจัดการข้อมูล **| ง่าย (Centralized DB) | ยาก (Decentralized/Eventual Consistency) |
|**Infrastructure **| ง่าย | ซับซ้อน (K8s, Service Mesh, Logging) |

---

## 🔬 ขยายความ (Extend)

### กับดักที่พบบ่อย: Distributed Monolith
นี่คือฝันร้ายที่สุด: คุณแยกเซอร์วิสออกเป็น Microservices แต่ทุกเซอร์วิสต้อง **Deploy พร้อมกัน ** เสมอ เพราะโค้ดผูกกันแน่น (Tight Coupling) ผ่าน API ที่เปลี่ยนบ่อยเกินไป
-** ผลลัพธ์:** คุณได้ความช้าของ Monolith + ความซับซ้อนของ Microservices โดยไม่ได้ข้อดีของอะไรเลย

### ทางเลือกที่สาม: Modular Monolith
เป็นการเขียน Monolith ที่มีระเบียบวินัยสูง แยก Module ชัดเจนผ่าน Interface ห้ามเรียกข้ามกันมั่วซั่ว
-** เป้าหมาย:** ได้ระเบียบของ Microservices แต่รันอยู่ใน Process เดียวกันเพื่อความง่ายและเร็ว เหมาะมากสำหรับทีมขนาดกลางที่ต้องการ Agility แต่ไม่อยากจ่ายค่า"Distributed Tax"

### เมื่อไหร่ควรเปลี่ยน? (The Tipping Point)
อย่าใช้ Microservices จนกว่า **"ความเจ็บปวดจากการรอคิว Deploy ใน Monolith จะมากกว่าความเจ็บปวดจากการจัดการ Microservices"**

วิศวกรที่ Segment ค้นพบว่าการแยก Service ย่อยเกินไป (140+ microservices สำหรับทีมขนาดกลาง) นำไปสู่"Microservice Hell" ที่ลด Productivity ลงอย่างมาก จนต้องตัดสินใจรวมกลับมาเป็น Monolith เพื่อความคล่องตัว [source: Segment Blog — Goodbye Microservices]

---

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. หากคุณมีทีมขนาด 5 คน และต้องการสร้าง MVP ที่ต้องออกฟีเจอร์ใหม่ทุกสัปดาห์ คุณควรใช้ท่าไหน?
> 2. ความแตกต่างระหว่าง **Microservices ** และ **SOA (Service-Oriented Architecture)** คืออะไร? (คำใบ้: ขนาดและความเป็นเจ้าของข้อมูล)
> 3. การทำ **Monorepo ** จำเป็นต้องใช้สถาปัตยกรรมแบบ **Monolith ** เสมอไปหรือไม่?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.**Monolith **(หรือ Modular Monolith) เพราะในระยะเริ่มต้น ความเร็วในการแก้ไขและทดสอบสำคัญกว่าความสามารถในการสเกลแยกส่วน
2.**Microservices ** เน้นความเป็นเจ้าของข้อมูลแบบเบ็ดเสร็จ (Database per Service) และเน้นความอิสระ ส่วน **SOA ** มักจะแชร์ Database ร่วมกันและมีความเป็นองค์กร (Enterprise) สูงกว่า
3.** ไม่จำเป็น **Monorepo เป็นเพียงวิธีเก็บโค้ด คุณสามารถรัน Microservices หลายร้อยตัวจาก Monorepo เดียวกันได้ (เหมือนที่ Google หรือ Uber ทำ)

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ระบบปัจจุบันของคุณคือ"Microservices จริงๆ" หรือเป็นแค่"Monolith ที่โดนหั่นเป็นชิ้นๆ แล้วคุยกันผ่าน Network"? ลองสำรวจดูว่าถ้าคุณต้องแก้ฟีเจอร์หนึ่ง คุณต้องแก้กี่เซอร์วิสและต้อง Deploy พร้อมกันกี่ตัว?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)
- [[Distributed/04-spof|SPOF: ความเสี่ยงในระบบกระจาย]]
- [[Distributed/02-dual-write|Dual Write: เมื่อข้อมูลกระจายอยู่หลายที่]]
- [[01-trade-off-articulation|Trade-off Articulation: การให้เหตุผลเชิงสถาปัตยกรรม]]
- [[09-load-balancer|Load Balancer: ประตูหน้าของ Microservices]]
