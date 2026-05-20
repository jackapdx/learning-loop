---
contentType: learning-loop
level: senior
status: polished
tags: [system-design, networking, load-balancing, high-availability]
prerequisites: []
---

# Load Balancer (ตัวจัดสมดุลภาระงาน)

---

## 🎯 ปฐมนิเทศ (Orient)

เมื่อระบบของคุณเติบโตจนเซิร์ฟเวอร์เครื่องเดียวรับมือไม่ไหว (Vertical Scaling ถึงขีดจำกัด) ทางออกเดียวคือการเพิ่มเซิร์ฟเวอร์หลายเครื่องมาช่วยกันทำงาน (Horizontal Scaling) แต่ปัญหาคือ **"จะส่งผู้ใช้ไปหาเซิร์ฟเวอร์เครื่องไหนดี?"**

Load Balancer ไม่ได้เป็นเพียง"คนสลับคิว" แต่เป็นจุดยุทธศาสตร์ที่ตัดสินความรวดเร็ว (Latency) และความน่าเชื่อถือ (Availability) ของระบบ หากเลือกกลยุทธ์ผิด ระบบอาจจะพังเพราะเซิร์ฟเวอร์บางเครื่องโหลดหนักเกินไป ในขณะที่บางเครื่องว่างงาน

---

## 🧪 ลองทำก่อน (Attempt)

> ** สถานการณ์:** คุณกำลังออกแบบระบบประมวลผลวิดีโอที่มีเซิร์ฟเวอร์ใน Pool 3 เครื่องที่มีสเปกต่างกัน:
> -**Server A:**High-spec (32 Cores, 128GB RAM)
> -**Server B:**Mid-spec (8 Cores, 32GB RAM)
> -**Server C:**Mid-spec (8 Cores, 32GB RAM)
>
> ** งานที่เข้ามา:** มีความหนักไม่เท่ากัน บางงานใช้เวลา 1 วินาที บางงานใช้เวลา 5 นาที (Long-running tasks)
>
> ** คำถาม:** หากตอนนี้ **Server A มี 5 connections **(งานหนัก),**Server B มี 2 connections **(งานเบา), และ **Server C มี 2 connections **(งานเบา) — คุณจะเลือกใช้อัลกอริทึมใดเพื่อให้ระบบมี Throughput สูงที่สุดและไม่เกิดปัญหาคอขวด?
>
> **✋ หยุดตรงนี้ก่อน **— อย่าเพิ่งรีบตอบ"Least Connections" เพราะมันอาจจะเป็นกับดัก!

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"Least Connections (ส่งไป B หรือ C)" | ⚠️ ** เกือบถูก แต่พลาดจุดสำคัญ!** แม้ B/C จะมีคนต่อน้อยกว่า (2 vs 5) แต่ Server A มีพลังมากกว่าถึง 4 เท่า การส่งงานใหม่ไปที่ B/C อาจทำให้เครื่องสเปกต่ำตายได้ในขณะที่เครื่องแรงยังว่างงานมหาศาล |
|"Weighted Least Connections" | ✅ ** นี่คือ Senior Thinking!** คุณมองเห็นว่า"จำนวนการเชื่อมต่อ" ต้องถูกคำนวณร่วมกับ"ความสามารถของเซิร์ฟเวอร์" (Weight) อัลกอริทึมนี้จะส่งงานให้ A มากกว่าแม้จะมี connection เยอะกว่า เพราะ A จัดการได้เร็วกว่ามาก |
|"Round Robin" | ❌ ** อันตรายมาก!** ในระบบที่เครื่องแรงไม่เท่ากันและงานหนักไม่เท่ากัน Round Robin คือสูตรสำเร็จของการทำระบบพัง (Cascading Failure) |

**ทำไมการให้เหตุผลแบบนี้สำคัญ?** เพราะในโลกความเป็นจริง เซิร์ฟเวอร์ใน Cloud มักมีประสิทธิภาพไม่เท่ากัน (เช่น ปัญหา CPU Steal หรือสเปกต่างกัน) และงานแต่ละชิ้นก็ใช้ทรัพยากรต่างกัน Senior Engineer จะไม่เชื่อแค่ตัวเลข"จำนวน" แต่จะดู"สัดส่วนภาระงานต่อขีดความสามารถ" (Capacity-to-Load Ratio)

---

## 📖 คำอธิบาย (Explain)

### Load Balancer คืออะไร?
Load Balancer (LB) คืออุปกรณ์หรือซอฟต์แวร์ที่ทำหน้าที่เป็น"ด่านหน้า" คอยกระจาย Traffic ที่เข้ามาไปยังกลุ่มของเซิร์ฟเวอร์ (Server Pool) เพื่อให้มั่นใจว่าไม่มีเครื่องใดเครื่องหนึ่งรับภาระหนักเกินไป และระบบยังคงทำงานได้แม้มีบางเครื่องเสีย (High Availability)

### 1. อัลกอริทึมการกระจายโหลด (Load Balancing Algorithms)

แบ่งเป็น 2 ประเภทหลัก:

####** แบบคงที่ (Static Algorithms)**— ไม่สนสถานะปัจจุบันของเซิร์ฟเวอร์
-**Round Robin:** วนคิวเรียงกันไป (A -> B -> C -> A...) เหมาะกับงานที่หนักเท่าๆ กัน
-**Weighted Round Robin:** เหมือน Round Robin แต่กำหนด"น้ำหนัก" ให้เครื่องที่แรงกว่ารับงานเยอะกว่า
-**IP Hash:** ใช้ IP ของ User มาหาค่า Hash เพื่อส่งไปหาเซิร์ฟเวอร์เครื่องเดิมเสมอ (เหมาะกับระบบที่มี Session)

