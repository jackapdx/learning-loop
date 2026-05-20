---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [architecture, cqrs, distributed-systems, performance]
prerequisites: [02-dual-write, 07-stateless-vs-stateful]
---

# CQRS (การแยกส่วนสั่งการและสอบถาม)

---

## 🎯 ปฐมนิเทศ (Orient)

ในระบบส่วนใหญ่ เรามักใช้ Data Model เดียวในการทั้งเขียน (Create/Update/Delete) และอ่าน (Read) ข้อมูล แต่เมื่อระบบซับซ้อนขึ้นและมีขนาดใหญ่ ความต้องการในการ"เขียน" ที่มักเน้นความถูกต้องและทำธุรกรรมได้สมบูรณ์ (Transactional Integrity) กับการ"อ่าน" ที่มักเน้นความเร็วและการค้นหาที่ซับซ้อน จะเริ่มขัดแย้งกันเอง การพยายามใช้ฐานข้อมูลหรือโมเดลเดียวเพื่อตอบโจทย์ทั้งสองฝั่ง มักจะนำไปสู่คอขวดด้านประสิทธิภาพหรือโค้ดที่ดูแลรักษาได้ยาก

## 🧪 ลองทำก่อน (Attempt)

> **สถานการณ์:** คุณกำลังสร้างระบบ Social Media ขนาดใหญ่ที่มีผู้ใช้หลายล้านคน:
> -** ฝั่งเขียน (Write):** เมื่อมีคนโพสต์ ต้องตรวจสอบสิทธิ์, กรองคำหยาบ, บันทึกลงฐานข้อมูลเชิงสัมพันธ์ (Relational DB) เพื่อความถูกต้อง
> -** ฝั่งอ่าน (Read):** หน้า Feed ต้องดึงโพสต์จากเพื่อนหลายพันคน, จัดลำดับตาม Algorithm, และรองรับการค้นหาแบบข้อความ (Full-text Search)
>
> ** ข้อจำกัด:**
> - ระบบต้องรองรับการอ่าน (Read) มากกว่าการเขียน (Write) ถึง 100 เท่า
> - การโหลดหน้า Feed ต้องเร็วระดับ < 200ms
> - การใช้ SQL JOIN จากตาราง User, Post, Follower หลักร้อยล้านแถวทำให้ฐานข้อมูลหลักเริ่มไม่ไหว
> - ข้อมูล Feed สามารถล่าช้าจากความเป็นจริงได้ไม่กี่วินาที (Eventual Consistency)
>
> ** คำถาม:** ภายใต้ข้อจำกัดนี้ คุณจะแก้ปัญหาความล่าช้าของการดึงหน้า Feed อย่างไรโดยไม่ลดทอนความถูกต้องของการบันทึกข้อมูลฝั่งเขียน?
> 1. เพิ่ม Index ใน Database หลักให้ครอบคลุมทุกรูปแบบการดึงหน้า Feed เพื่อให้ Query เร็วขึ้น
> 2. ทำ Database Sharding ตาม User ID เพื่อแบ่งภาระการอ่านและเขียนไปยังหลายๆ Node
> 3. แยก Database สำหรับอ่าน (เช่น Elasticsearch หรือ Redis) ออกจากฝั่งเขียน และจัดเก็บข้อมูลในรูปแบบที่พร้อมแสดงผลหน้า Feed
> 4. ย้ายระบบทั้งหมดไปใช้ NoSQL Database (เช่น MongoDB) ตัวเดียวจบ เพื่อความรวดเร็วในการสเกลและอ่านข้อมูล
>
> **✋ หยุดตรงนี้ก่อน! ลองนึกถึงผลกระทบของการเพิ่ม Index ต่อความเร็วในการเขียน และความซับซ้อนของการใช้ JOIN ใน Database หลัก **

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"เพิ่ม Index" | ⚠️ ** แก้ไม่ตรงจุดทั้งหมด!** การเพิ่ม Index จะทำให้การ"อ่าน" เร็วขึ้นบ้าง แต่จะทำให้การ"เขียน" ช้าลงอย่างมาก และไม่สามารถแก้ปัญหาการทำ JOIN ข้ามตารางใหญ่ๆ ที่เป็นคอขวดหลักได้ |
|"Database Sharding" | ⚠️ ** บริบทไม่ครบ!**Sharding ช่วยรับมือ Traffic ปริมาณมหาศาลได้ แต่การดึง Feed ของเพื่อนที่อยู่ต่าง Shard (Cross-shard JOIN) จะยิ่งทำให้ Query ช้าลงและซับซ้อนขึ้นไปอีก |
|"แยก DB ฝั่งอ่าน" | ✅ ** คิดแบบ Trade-off!** การแยกโมเดลการอ่านออกมาเก็บแบบ Denormalized (ไม่ต้อง JOIN) ใน DB ที่เหมาะสม ลด Latency ได้มหาศาล โดยยอมแลกกับ Eventual Consistency (ซึ่งระบบยอมรับได้) |
|"ย้ายไป NoSQL ตัวเดียว" | ❌ ** เสี่ยงเสีย Data Integrity!**NoSQL อ่านเร็ว แต่การทิ้ง Relational DB ในฝั่งเขียนที่ต้องการความถูกต้อง (เช่น เรื่องสิทธิ์และ Transaction) จะสร้างปัญหาข้อมูลไม่สม่ำเสมอในระยะยาว |

