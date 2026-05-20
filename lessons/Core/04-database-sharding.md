---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [system-design, database, scalability, sharding, distributed-systems]
prerequisites: [distributed/02-consistency-vs-availability, core/03-cache-invalidation]
---

# Database Sharding (ยุทธศาสตร์การแบ่งส่วนข้อมูลในระดับสูง)

---

## 🎯 ปฐมนิเทศ (Orient)

"Hash ด้วย UserID" คือคำตอบพื้นฐานที่วิศวกรทุกคนมักจะตอบ — และนั่นคือเหตุผลที่มันไม่เพียงพอสำหรับระดับ Senior บทเรียนนี้จะพาคุณไปไกลกว่าแค่ทฤษฎีพื้นฐาน โดยเจาะลึกเรื่อง **Consistent Hashing**,**Virtual Nodes**, การรับมือกับ **Hot Keys** และกลยุทธ์ **Zero-Downtime Resharding** เพื่อให้ระบบขยายตัวได้โดยไม่พังลงกลางคัน

---

## 🧪 ลองทำก่อน (Attempt)

>**สถานการณ์**:คุณมีฐานข้อมูลผู้ใช้ที่เติบโตจาก 1 ล้านเป็น 100 ล้านแถว ปัจจุบันคุณใช้วิธี Sharding แบบง่ายคือ`hash(user_id) % 4` แบ่งออกเป็น 4 Shards (S0, S1, S2, S3) ทุกอย่างดูดี... จนกระทั่งความจุเต็ม และคุณต้องเพิ่ม Shard ที่ 5 (S4) เพื่อรองรับข้อมูลที่พุ่งสูงขึ้น
>
>**ข้อจำกัด**:> - ระบบต้องออนไลน์ตลอด 24 ชั่วโมง (Zero-downtime requirement)
> - ต้องลดภาระการย้ายข้อมูล (Data Migration) ให้เหลือน้อยที่สุดเพื่อไม่ให้กระทบประสิทธิภาพของระบบในขณะทำงาน
>
>**คำถาม**:เมื่อคุณเปลี่ยนสูตรเป็น`hash(user_id) % 5` จะเกิดอะไรขึ้นกับข้อมูลเดิม? ต้องย้ายข้อมูลประมาณกี่เปอร์เซ็นต์? และในฐานะ Senior Engineer คุณจะใช้เทคนิคใดเพื่อลดผลกระทบของการเพิ่ม Node ในอนาคต?
>
>**✋ หยุดตรงนี้ก่อน**— ลองคำนวณในใจดูว่าการเปลี่ยนค่าตัวหาร (Modulo) จะทำให้ผลลัพธ์เปลี่ยนไปกี่ %

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"ย้ายข้อมูลเฉพาะส่วนต่าง" | ⚠️ **เข้าใจผิด!** การใช้ Modulo แบบปกติ (`% N`) เมื่อ N เปลี่ยน ค่าที่ได้จะเปลี่ยนเกือบทั้งหมด ข้อมูลประมาณ 80% จะต้องย้ายที่อยู่ทันที ซึ่งจะสร้างโหลดมหาศาลจนระบบล่ม |
|"ทำ Migration ตอนเที่ยงคืน" | ⚠️**หัวโบราณไปนิด!** สำหรับระบบระดับโลก (Global Scale) ไม่มีคำว่า"เที่ยงคืน" เพราะมีผู้ใช้ตลอด 24 ชั่วโมง การมี Downtime นานๆ คือความล้มเหลวเชิงธุรกิจ |
|"ใช้ Consistent Hashing" | ✅**Senior-level!** นี่คือคำตอบที่ยั่งยืน — วิธีนี้จะช่วยให้ย้ายข้อมูลเพียงแค่`1/n` (ในกรณีนี้คือ ~20%) เมื่อมีการเพิ่ม Node และสามารถทำได้โดยไม่ต้องหยุดระบบ |**ทำไมการให้เหตุผลแบบนี้สำคัญ?** เพราะวิศวกรอาวุโสมองข้ามเรื่องการ"เริ่มระบบ" ไปสู่การ"บำรุงรักษาและการเติบโต" (Scaling State) การเตรียมตัวสำหรับ Resharding คือสิ่งที่แยกโปรเจกต์ที่รอดกับโปรเจกต์ที่เจ๊ง

---

## 📖 คำอธิบาย (Explain)

### ภัยเงียบของการใช้`hash % N`

เมื่อคุณเปลี่ยนจำนวน Shard (N) สูตรคำนวณจะเปลี่ยนทันที:
-**เดิม**: `hash(42) % 4 = 2` (อยู่ Shard 2)
-**ใหม่**: `hash(42) % 5 = 2` (โชคดี อยู่ที่เดิม)
-**ปัญหา**:`hash(44) % 4 = 0` แต่`hash(44) % 5 = 4` (**ต้องย้าย!**)

