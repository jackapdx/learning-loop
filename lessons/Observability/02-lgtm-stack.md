---
contentType: learning-loop
level: senior
status: polished
tags: [observability, grafana, prometheus, loki, tempo, lgtm]
---

# The LGTM Stack: มองทะลุปรุโปร่งด้วย Metrics, Logs และ Traces

---

## ปฐมนิเทศ (Orient)

ในระบบ Distributed Systems เมื่อเกิดปัญหา คุณมักจะเริ่มจากคำถาม: *"มันเกิดอะไรขึ้น?"* (Metrics), *"มันเกิดที่ไหน?"* (Logs) และ *"ทำไมมันถึงเกิด?"* (Traces) หากเครื่องมือทั้ง 3 อย่างนี้แยกจากกัน คุณจะเสียเวลา"กระโดดข้ามหน้าจอ" จนสายเกินแก้ บทเรียนนี้จะพาไปรู้จักกับ **LGTM Stack ** มาตรฐานใหม่ที่ทำให้ทั้ง 3 เสาหลักของ Observability คุยภาษาเดียวกัน

---

## ลองทำก่อน (Attempt)

> ✍️ ** สถานการณ์:** ระบบ Checkout ของคุณเกิด Error พุ่งสูงขึ้น (Spike) ใน Grafana 
> - คุณเห็นกราฟสีแดงใน **Prometheus **(Metrics)
> - คุณต้องการรู้ว่า Request ที่พังนั้น"พ่น Error อะไรออกมา" และ"มันไปติดที่เซอร์วิสตัวไหน" (เช่น ติดที่ Payment หรือ Inventory?)
>
> ** คำถาม:** หากคุณต้องการไล่ลำดับการ Debug ที่เร็วที่สุด คุณควรใช้เครื่องมือใดในเครือ LGTM ต่อจาก Prometheus?
> 1. ไปดู **Loki **(Logs) เพื่อหา Error Message
> 2. ไปดู **Tempo **(Traces) เพื่อดูเส้นทางการไหลของ Request
> 3. ดูอันไหนก่อนก็ได้ เพราะมันไม่เกี่ยวข้องกัน
>
> ** หยุดคิดสักครู่ **— (คำใบ้: การรู้ว่า 'พังเพราะอะไร' กับ 'พังที่ไหนในเขาวงกต Microservices' อะไรควรมาก่อนกัน?)

---

## ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"ดู Logs (Loki) ก่อน" | ⚠️ ** เกือบใช่!** แต่ถ้ามี Microservices เป็นสิบตัว คุณจะหา Log ของ Request นั้นยากมากถ้าไม่มี Trace ID นำทาง |
|"ดู Traces (Tempo) ก่อน" | ✅ ** นี่คือระดับ Senior!**Traces จะบอกคุณทันทีว่า"Service A เรียก Service B แล้วพังที่นั่น" และคุณสามารถกดดู Logs ที่จุดนั้นได้ทันที |
|"ดูอันไหนก็ได้" | ❌ ** ผิดมหันต์!** การเชื่อมโยง (Correlation) ระหว่างเครื่องมือคือหัวใจของความเร็วในการแก้ปัญหา (MTTR) |

**ทำไมคนส่วนใหญ่ถึงพลาด?** เพราะเรามักชินกับการขุด Log แมนนวล แต่ในยุค Microservices การมี **Tracing ** คือ"แผนที่" ที่จะพาเราไปหา Log ที่ถูกต้องในกองขยะข้อมูล

---

## คำอธิบาย (Explain)

💡**LGTM Stack ** คือการรวมตัวของ 4 เครื่องมือจาก Grafana Labs:

### 1. (L)oki — Logs (Like Prometheus, but for Logs)
-**Concept:** เน้นการเก็บ Metadata (Labels) แทนที่จะเก็บ Full-text index ของ Log ทุกตัว
-** ข้อดี:** ประหยัดที่เก็บข้อมูล 📦 (Cost-efficient) และรวดเร็วมากเมื่อใช้ค้นหาคู่กับ Metrics