**ทำไมการให้เหตุผลแบบนี้สำคัญ?**
การแยกส่วนการอ่านและเขียน คือการยอมรับความจริงว่า **"ไม่มี Database หรือ Model ใดที่เก่งทั้งเรื่องเขียนให้ถูกต้องและอ่านให้เร็วซับซ้อนในเวลาเดียวกัน"** เราจึงออกแบบระบบตามลักษณะการใช้งานจริง

### คำอธิบาย (Explain)

**CQRS ** ย่อมาจาก Command Query Responsibility Segregation เป็นรูปแบบสถาปัตยกรรมที่แบ่งการทำงานออกเป็นสองฝั่งอย่างเด็ดขาด [source: Martin Fowler — CQRS]

1.**Command Side (ฝั่งเขียน):** เน้น Behavior, Validation, และ Data Integrity (มักใช้ Relational DB)

2.**Query Side (ฝั่งอ่าน):** เน้น Data Presentation เก็บข้อมูลในรูปแบบ **Denormalized **(จัดเตรียมพร้อมแสดงผล ไม่ต้อง JOIN) และใช้ DB ที่เหมาะกับการค้นหา (เช่น Document DB หรือ Search Engine)

### การเปรียบเทียบรูปแบบ Data Model

| Approach | สิ่งที่แก้ปัญหาได้ (Solves) | สิ่งที่ต้องแลก (What You Give Up) | เหมาะกับสถานการณ์ (Best When) |
|---|---|---|---|
|**Single Model (CRUD)**| ความซับซ้อนต่ำ, มี Strong Consistency ตลอดเวลา | ประสิทธิภาพการอ่านเมื่อต้อง JOIN ตารางซับซ้อน | ระบบทั่วไป, ระบบที่การอ่านและเขียนมีสัดส่วนใกล้เคียงกัน |
|**Read Replicas **| ลดภาระ Master DB, เพิ่ม Throughput การอ่าน | ไม่แก้ปัญหา Query ที่ใช้ CPU/Memory สูง (ยังต้อง JOIN เหมือนเดิม) | ระบบที่มีการอ่านเยอะ แต่โมเดลการค้นหาไม่ซับซ้อน |
|**CQRS (Read/Write Segregation)**| ประสิทธิภาพการอ่านสูงสุด (Pre-computed), เลือกระบบจัดเก็บแยกกันได้ | ความซับซ้อนในการจัดการหลาย DB, อาการ Stale Data | ระบบที่มี Read Traffic สูงมาก และ Query ต่างจากการเขียนลิบลับ |

```javascript
// ✅ Command: บันทึกโพสต์ใหม่ลง DB หลัก (Relational)
async function handleCreatePost(command) {
  // ตรวจสอบความถูกต้องและบันทึกลง SQL
  await sqlDb.query('INSERT INTO posts...', [command.content]);
  // ⚠️ Limitation: ฝั่งอ่านจะไม่เห็นข้อมูลนี้จนกว่า Event จะถูกประมวลผลเสร็จ
  await eventBus.publish('PostCreated', command); 
}

// ✅ Query: ดึงหน้า Feed จาก DB ฝั่งอ่าน (Search Engine/NoSQL)
async function getFeed(userId) {
  // ⚠️ Assumption: ข้อมูลใน elasticSearch อาจล่าช้าไป 1-2 วินาที (Eventual Consistency)
  return await elasticSearch.query({
    index: 'user_feeds',
    body: { query: { match: { target_user: userId } } }
  });
}
```

