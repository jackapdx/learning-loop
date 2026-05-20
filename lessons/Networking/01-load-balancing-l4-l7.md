---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [networking, load-balancing, system-design]
---

# Load Balancing (L4 vs L7): การจัดระเบียบ Traffic มหาศาล

---

## 🎯 ปฐมนิเทศ (Orient)

ในระบบที่มีผู้ใช้นับล้าน Load Balancer ไม่ได้ทำหน้าที่แค่"สลับกันส่ง Request" (Round Robin) แต่คือสมองส่วนหน้าที่จะตัดสินใจว่า Request นี้ควรไปที่ไหนเพื่อให้ระบบทำงานได้เร็วที่สุดและไม่พัง การเลือกระหว่าง **Layer 4**และ**Layer 7**คือจุดตัดสินว่าคุณจะออกแบบระบบที่เน้น"ความเร็วดิบ" หรือ"ความฉลาดในการจัดการ" บทเรียนนี้จะสอนให้คุณเลือกใช้ตามสถานการณ์จริง

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️**สถานการณ์:**คุณกำลังออกแบบระบบ E-commerce ขนาดใหญ่ที่มี 3 บริการหลัก:
> 1.**Order Service**(เน้นความปลอดภัย)
> 2.**Product Catalog**(เน้นการอ่านข้อมูลมหาศาล)
> 3.**Image/Video Service**(ไฟล์ขนาดใหญ่)
>
> **โจทย์:** คุณต้องการให้ Traffic ที่ขอรูปภาพ (`/images/*`) วิ่งไปหาเซิร์ฟเวอร์ชุดที่ปรับแต่งมาเพื่อส่งไฟล์โดยเฉพาะ ส่วน Request อื่นๆ ให้กระจายตามความเหมาะสม
>
> **คำถาม:**คุณควรเลือกใช้ Load Balancer ระดับใด (L4 หรือ L7) เพื่อทำสิ่งนี้? และเพราะอะไร?
>
>**หยุดคิดสักครู่**— (คำใบ้: ลองนึกดูว่า Load Balancer ต้อง"แอบดู" อะไรใน Request บ้างถึงจะรู้ว่าเป็นไฟล์รูปภาพ)

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"Layer 4 (Transport)" | ❌ **เป็นไปไม่ได้!**L4 เห็นแค่ IP และ Port มันไม่รู้ว่า URL คืออะไร จึงไม่สามารถแยก`/images/*` ออกจาก`/api/*` ได้ |
|"Layer 7 (Application)" | ✅ **นี่คือคำตอบ!**L7 สามารถอ่าน HTTP Headers, URL Path และ Cookies ได้ ทำให้ทำ Content-based Routing ได้แม่นยำ |
|"ใช้อันไหนก็ได้" | ⚠️ **ไม่จริง!**แต่ละตัวมี Trade-off 🤝 เรื่อง Latency และทรัพยากรที่ใช้ (CPU/Memory) ที่ต่างกันอย่างสิ้นเชิง |**ทำไมคนส่วนใหญ่ถึงพลาด?**เพราะเรามักคิดว่า Load Balancer ทุกตัวทำงานเหมือนกัน แต่ความจริงคือ L4 ทำงานที่ระดับ"ท่อ" (TCP/UDP) ส่วน L7 ทำงานที่ระดับ"เนื้อความ" (HTTP/HTTPS)

---

### คำอธิบาย (Explain)

การเลือกประเภทของ Load Balancer ขึ้นอยู่กับว่าคุณต้องการ"ความเร็ว" (L4) หรือ"ความฉลาด" (L7) ในการจัดการ Traffic [source: NGINX Documentation — Layer 4 and Layer 7 Load Balancing]

### 1. Layer 4 Load Balancing (Transport Layer)

ทำงานที่ระดับโปรโตคอล TCP/UDP:
-**มองเห็นอะไร:**Source IP, Destination IP, Port
-**ข้อดี:** **เร็วมาก (Low Latency)**เพราะไม่ต้องแกะ Package HTTP มาอ่าน ใช้ทรัพยากรน้อย
-**ข้อเสีย:**ไม่มีความฉลาด (Content-blind) ทำได้แค่กระจายโหลดตาม IP/Port เท่านั้น

