---
verified: false
contentType: overview
level: senior
status: polished
tags: [chat-exp, system-design, nosql, databases]
---

# NoSQL Patterns — ยุทธศาสตร์การสเกลข้อมูลระดับมหาศาล

> [!info] ปฐมนิเทศ
> เมื่อข้อมูลของคุณโตเกินกว่าที่เซิร์ฟเวอร์ตัวเดียวจะรับไหว (Vertical Scale) หรือคุณต้องการ Write Throughput ที่รุนแรงระดับล้านรายการต่อวินาที NoSQL คือคำตอบ
> 
> แต่ NoSQL ไม่ใช่"ยาวิเศษ" มันมาพร้อมกับข้อแลกเปลี่ยน (Trade-offs) ที่เจ็บปวด ทั้งเรื่องความถูกต้องของข้อมูล (Consistency ⛓️) และความซับซ้อนในการออกแบบ Schema บทเรียนนี้จะพาคุณไปดูเบื้องหลังการทำงานของ NoSQL ผ่านเหตุการณ์จริงของบริษัทระดับโลก
>
> Each lesson takes **5-10 minutes **based on the **Learning Loop **principle.

## 🗺️ แผนผังการเรียนรู้ (Roadmap)

### Path A: Scaling Strategy → #1, 2, 5
[[01-sql-vs-nosql-tradeoffs|SQL vs NoSQL]] + [[02-nosql-hotspots-sharding|Hotspots & Sharding]] + [[05-oltp-vs-olap|OLTP vs OLAP]] — เมื่อไหร่ควรเปลี่ยน และจะเลือกใช้ฐานข้อมูลประเภทไหนให้ถูกงาน

### Path B: Concurrency & Integrity → #3, 4
[[03-nosql-locking-concurrency|Locking & Concurrency]] + [[04-eventual-consistency|Eventual Consistency]] — เจาะลึกกลไกภายในที่ทำให้ระบบช้าลงโดยไม่รู้ตัว

## 📋 รายชื่อบทเรียนทั้งหมด (Lesson List)

| # | บทเรียน | คำถามสัมภาษณ์ |
|---|---|---|
| 1 | [[01-sql-vs-nosql-tradeoffs\|SQL vs NoSQL]] |"ทำไม Discord ถึงต้องย้ายจาก MongoDB ไป Cassandra? (ไม่ใช่เรื่องความเท่)" |
| 2 | [[02-nosql-hotspots-sharding\|Hotspots & Sharding]] |"จะแก้ปัญหาอย่างไรเมื่อ User ที่ดังที่สุดในแอป ทำเอา Database 📦 พังทั้งเครื่อง?" |
| 3 | [[03-nosql-locking-concurrency\|Locking & Bottlenecks]] |"ทำไมการเพิ่ม CPU ถึงทำให้ MongoDB (รุ่นเก่า) ช้าลง? — บทเรียนจาก Foursquare" |
| 4 | [[04-eventual-consistency\|Eventual Consistency]] |"ยอมรับได้ไหมถ้าเพื่อนเห็นข้อความก่อนที่เราจะส่ง? — วิธีรับมือข้อมูลไม่ตรงกัน" |
| 5 | [[05-oltp-vs-olap\|OLTP vs OLAP]] |"ทำไมเราถึงไม่ควรทำ Reporting บนฐานข้อมูล Production โดยตรง?" |

> [!question] ลองทำก่อน
> หากคุณมี Database 📦 ที่เก็บข้อมูล 📦 Log ขนาด 10TB:
> 1. การค้นหาข้อมูลตาม ID จะเร็วเท่าเดิมไหมถ้าข้อมูลเพิ่มเป็น 100TB?
> 2. อะไรคือสาเหตุหลักที่ทำให้ Database 📦 เริ่ม"อืด" เมื่อข้อมูลใหญ่เกินขนาด RAM?
>
> หยุดคิด 30 วินาที... แล้วเริ่มเรียนบทที่ 1
