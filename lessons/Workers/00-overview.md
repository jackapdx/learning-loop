---
verified: false
contentType: overview
level: senior
status: polished
tags: [chat-exp, system-design, workers, queues]
---

# Background Jobs & Queues — ยุทธศาสตร์การทำงานหลังบ้าน

> [!info] ปฐมนิเทศ
> ในระบบที่ต้องรองรับผู้ใช้จำนวนมาก เราไม่สามารถให้ User นั่งรอเซิร์ฟเวอร์ส่งอีเมล หรือประมวลผลวิดีโอจนเสร็จได้ การแยกงานที่"หนัก" หรือ"รอได้" ไปทำที่หลังบ้าน (Background) คือหัวใจสำคัญของการทำ Scalability
>
> ซีรีส์นี้จะพาคุณไปเจาะลึกเครื่องมือยอดนิยมในโลก Node.js อย่าง **pg-boss ** และ **BullMQ ** เพื่อดูว่าเมื่อไหร่ควรใช้ฐานข้อมูล 📦 (Postgres) และเมื่อไหร่ควรใช้หน่วยความจำ (Redis) ในการจัดการคิวงาน
>
> Each lesson takes **5-10 minutes **based on the **Learning Loop **principle.

## 🗺️ แผนผังการเรียนรู้ (Roadmap)

### Path A: Transactional Integrity → #1
[[01-pg-boss-transactional|pg-boss (PostgreSQL)]] — เมื่อความถูกต้องของข้อมูล (Atomicity) สำคัญที่สุด

### Path B: High Performance → #2
[[02-bullmq-redis-performance|BullMQ (Redis)]] — เมื่อความเร็ว (Throughput) และความซับซ้อนของคิวคือหัวใจ

## 📋 รายชื่อบทเรียนทั้งหมด (Lesson List)

| # | บทเรียน | คำถามสัมภาษณ์ |
|---|---|---|
| 1 | [[01-pg-boss-transactional\|pg-boss]] |"ทำไมต้องส่ง Job ใน Database 📦 Transaction? และวิธีแก้ปัญหา Table Bloat" |
| 2 | [[02-bullmq-redis-performance\|BullMQ]] |"วิธีรับมือกับ Stalled Jobs และการจัดการหน่วยความจำ Redis ไม่ให้เต็ม" |

> [!question] ลองทำก่อน
> หากคุณต้องทำระบบ **"ยืนยันการสั่งซื้อและส่งใบเสร็จ"**:
> 1. ถ้าคุณเขียน Order ลง DB สำเร็จ แต่ระบบคิวล่ม ทำให้ไม่ได้ส่งใบเสร็จ ลูกค้าจะโอเคไหม?
> 2. ถ้าคุณส่ง Job เข้าคิวสำเร็จ แต่ DB ดัน Rollback ทำให้มีใบเสร็จส่งไปทั้งที่ไม่มี Order จริงๆ อะไรจะเกิดขึ้น?
>
> หยุดคิด 30 วินาที... แล้วเริ่มเรียนบทที่ 1