####** แบบแปรผัน (Dynamic Algorithms)**— ตัดสินใจจากข้อมูล Real-time
-**Least Connections:** ส่งไปให้เครื่องที่มีการเชื่อมต่อค้างอยู่น้อยที่สุด (เหมาะกับงานที่ใช้เวลานานต่างกัน)
-**Least Response Time:** ส่งไปให้เครื่องที่ตอบสนองเร็วที่สุดในขณะนั้น
-**Resource-based:** เช็ค CPU/RAM ของเซิร์ฟเวอร์ก่อนส่งงาน (ใช้ทรัพยากรที่ LB สูงขึ้น)

### 2. การตรวจสอบสถานะ (Health Checks)
LB ที่ดีต้อง"ฉลาดพอที่จะรู้ว่าใครตาย" ผ่านการทำ Health Checks:
-**Active Health Check:**LB ส่งคำขอ (เช่น HTTP GET /health) ไปหาเซิร์ฟเวอร์เป็นระยะ
-**Passive Health Check:**LB สังเกตจาก Traffic จริง ถ้าเซิร์ฟเวอร์เริ่มตอบกลับด้วย Error 5xx ถี่ๆ จะหยุดส่งงานให้ชั่วคราว

---

## 🔬 ขยายความ (Extend)

### ยุทธศาสตร์การติดตั้ง (Deployment Strategies)

| รูปแบบ | ตัวอย่าง | ข้อดี | Trade-off 🤝 |
|---|---|---|---|
|**Software-based **| Nginx, HAProxy | ยืดหยุ่น, ราคาถูก, ลงใน Cloud ได้ง่าย | กินทรัพยากร CPU ของเครื่องที่รัน |
|**Hardware-based **| F5 Big-IP | ประสิทธิภาพสูงมาก (ASIC chips) | ราคาแพงมาก, ปรับแต่งยาก |
|**Cloud-native **| AWS ALB/NLB | Scale อัตโนมัติ, ดูแลง่าย (Managed) | ติดกับ Vendor (Vendor Lock-in) |

### Sticky Sessions (Session Persistence)
บางครั้งเราต้องการให้ผู้ใช้คนเดิม วิ่งไปหาเซิร์ฟเวอร์เครื่องเดิมเสมอ (เช่น เมื่อเก็บข้อมูลตะกร้าสินค้าไว้ใน Memory ของเครื่องนั้น)
-** ข้อดี:** ง่ายต่อการเขียนโปรแกรม
-** สิ่งที่ต้องแลก:** หากเซิร์ฟเวอร์เครื่องนั้นตาย ผู้ใช้จะหลุดทันที และอาจเกิดปัญหา"Load Imbalance" ถ้าผู้ใช้ที่ใช้งานหนัก (Power Users) ไปกระจุกตัวอยู่เครื่องเดียวกัน

### High Availability สำหรับ Load Balancer
ถ้า Load Balancer มีตัวเดียวและมันพังล่ะ? (Single Point of Failure - SPOF)
-**Active-Passive:** มี LB ตัวสำรองรออยู่ ถ้าตัวหลักพัง ตัวสำรองจะเสียบแทนทันที
-**Active-Active:** ใช้ LB หลายตัวทำงานพร้อมกัน กระจายโหลดด้วย DNS (Round Robin DNS)

---

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. หากคุณกำลังออกแบบระบบ **Database Read Replicas ** คุณจะใช้อัลกอริทึมใดระหว่าง Round Robin และ Least Connections? เพราะอะไร?
> 2. ความแตกต่างที่สำคัญที่สุดระหว่าง **Health Check ** และ **Circuit Breaker ** คืออะไร? (คำใบ้: ใครเป็นคนตัดสินใจตัดการเชื่อมต่อ?)
> 3. ทำไมระบบขนาดใหญ่มักไม่ใช้ Sticky Sessions?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.**Least Connections ** มักจะดีกว่า เพราะ Query ใน Database มีความหนักไม่เท่ากัน (เช่น SELECT 1 row vs SELECT 1 million rows)
2.**Health Check ** ทำโดยตัวกลาง (LB) เพื่อ"คัดเซิร์ฟเวอร์ออก" ส่วน **Circuit Breaker ** มักทำโดยฝั่ง Client/Service เพื่อ"หยุดเรียก" เพื่อป้องกันระบบล่มแบบ Cascading Failure
3. เพราะมันทำให้การ **Scale Up/Down ** และการทำ **Zero Downtime Deployment ** ยากขึ้นมาก (ต้องรอ User ออกจากเครื่องก่อน) ระบบสมัยใหม่จึงนิยมเก็บ Session ไว้ในที่ส่วนกลาง เช่น Redis

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ลองกลับไปดูระบบที่คุณกำลังพัฒนา: Load Balancer ของคุณใช้อัลกอริทึมอะไรอยู่? มันเป็นค่า Default หรือเปล่า? และมันเหมาะสมกับพฤติกรรมของ Request จริงๆ หรือไม่? 

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)
- [[Networking/01-load-balancing-l4-l7|Load Balancing (L4 vs L7)]]
- [[Distributed/04-spof|SPOF: จุดอ่อนที่ต้องกำจัด]]
- [[Distributed/01-self-recovery|Resilience & Self-Recovery]]
- [[Distributed/11-distributed-rate-limiting|Distributed Rate Limiting: การควบคุมปริมาณ Request]]
- [[../Postgres/06-connection-pooling-replicas|Connection Pooling & Replicas]]

> ** อ้างอิง:**
> - [Nginx Docs — Load Balancing Algorithms](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/#algorithms)
> - [AWS Documentation — What is an Elastic Load Balancer?](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/what-is-load-balancing.html)
> - [Google Cloud — Load Balancing Overview](https://cloud.google.com/load-balancing/docs/load-balancing-overview)
