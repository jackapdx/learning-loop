---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [system-design, ai-ml, infrastructure]
prerequisites: []
---

# AI/ML Infrastructure (โครงสร้างพื้นฐานสำหรับระบบ AI ระดับสูง)

---

## 🎯 ปฐมนิเทศ (Orient)

ในปี 2026 คำถามอย่าง"ออกแบบ Serving Layer สำหรับ LLM" หรือ"ระบบ Recommendation แบบ Real-time" ได้กลายเป็น **บรรทัดฐาน (Standard)** สำหรับการสัมภาษณ์ตำแหน่ง Senior Engineer ไปแล้ว หากคุณยังติดอยู่กับความรู้เก่าๆ บทเรียนนี้จะพาคุณไปทำความรู้จักกับโลกของ **Semantic Caching**,**Continuous Batching** และการบริหารจัดการ **GPU Resources** ที่มีอยู่อย่างจำกัด

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️**สถานการณ์**:คุณต้องออกแบบระบบ Serving สำหรับ LLM 🧠 ที่ต้องตอบคำถามผู้ใช้ภายใน 2 วินาที และต้องรองรับ 1,000 requests/วินาที (RPS)
>**ข้อมูลทางเทคนิค**: > - GPU 1 ตัว ทำ Inference ได้ 1 ครั้งใช้เวลา ⏰ 500ms (นั่นคือ 1 GPU รับได้ 2 RPS)
> - คุณมีงบประมาณซื้อ GPU ได้เพียง 10 ตัวเท่านั้น
>
>**คำถาม**:GPU 10 ตัวรับโหลด 1,000 RPS ได้หรือไม่? หากไม่ได้ คุณจะใช้กลยุทธ์ทาง Engineering อะไรมาแก้ปัญหานี้โดยไม่ต้องซื้อ GPU เพิ่มมหาศาล?

**คำนวณและวางกลยุทธ์ในใจก่อน**— (ใบ้ให้: 10 GPUs x 2 RPS = 20 RPS... ขาดอีกเยอะ!)

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"ยังไงก็ไม่พอ ต้องซื้อ GPU เพิ่ม" | ⚠️ **ถูกในทางทฤษฎี แต่ผิดในเชิงธุรกิจ** GPU ราคาแพงมหาศาล (~$30,000 ต่อตัว) และมักจะขาดตลาด (Shortage) |
|"ใช้ Batching และ Semantic Caching" | ✅ **นี่คือคำตอบระดับ Senior!** คุณพยายามรีดประสิทธิภาพ (Efficiency) จากทรัพยากรที่มีอยู่ให้ถึงขีดสุดก่อนขอทรัพยากรเพิ่ม |**หัวใจสำคัญ**: AI 🧠 Infrastructure 🏗️ ไม่ใช่แค่เรื่องของการมี Hardware ที่แรง แต่คือเรื่องของการจัดการ **Workload Scheduling** ให้มีประสิทธิภาพสูงสุด

---

## 📖 คำอธิบาย (Explain)

### 3 ความจริงที่น่าเจ็บปวดของ AI Inference **Latency สูง:** GPU Inference ใช้เวลาหลักร้อยมิลลิวินาที ต่างจาก API ทั่วไปที่ใช้หลักสิบ

**Resource Scarcity:** GPU มีราคาแพงและจำกัด การใช้ 1 GPU ต่อ 1 User คือการฆ่าตัวตายทางการเงิน
**Sequential Nature:** การสร้างข้อความ (Token Generation) ต้องทำทีละตัว ทำให้ระบบดูช้าหากไม่ทำ Streaming

### สถาปัตยกรรม Serving ที่มีประสิทธิภาพ

```text
[Client] ───▶ [API Gateway / Rate Limit]
                     │
                     ▼
              [Semantic Cache] ───▶ (Hit: ตอบทันที ⚡)
                     │ (Miss)
                     ▼
              [Request Queue]
                     │
                     ▼
          [Batching & Model Serving] ───▶ [GPU Cluster]
```

### 4 เสาหลักของ AI Infra ที่ Senior ต้องแม่น

