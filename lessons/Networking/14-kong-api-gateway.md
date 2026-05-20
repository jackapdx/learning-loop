---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [system-design, networking, api-gateway, microservices]
prerequisites: [networking/09-load-balancer, core/10-monolith-microservice-monorepo]
---

# API Gateway (Kong): ประตูหน้าของ Microservices

---

## 🎯 ปฐมนิเทศ (Orient)

เมื่อคุณเปลี่ยนจาก Monolith เป็น Microservices ปัญหาหนึ่งที่ตามมาทันทีคือ **"ความซ้ำซ้อนของงานส่วนกลาง"** เช่น ทุกเซอร์วิสต้องทำ Auth เอง, ทำ Rate Limiting เอง, และทำ Logging เอง

**API Gateway **(เช่น **Kong **) คือคำตอบในการรวบรวมงานส่วนกลาง (Cross-cutting Concerns) เหล่านี้ไว้ที่จุดเดียว เพื่อให้ทีมพัฒนาเซอร์วิสโฟกัสที่ Business Logic ได้เต็มที่ แต่การเอาทุกอย่างไปรวมไว้ที่ประตูหน้าก็มาพร้อมกับความเสี่ยงเรื่องคอขวด (Bottleneck) และความซับซ้อนในการจัดการ

---

## 🧪 ลองทำก่อน (Attempt)

> ** สถานการณ์:** คุณมี Microservices 20 ตัว และคุณตัดสินใจใช้ **Kong API Gateway ** เป็นด่านหน้า
> -** โจทย์:** คุณต้องการทำ **Rate Limiting ** เพื่อป้องกันไม่ให้ผู้ใช้คนเดียวส่ง Request ถี่เกินไปจนระบบล่ม
> -** พฤติกรรมของ Kong:**Kong สามารถเก็บข้อมูลการนับ (Counter) ไว้ได้ 3 ที่:`local` (ในหน่วยความจำของ Kong เอง),`redis`, และ`postgres`
>
> ** คำถาม:** หากคุณมี Kong รันอยู่ 5 Nodes (เพื่อทำ High Availability) และต้องการความแม่นยำในการนับ Request ของผู้ใช้มากที่สุด คุณควรเลือกเก็บ Counter ไว้ที่ไหน? และ"สิ่งที่ต้องแลก (Trade-off 🤝)" ของตัวเลือกนั้นคืออะไร?
>
> **✋ หยุดตรงนี้ก่อน **— อย่าเพิ่งตอบว่า Redis หรือ Postgres เพียงเพราะมันเป็น DB ลองนึกถึง Latency ที่จะเกิดขึ้นในทุกๆ Request ดู!

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"Local Memory" | ⚠️ ** เร็วที่สุดแต่ไม่แม่นยำ!** แต่ละ Node จะนับแยกกัน ถ้าผู้ใช้โดน LB กระจายไปครบ 5 Nodes เขาจะส่ง Request ได้มากกว่าที่กำหนดถึง 5 เท่า |
|"Postgres" | ❌ ** อันตราย!** ทุก Request ที่เข้ามาต้องไป Write/Read DB ที่เป็น Disk-based จะทำให้ Gateway ของคุณช้าลงมหาศาล และอาจทำ DB พังเสียเอง |
|"Redis" | ✅ ** นี่คือคำตอบของ Senior!**Redis ให้ความสมดุลระหว่างความเร็ว (In-memory) และความเป็นศูนย์กลาง (Global State) ทำให้ทุก Kong Node เห็นยอดรวมที่ตรงกัน โดยแลกมาด้วย Network Latency เล็กน้อยและต้องดูแล Redis เพิ่มอีกหนึ่งระบบ |

**ทำไมการให้เหตุผลแบบนี้สำคัญ?** เพราะ API Gateway คือจุดที่ทุก Request ต้องไหลผ่าน (The Critical Path) การตัดสินใจเลือกที่เก็บสถานะ (State Storage) จึงส่งผลกระทบต่อ Performance ของทั้งระบบโดยตรง

---

## 📖 คำอธิบาย (Explain)

### 1. API Gateway คืออะไร?

API Gateway ทำหน้าที่เป็น Reverse Proxy ที่อยู่หน้าสุดของระบบ คอยจัดการเรื่อง:
-**Authentication/Authorization:** เช็คว่าใครเป็นคนเรียก และมีสิทธิ์ไหม
-**Rate Limiting:** จำกัดจำนวนการเรียกใช้งาน
-**Request/Response Transformation:** แก้ไข Header หรือแปลง JSON
-**Service Discovery:** รู้ว่าต้องส่ง Request ต่อไปที่เซอร์วิสไหน (IP/Port อะไร)

### 2. ทำไมต้อง Kong?

