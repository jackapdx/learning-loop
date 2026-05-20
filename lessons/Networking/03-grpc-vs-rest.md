---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [networking, protocols, microservices, system-design]
---

# gRPC vs REST: การเลือกภาษาที่ใช้คุยกันใน Microservices

---

## 🎯 ปฐมนิเทศ (Orient)

ในยุค Microservices การที่เซอร์วิสคุยกันเอง (Internal Communication) คือหัวใจสำคัญ หากคุณยังใช้ **REST (JSON)** คุยกันทุกที่เหมือนที่คุยกับ Browser คุณอาจจะกำลัง"จ่ายแพงเกินไป" ทั้งในแง่ของความเร็วและทรัพยากรเครื่อง บทเรียนนี้จะพาไปรู้จักกับ **gRPC ** ผู้ท้าชิงที่ถูกสร้างมาเพื่อทำให้การคุยกันระหว่างเซิร์ฟเวอร์รวดเร็วและมีระเบียบที่สุด

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️ ** สถานการณ์:** คุณกำลังออกแบบระบบ"Payment Gateway" ที่มี Microservices ภายในคุยกันอย่างหนัก (High Volume)
> -**Order Service ** ต้องเรียก **Payment Service ** และ **Inventory Service ** ทุกๆ Request
> - ความเร็ว (Latency) คือสิ่งสำคัญที่สุด และคุณต้องการลดขนาดข้อมูลที่ส่งไปมา (Payload) ให้เหลือน้อยที่สุด
>
> ** คำถาม:** ระหว่างการใช้ **REST (JSON over HTTP/1.1)** และ **gRPC (Protobuf over HTTP/2)** คุณจะเลือกตัวไหนสำหรับ"Internal Communication" นี้? และเพราะอะไร?
>
> ** หยุดคิดสักครู่ **— (คำใบ้: JSON เป็นข้อความ (Text) ที่คนอ่านออก แต่เซิร์ฟเวอร์ต้องเสียเวลาถอดรหัส... มีอะไรที่ 'เบา' กว่าข้อความไหม?)

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"REST (JSON)" | ⚠️ ** ใช้ได้ แต่ไม่ดีที่สุด!**JSON มีขนาดใหญ่เพราะส่งชื่อ Field ไปด้วยทุกครั้ง (เช่น`"order_id": 123`) และการถอดรหัส Text ทำได้ช้า ⚡ |
|"gRPC (HTTP/2)" | ✅ ** นี่คือคำตอบ!**gRPC ใช้ Binary Format (Protobuf) ที่เล็กและเร็วกว่ามาก และใช้ HTTP/2 ที่รองรับการส่งข้อมูลหลายสายพร้อมกัน (Multiplexing) |
|"ใช้ GraphQL" | ❌ ** ผิดจุดประสงค์!**GraphQL เหมาะกับการคุยกับ Frontend (Client-Server) เพื่อลดการดึงข้อมูลเกินจำเป็น แต่ไม่นิยมใช้คุยกันเองภายใน Microservices |

**ทำไมคนส่วนใหญ่ถึงพลาด?** เพราะเราคุ้นเคยกับ REST จนลืมไปว่า"คนอ่านออก" (Human Readable) ไม่ได้แปลว่า"เซิร์ฟเวอร์ประมวลผลเร็ว"

---

### คำอธิบาย (Explain)

ความแตกต่างระหว่าง gRPC และ REST ไม่ได้อยู่ที่แค่ความเร็ว แต่คือการเปลี่ยนจากโมเดล"ข้อความ" (JSON) ไปสู่โมเดล"สัญญา" (Protobuf) ที่เคร่งครัดและมีประสิทธิภาพสูง [source: Microsoft Documentation — gRPC services vs. HTTP APIs]

### 1. REST (Representational State Transfer)

-**Format:** ใช้ JSON (Text-based)
-**Protocol:** ส่วนใหญ่ใช้ HTTP/1.1
-** ข้อดี:** เข้าใจง่าย (คนอ่านออก), ทุกภาษารองรับ, Tooling เยอะมาก (Postman, Browser)
-** ข้อเสีย:** ข้อมูลใหญ่ (Payload overhead), ช้ากว่าในการ Serialize/Deserialize, ไม่มีระบบบังคับ Schema (ทำให้บั๊กเกิดง่ายตอนแก้ API)