### 2. (G)rafana — Visualization (The Single Pane of Glass)
-**Concept:** ตัวกลางที่ใช้ดึงข้อมูลจากทุกแหล่งมาโชว์ในที่เดียว
-** หน้าที่:** สร้าง Dashboard และทำ **Data Correlation **(เช่น คลิกจุดบนกราฟ Metrics แล้วเด้งไปดู Traces ได้เลย)

### 3. (T)empo — Traces (Distributed Tracing)
-**Concept:** บันทึกเส้นทางการเดินทางของ 1 Request ตั้งแต่ต้นจนจบข้ามทุกเซอร์วิส
-** หน้าที่:** หาจุดที่ Latency สูง หรือจุดที่เกิด Error ในสายพาน Microservices

### 4. (M)imir / Prometheus — Metrics
-**Concept:** เก็บข้อมูลตัวเลขเชิงปริมาณ (เช่น CPU, Latency, Error Rate)
-** หน้าที่:** ตรวจจับอาการผิดปกติและส่ง Alert

---

## ขยายความ (Extend)

### ยุทธศาสตร์ Senior: Correlation is King
สิ่งที่จะแยกคุณออกจาก Junior คือการเซ็ต **Correlation ** ระหว่างเครื่องมือ:

**Exemplars:** เทคนิคที่ทำให้ Prometheus แอบแนบ"Trace ID" ไว้ในจุดบนกราฟ ทำให้คุณคลิกที่จุด Peak ของ Latency แล้วเปิดดู Trace นั้นได้ทันที
**Derived Fields:** การตั้งค่าใน Loki ให้สกัด Trace ID ออกจาก Log และสร้างลิงก์กดไปดูใน Tempo ได้อัตโนมัติ

### 3 Pillars of Observability
| เสาหลัก | เครื่องมือ | ถามว่า... |
|:---|:---:|:---|
|**Metrics **| Prometheus |"ตอนนี้ระบบเราพังไหม? (Is it broken?)" |
|**Traces **| Tempo |"มันพังที่จุดไหนใน Microservices? (Where is it broken?)" |
|**Logs **| Loki |"มันพ่น Error อะไรออกมา? (What happened exactly?)" |

---

## จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:**
"Tracing" มีความสำคัญอย่างไรในระบบ Microservices ที่มีการเรียกต่อกันหลายทอด?
ทำไม Loki ถึงถูกเรียกว่า"Prometheus for Logs"?
หากคุณเห็น Latency สูงในกราฟ Metrics คุณจะใช้เครื่องมือใดหาว่า Service ไหนทำงานช้า?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>

ช่วยให้เราเห็น **End-to-end Request Flow ** และรู้ว่าคอขวดหรือ Error เกิดขึ้นที่เซอร์วิสใดกันแน่ (Visibility across boundaries)
เพราะใช้ **Label-based indexing ** เหมือนกัน ทำให้เราใช้ Label ชุดเดิม (เช่น`app=payment`) ค้นหาได้ทั้ง Metrics และ Logs ใน Grafana
**Tempo (Traces)** เพื่อดูสัดส่วนเวลาที่ใช้ในแต่ละ"Span" (แต่ละขั้นตอนการเรียก)

</details>

---

## สะท้อนคิด (Reflect)

> 💭 ในทีมของคุณ ปัจจุบันใช้เวลาเฉลี่ยเท่าไหร่ (MTTR) ในการหาต้นเหตุของบั๊กที่เกิดขึ้นข้ามเซอร์วิส? หากคุณยังต้องก๊อปปี้ ID จาก Log ไปค้นหาในเครื่องมืออื่นทีละอัน นั่นคือเวลาที่เสียไปโดยเปล่าประโยชน์ การรวม Stack เข้าด้วยกันไม่ใช่แค่เรื่องเทคโนโลยี แต่คือเรื่องของการซื้อเวลาคืนมาให้กับวิศวกร

---

## หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[01-monitoring-levels|Monitoring Levels: เลือกวัด Metrics ให้ถูกตัว]]
- [[../Networking/03-grpc-vs-rest|gRPC & Tracing: การส่ง Trace ID ผ่าน Header]]
- [Grafana Labs: The LGTM Stack Overview](https://grafana.com/oss/)