### 2. Layer 7 Load Balancing (Application Layer)

ทำงานที่ระดับโปรโตคอล HTTP/HTTPS:
-**มองเห็นอะไร:**URL Path, Headers, Cookies, Query Parameters
-**ข้อดี:** **ฉลาดมาก (Content-aware)**ทำ Path-based routing, Header-based routing หรือ Session Persistence (Sticky Sessions) ได้
-**ข้อเสีย:**ช้ากว่า L4 เล็กน้อย (เพราะต้องแกะอ่านข้อมูล) และใช้ CPU/Memory ของ LB มากกว่า

### ตารางสรุปความต่าง

| คุณสมบัติ | Layer 4 (L4) | Layer 7 (L7) |
|:---|:---:|:---:|
|**ระดับการมองเห็น**| IP / Port | HTTP Headers / URL / Cookies |
|**ความเร็ว**| สูงที่สุด | สูง (แต่ช้ากว่า L4) |
|**ความฉลาด**| ต่ำ (Round Robin / Least Conn) | สูง (Path-based / Cookie-based) |
|**ความซับซ้อน**| ต่ำ | สูง |

---

## 🔬 ขยายความ (Extend)

### เมื่อไหร่ควรใช้ L4 vs L7?

**ใช้ Layer 4 เมื่อ:**- ต้องการความเร็วสูงสุด (High Throughput) เช่น ระบบฐานข้อมูลหรือระบบ Streaming สด
    - แอปพลิเคชันไม่ได้ใช้ HTTP (เช่น ใช้โปรโตคอลของตัวเอง)**ใช้ Layer 7 เมื่อ:**- ทำ Microservices โดยมีจุดรับ Traffic เดียว (API Gateway)
    - ต้องการทำ A/B Testing หรือ Canary Deployment โดยแยกตาม User Header
    - ต้องการจัดการ SSL/TLS Offloading (ให้ LB เป็นคนถอดรหัส HTTPS แทน Server)

### เทคนิค Senior: L4 + L7 Hybrid

ในระบบขนาดใหญ่ เรามักใช้ทั้งสองตัวทำงานร่วมกัน:

```text
[Internet] 
    │
    ▼
[L4 Load Balancer] (กระจายโหลดระดับภูมิภาค / IP)
    │
    ▼
[L7 Load Balancer] (กระจายโหลดตาม URL / Microservices)
    │
    ▼
[Application Servers]
```

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:**หากต้องการให้ User ที่ล็อกอินแล้ว วิ่งไปหาเซิร์ฟเวอร์เครื่องเดิมเสมอ (Sticky Session) โดยใช้ Session Cookie คุณต้องใช้ LB เลเยอร์ไหน?
ระหว่าง L4 และ L7 ตัวไหนมีโอกาสเป็น"คอขวด" (Bottleneck) เรื่อง CPU มากกว่ากัน?
ทำไม L4 ถึงเร็วกว่า L7?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>**Layer 7**เพราะต้องอ่านค่าจาก Cookies**Layer 7**เพราะต้องใช้พลังในการ"ถอดรหัส" (Decrypt HTTPS) และ"วิเคราะห์" เนื้อความ HTTP
เพราะ L4**ไม่ต้องดูเนื้อหาข้างใน**(Data Payload) แค่ดูจ่าหน้าซอง (IP/Port) แล้วส่งต่อทันที

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ในระบบที่คุณใช้อยู่ มีความจำเป็นต้องใช้ความฉลาดของ Layer 7 หรือไม่? หรือคุณกำลังจ่ายค่า Latency ให้กับความฉลาดที่คุณไม่ได้ใช้งาน? การเลือก Load Balancer ที่ถูกต้องช่วยประหยัดทั้งค่าใช้จ่ายและเวลาในการแก้ปัญหา Performance ในระยะยาว

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[02-cdn-edge-computing|CDN & Edge: การกระจายโหลดในระดับโลก]]
- [[../Distributed/04-spof|SPOF: เมื่อ Load Balancer กลายเป็นจุดอ่อนเสียเอง]]
- [System Design Primer: Load Balancing Section](https://github.com/donnemartin/system-design-primer#load-balancer)