### 2. gRPC (Google Remote Procedure Call)
-**Format:** ใช้ **Protocol Buffers (Protobuf)** ซึ่งเป็น Binary
-**Protocol:** บังคับใช้ **HTTP/2 ** เท่านั้น
-** ข้อดี:** **เร็วมาก (Performance)**, ข้อมูลเล็ก (Compact), มี **Strong Typing **(สร้างโค้ดให้โดยอัตโนมัติจากไฟล์`.proto`), รองรับ Streaming แบบสองทาง
-** ข้อเสีย:** คนอ่านไม่ออก (ต้องมี Tool พิเศษ), ต้องใช้ HTTP/2 (Load Balancer เก่าๆ อาจไม่รองรับ), การติดตั้งซับซ้อนกว่า REST

### ตารางเปรียบเทียบ

| คุณสมบัติ | REST | gRPC |
|:---|:---:|:---:|
|** รูปแบบข้อมูล **| JSON (Text) | Protobuf (Binary) |
|** ความเร็ว **| ปานกลาง | สูงมาก |
|**Schema **| มักจะไม่มี (หรือใช้ OpenAPI/Swagger) | บังคับ (ไฟล์ .proto) |
|** การใช้งาน **| Client-Server (Web, Mobile 📱) |**Internal Microservices ** |

---

## 🔬 ขยายความ (Extend)

### ทำไม Protobuf ถึงเร็วกว่า JSON?
JSON ส่งชื่อ Field ไปทุกครั้ง:
```json
{"user_id": 123,"name":"John"}
```
Protobuf ส่งแค่ตัวเลขลำดับ (Field Number) และข้อมูล:
```text
1: 123, 2:"John"  (ในรูปแบบ Binary ที่คนอ่านไม่ออก)
```
*ผลลัพธ์:* ขนาดเล็กลง 3-10 เท่า และ CPU ถอดรหัสได้เร็วกว่ามาก

### HTTP/2: ท่อส่งข้อมูลยุคใหม่
gRPC ได้อานิสงส์จาก HTTP/2:
- **Multiplexing:** ส่งหลาย Request/Response ในสายเดียว (TCP) พร้อมกัน ไม่ต้องรอคิว (Head-of-line blocking)
-**Server Push 📱:** เซิร์ฟเวอร์ส่งข้อมูลหาไคลเอนต์ได้โดยไม่ต้องรอให้ขอ
-**Header Compression:** บีบอัดข้อมูลส่วนหัว (Header) ให้เล็กลง

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:**
หากคุณต้องทำ Public API ให้คนอื่นทั่วโลกมาเชื่อมต่อ คุณควรเลือกใช้ตัวไหน?
"Strong Typing" ใน gRPC มีประโยชน์อย่างไรต่อทีม Developer?
ทำไม gRPC ถึงไม่เหมาะกับการเรียกจาก Browser โดยตรง (Directly from JS)?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>

**REST ** เพราะเข้าถึงง่ายที่สุดและนักพัฒนาทุกคนรู้จัก ไม่ต้องติดตั้งเครื่องมือพิเศษ
ช่วยให้ ** ทั้งสองฝั่ง (Client/Server) มีความเข้าใจตรงกันเสมอ ** ผ่านไฟล์`.proto` หากมีการแก้ไขโครงสร้างข้อมูล คอมไพเลอร์จะแจ้งเตือนทันที (ป้องกัน Runtime Error)
เพราะ Browser ส่วนใหญ่ยังไม่รองรับฟีเจอร์บางอย่างของ HTTP/2 ที่ gRPC ต้องการ และการจัดการ Binary ข้อมูลใน JS ทำได้ยากกว่า JSON

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ในระบบของคุณ มี Microservices ที่คุยกันเองด้วย JSON อยู่กี่จุด? หากคุณเปลี่ยนเป็น gRPC คุณจะประหยัดค่า Compute (CPU) และค่า Data Transfer (Network 📡) ไปได้เท่าไหร่? การเลือก Protocol ที่ถูกต้องคือความรับผิดชอบของ Senior Engineer ในการคุมต้นทุนและประสิทธิภาพ

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[02-tcp-vs-udp|TCP vs UDP: รากฐานของ HTTP/1 และ HTTP/2]]
- [[../Chat/00-overview|Real-time Communication ในระบบ Chat]]
- [System Design Primer: gRPC Section](https://github.com/donnemartin/system-design-primer#grpc)