ทางสถิติแล้ว ข้อมูลที่ต้องย้ายจะเท่ากับ`(N-1)/N` ซึ่งในกรณีเพิ่มจาก 4 เป็น 5 Shard คือ **80%** ของข้อมูลทั้งหมด! [source: Designing Data-Intensive Applications, Ch. 6]

### Consistent Hashing: ทางออกที่ยั่งยืน

แทนที่จะ Map คีย์ไปหา Shard โดยตรง เราจะใช้แนวคิดของ **"วงแหวน (Ring)"**:
1.**Hash ทั้ง Shard และ Key** ลงบนวงแหวนวงเดียวกัน (ค่า 0 ถึง 2^32-1)
2.**Clockwise Rule:** คีย์จะถูกจัดเก็บใน Shard ที่อยู่"ถัดไปตามเข็มนาฬิกา"
3.**Virtual Nodes:** หนึ่ง Shard จริงจะถูก Hash ลงหลายจุดบนวงแหวนเพื่อกระจายโหลดให้สมดุล (Balance Load)**ข้อดี**:เมื่อเพิ่ม Shard ใหม่ ข้อมูลที่ต้องย้ายจะลดลงเหลือเพียงประมาณ`1/n` เท่านั้น!

---

## 🔬 ขยายความ (Extend)

### 4 ความท้าทายระดับ Senior และวิธีแก้

| ปัญหา (Challenge) | แนวทางแก้ไข (Solution) | สิ่งที่ต้องแลก (Trade-off) |
|:---|:---|---|
|**Hot Keys (Celebrity)**| แยก Hot Users ออกไปอยู่ใน Dedicated Shard/Replica พิเศษ | ความซับซ้อนในการจัดการ Logic การเลือก Shard |
|**Cross-shard Joins**| ทำ **Denormalization** หรือ Join ที่ระดับ Application | เปลืองพื้นที่เก็บข้อมูลมากขึ้น และต้องจัดการความสอดคล้องเอง |
|**Global Unique IDs**| ใช้ [[Distributed/10-distributed-id-generation|Snowflake ID]] (Timestamp + MachineID) | ต้องมีระบบ ID Generator ที่เชื่อถือได้เพิ่มขึ้นมา |
|**Distributed Transactions**| ใช้ **Saga Pattern** หรือ Event-driven | พัฒนายากขึ้น และระบบจะเป็น Eventual Consistency ⛓️ |

### Snowflake ID: กุญแจสำคัญของ Sharding

เพื่อให้แต่ละ Shard สร้าง ID ได้เองโดยไม่ซ้ำกันข้ามเครื่อง (ดูรายละเอียดที่ [[Distributed/10-distributed-id-generation|บทที่ 10: Distributed ID Generation]]):
-**Timestamp (41 bits):** เรียงตามเวลาได้
-**Machine ID (10 bits):** รองรับ 1,024 เครื่อง
-**Sequence (12 bits):** รองรับ 4,096 ID ต่อ 1 มิลลิวินาที

---

## ✅ จุดตรวจสอบ (Checkpoint)

<blockquote>
<strong>Quick Check:</strong>
1. หากคุณมี 10 Shards และต้องการเพิ่มเป็น 11 การใช้ Consistent Hashing จะต้องย้ายข้อมูลกี่ % เมื่อเทียบกับ Modulo ปกติ?
2."Virtual Nodes" ใน Consistent Hashing ช่วยแก้ปัญหาเรื่องอะไร?
</blockquote>

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.**Consistent Hashing ย้าย ~9% (1/11)** ในขณะที่ Modulo ปกติย้าย **~91% (10/11)** 2.**ช่วยเรื่อง Load Balancing** — หากจุดบนวงแหวนมีน้อย Shard หนึ่งอาจต้องรับผิดชอบช่วงข้อมูล (Range) ที่กว้างกว่า Shard อื่น การเพิ่ม Virtual Nodes ช่วยเฉลี่ยพื้นที่บนวงแหวนให้เท่ากันมากขึ้น

</details>

---

## 🤔 สะท้อนคิด (Reflect)

<blockquote>
💭 ฐานข้อมูลที่คุณใช้อยู่ตอนนี้ หากพรุ่งนี้ Traffic พุ่งขึ้น 100 เท่า คุณมีแผนจะ"ผ่า" (Shard) มันอย่างไรโดยไม่ให้ธุรกิจหยุดชะงัก? คุณจะจัดการเรื่องความสัมพันธ์ของข้อมูล (Relationships) อย่างไรเมื่อมันไม่ได้อยู่เครื่องเดียวกันแล้ว?
</blockquote>

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[02-consistency-vs-availability|CAP Theorem: เมื่อข้อมูลกระจายตัว Consistency จะเป็นอย่างไร]]
- [[03-cache-invalidation|Cache Invalidation: การใช้แคชเพื่อลดภาระ DB]]
- [[Postgres/01-table-partitioning|Table Partitioning: ขั้นตอนแรกก่อนไปถึง Sharding ใน Postgres]]
- [[Distributed/10-distributed-id-generation|Distributed ID Generation: UUID vs Snowflake]]