| กลยุทธ์ | วิธีการทำงาน | ผลลัพธ์ที่ได้ |
|:---|:---|:---|
|**Semantic Caching**| เก็บคำตอบของคำถามที่"ความหมายคล้ายกัน" (ใช้ Vector Search) | ลดโหลด GPU ได้มหาศาลสำหรับคำถามยอดนิยม |
|**Continuous Batching**| รวมหลาย Requests มาประมวลผลพร้อมกันใน GPU โดยไม่ต้องรอ Request อื่นเสร็จ | เพิ่ม Throughput ได้ 10-20 เท่า |
|**Request Queueing**| ใช้ Kafka หรือ Redis Streams จัดลำดับความสำคัญ | ป้องกันระบบล่ม (Self-preservation) เมื่อ Traffic พุ่งสูง |
|**GPU Time-slicing**| แบ่งส่วน GPU (MIG) ให้ใช้งานได้หลาย Workload พร้อมกัน | ลดค่าใช้จ่ายสำหรับ Model ขนาดเล็กหรือช่วงโหลดต่ำ |

---

## 🔬 ขยายความ (Extend)

### Vector Database vs. SQL: เมื่อไหร่ควรใช้?

| เลือก Vector DB เมื่อ... | เลือก SQL/PostgreSQL เมื่อ... |
|:---|:---|
| ค้นหาด้วย"ความหมาย" (Semantic Search) | ค้นหาด้วย ID, ชื่อ หรือ Keyword ตรงตัว |
| ทำระบบแนะนำสินค้า (Recommendation) | ข้อมูลมีโครงสร้างชัดเจนและต้องทำ Complex Joins |
| ทำ RAG (Retrieval-Augmented Generation) | ต้องการความถูกต้องของข้อมูลระดับ ACID 100% |

**กับดักที่พบบ่อย**: วิศวกรหลายคนพยายามยัดเยียด Vector DB เข้ามาในทุกโปรเจกต์เพราะความล้ำ (Hype) ทั้งที่จริงๆ แล้ว PostgreSQL พร้อมส่วนเสริม`pgvector` ก็เพียงพอสำหรับข้อมูลระดับหลายล้านแถวแล้ว

### การจัดการ GPU ใน Kubernetes (K8s)

ในการรันระบบ AI 🧠 บน Production คุณต้องรู้จักการตั้งค่า Resource Limits:

```yaml
resources:
  limits:
    nvidia.com/gpu: 1  # จอง GPU 1 ตัวให้คอนเทนเนอร์นี้
nodeSelector:
  accelerator: nvidia-a100 # เลือกเครื่องที่มี GPU รุ่นที่ต้องการ
```

*เทคนิค:* ใช้ **Taints และ Tolerations** เพื่อป้องกันไม่ให้ Service ทั่วไป (เช่น Web Server) มาแย่งใช้เครื่องที่มี GPU

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:** Batching ช่วยลดค่าใช้จ่ายได้อย่างไร?
ความแตกต่างระหว่าง Cache ปกติ (String Match) กับ Semantic Cache คืออะไร?
ในระบบที่มีงบจำกัด คุณจะเลือกทำสิ่งใดเป็นอันดับแรกระหว่าง ซื้อ GPU เพิ่ม หรือทำ Prompt Caching?

<details>
<summary>คลิกเพื่อดูคำตอบ</summary>

Batching ช่วยให้ GPU ประมวลผลข้อมูลหลายชุดได้ในการทำงาน (Clock Cycle) ครั้งเดียว ทำให้คุ้มค่าไฟและค่าเสื่อม Hardware
Cache ปกติต้องพิมพ์เหมือนกันเป๊ะถึงจะเจอ (Exact Match) แต่ Semantic Cache เข้าใจ"ความหมาย" (เช่น"สวัสดี" กับ"ทักทายครับ" จะได้คำตอบเดียวกัน)**Prompt Caching**(หรือ Semantic Cache) เพราะเป็นวิธีที่ลงทุนน้อยที่สุดแต่ลดโหลด GPU ได้เห็นผลชัดเจนที่สุด

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 หากวันพรุ่งนี้บริษัทต้องการเปลี่ยนจาก"Software Company" เป็น"AI 🧠-First Company" คุณมีองค์ความรู้พอที่จะวางรากฐานให้ระบบ AI 🧠 รันได้อย่างยั่งยืนและไม่ผลาญงบประมาณบริษัทจนเกินไปหรือไม่?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[03-cache-invalidation|Cache Invalidation ในโลกของ AI]]
- [[Distributed/04-spof|การป้องกัน Single Point of Failure ใน GPU Clusters]]
- [คู่มือการใช้ pgvector สำหรับ Senior Developers](../../Postgres/pgvector-guide.md)