Kong เป็น API Gateway ที่ได้รับความนิยมสูงสุดตัวหนึ่ง เพราะสร้างขึ้นบน **Nginx ** และ **OpenResty **(Lua) ทำให้มันเร็วมากและขยายความสามารถได้ด้วย Plugins
-**DB-less Mode (Declarative Config):** เก็บการตั้งค่าในไฟล์ YAML (เหมาะกับ GitOps/K8s)
-**DB Mode:** เก็บการตั้งค่าใน Postgres/Cassandra (เหมาะกับการเปลี่ยน Config ผ่าน API แบบ Real-time)

### 3. ตารางเปรียบเทียบกลยุทธ์ Rate Limiting ใน Gateway

| Strategy | Accuracy | Performance | Operational Cost |
|---|---|---|---|
|**Local **| ต่ำ (นับแยก Node) | สูงที่สุด (No Network) | ต่ำ |
|**Redis **| สูง (Shared State) | สูง (In-memory) | ปานกลาง (ต้องรัน Redis) |
|**Cluster (Postgres)**| สูงที่สุด | ต่ำมาก (Disk I/O) | สูง |

---

## 🔬 ขยายความ (Extend)

### Gateway vs. Sidecar (Service Mesh)

ในระบบขนาดใหญ่มหาศาล การมี Gateway ตัวเดียวอาจไม่พอ (Gateway becomes a Bottleneck)
-**API Gateway (North-South):** จัดการ Traffic จากภายนอกเข้ามาในระบบ เน้นความปลอดภัยและการจัดการลูกค้า
-**Service Mesh (East-West):** ใช้ Sidecar (เช่น Envoy) แปะติดไปกับทุกเซอร์วิส เพื่อจัดการการคุยกันเองภายในระบบ (เช่น mTLS, Retries, Circuit Breaking)

### ความเสี่ยง: The Fat Gateway Anti-pattern

กับดักที่ Senior ต้องระวังคือการใส่ Business Logic ลงไปใน Gateway (เช่น การ Join ข้อมูลจาก 2 เซอร์วิสใน Gateway)
-** ผลเสีย:** ทำให้ Gateway ซับซ้อน ทดสอบยาก และถ้าพังจะทำให้ทุกเซอร์วิสพังตามกันไปหมด
-** ทางแก้:**Gateway ควรทำหน้าที่เป็น"ท่อที่ฉลาด" เท่านั้น หากต้องทำ Logic ซับซ้อน ให้สร้าง **BFF (Backend For Frontend)** ขึ้นมาคั่นกลางแทน

---

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. หากคุณใช้ Kong ในโหมด DB-less คุณจะเปลี่ยนการตั้งค่า Rate Limiting แบบไม่ต้องรีสตาร์ทเครื่องได้อย่างไร?
> 2. ทำไมการทำ SSL Termination ที่ API Gateway ถึงช่วยลดภาระของ Microservices ได้?
> 3. ในระบบที่เน้น Low Latency สุดๆ (เช่น High-frequency Trading) คุณควรใช้ API Gateway หรือไม่?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1. ใช้การส่งสัญญาณผ่าน **Admin API ** หรือการทำ **Config Reload **(ใน K8s จะทำผ่าน Ingress Controller อัตโนมัติ)
2. เพราะ Gateway จะเป็นคนถอดรหัส HTTPS ให้เสร็จสรรพ แล้วส่งต่อให้เซอร์วิสด้านหลังเป็น HTTP ธรรมดา (ใน Network ปิดที่ปลอดภัย) ทำให้เซอร์วิสไม่ต้องเสีย CPU มาทำ Cryptography เอง
3.** ไม่ควร ** ทุก Layer ที่เพิ่มเข้ามาจะเพิ่ม Latency เสมอ ในระบบที่ต้องการความเร็วระดับ Microseconds ควรให้ Client คุยกับ Server โดยตรง หรือใช้ L4 Load Balancer ที่บางที่สุดเท่าที่จะเป็นไปได้

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ระบบของคุณมี"งานส่วนกลาง" ที่กระจายอยู่ตามเซอร์วิสต่างๆ มากเกินไปหรือเปล่า? การนำ API Gateway มาใช้จะช่วยลดความซ้ำซ้อนนั้นได้ หรือจะกลายเป็นการสร้างจุดที่อาจจะพัง (SPOF) เพิ่มขึ้นอีกหนึ่งจุดกันแน่?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[09-load-balancer|Load Balancer: L4 vs L7]]
- [[Distributed/04-spof|SPOF: เมื่อ Gateway กลายเป็นจุดตาย]]
- [[Distributed/11-distributed-rate-limiting|Distributed Rate Limiting: การควบคุมปริมาณ Request]]
- [[10-monolith-microservice-monorepo|Monolith vs Microservices]]
- [[01-trade-off-articulation|Trade-off Articulation: การให้เหตุผลเชิงสถาปัตยกรรม]]

> ** อ้างอิง:**
> - [Kong Documentation — What is an API Gateway?](https://docs.konghq.com/gateway/latest/introduction/)
> - [Nginx Blog — API Gateway vs Service Mesh](https://www.nginx.com/blog/what-is-an-api-gateway/)
> - [Microservices.io — API Gateway Pattern](https://microservices.io/patterns/apigateway.html)