> ** อ้างอิง:**
> - [Martin Fowler — CQRS](https://martinfowler.com/bliki/CQRS.html)
> - [Microsoft Azure Architecture Center — CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)

## 🔬 ขยายความ (Extend)

### ควรใช้ CQRS เมื่อ...
- ✅ ความต้องการในการอ่านและเขียนแตกต่างกันอย่างสิ้นเชิง (เช่น ฝั่งเขียนเป็น Transaction ทางการเงิน แต่ฝั่งอ่านเป็น Analytics Dashboard)
- ✅ ระบบที่มี Traffic การอ่านสูงกว่าการเขียนมาก (Read-Heavy Workloads)
- ✅ เมื่อต้องการให้ทีมพัฒนาแยกกันทำงานอย่างอิสระ (ทีมหนึ่งดูแลฝั่งเขียน อีกทีมดูแลฝั่งอ่านตาม Product Requirement)

### ควรหลีกเลี่ยง CQRS เมื่อ...
- ❌ ระบบเป็น **Simple CRUD Application ** พื้นฐาน การนำรูปแบบนี้มาใช้จะทำให้โค้ดซับซ้อนเกินความจำเป็นอย่างมาก
- ❌ ธุรกิจยอมรับความล่าช้าของข้อมูลไม่ได้เลย (ต้องการ Strict Real-time Consistency 100%)

### สิ่งที่ต้องแลก (Trade-offs)
-**Synchronization Lag:** ข้อมูลฝั่งอ่านอาจล่าช้ากว่าฝั่งเขียน ต้องออกแบบ UX มารองรับ (เช่น ใช้ Optimistic UI แสดงโพสต์ของตัวเองทันทีโดยไม่ต้องรอโหลดซ้ำ)
-**Maintenance Cost:** ต้องเขียนโค้ดเพื่อซิงค์ข้อมูล (Event Handlers) และมีภาระในการดูแล Database เพิ่มขึ้นอย่างน้อย 1 ประเภท
-**Eventual Consistency Issues:** หากเกิดบั๊กในการซิงค์ ข้อมูลสองฝั่งจะไม่ตรงกัน ต้องมีเครื่องมือ/สคริปต์สำหรับซ่อมแซมข้อมูล (Data Reconciliation)

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. ทำไมการทำ"Denormalization" ในฝั่ง Query ของ CQRS ถึงช่วยลด Latency ได้?
> 2. ถ้ามีผู้ใช้งานบ่นว่า"อัปเดตข้อมูลโปรไฟล์ไปแล้ว แต่หน้าค้นหายังเจอข้อมูลเก่าอยู่เลย" ปัญหานี้เรียกว่าอะไร และในมุมของ Architecture ถือเป็น Bug หรือไม่?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.** ลดภาระการประมวลผล **— Denormalization คือการนำข้อมูลจากหลายๆ Entity มารวมกันจัดเก็บไว้ล่วงหน้า ทำให้ไม่ต้องทำการ JOIN หรือคำนวณซับซ้อนในจังหวะที่ผู้ใช้ร้องขอข้อมูล (Pre-computed)
2.** เรียกว่า Eventual Consistency Lag ** — ในมุมของสถาปัตยกรรมนี้ นี่ไม่ใช่ Bug แต่เป็น Trade-off ที่ออกแบบมาเพื่อให้ระบบโดยรวมทำงานได้เร็วและสเกลได้ เพียงแต่อาจต้องปรับปรุง UX เพื่อจัดการความคาดหวังของผู้ใช้

</details>

## 🤔 สะท้อนคิด (Reflect)

> ในฐานข้อมูลที่คุณใช้งานอยู่ มีตารางไหนที่มี Index มากเกินไปจนการเขียนเริ่มช้าบ้างหรือไม่? ถ้าระบบนั้นสามารถยอมรับความล่าช้าในการแสดงผลได้สัก 5 วินาที การแยกตารางค้นหาออกมาต่างหากจะช่วยลดภาระได้แค่ไหน?

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)
- [[../Messaging/03-event-bus|Messaging/Event Bus]]
- [[02-dual-write|Distributed/Dual Write Problem]]
- [[../Postgres/05-vacuum-mvcc|Postgres/MVCC]]
- [[../NoSQL/04-eventual-consistency|NoSQL/Eventual Consistency]]
