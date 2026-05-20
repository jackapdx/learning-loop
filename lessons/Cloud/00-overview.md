---
verified: false
contentType: overview
level: senior
status: polished
tags: [chat-exp, system-design, cloud, gcp, serverless]
---

# Cloud Infrastructure — สถาปัตยกรรมคลาวด์ยุคใหม่

> [!info] ปฐมนิเทศ
> การย้ายระบบขึ้นคลาวด์ไม่ได้หมายความว่างานของคุณเสร็จแล้ว แต่มันคือจุดเริ่มต้นของการเลือกว่าจะ"รันงานที่ไหน" ให้คุ้มค่าและสเกลได้ดีที่สุด
>
ซีรีส์นี้จะพาคุณไปสำรวจองค์ประกอบหลักของ Modern Cloud ตั้งแต่การประมวลผลแบบ Serverless ไปจนถึงการจัดการ Network 📡 และความปลอดภัยในระดับ Infrastructure 🏗️

Each lesson takes **5-10 minutes**based on the **Learning Loop**principle.

## 🗺️ แผนผังการเรียนรู้ (Roadmap)

### Path A: Serverless Computing & Storage → #1, 2

[[01-cloud-run-functions|Cloud Run Functions]] (Compute) + [[02-cloud-storage|Cloud Storage]] (Object Store) — รันโค้ดและเก็บไฟล์อย่างไรให้สเกลได้

### Path B: Managed Resources & Security → #3, 4

[[03-managed-databases|Managed Databases]] — ลดภาระการดูแล DB ด้วย Cloud SQL/Firestore
[[04-iam-security|IAM Security]] — ปกป้องระบบด้วยการจัดการสิทธิ์ที่เข้มงวดที่สุด

## 📋 รายชื่อบทเรียนทั้งหมด (Lesson List)

| # | บทเรียน | คำถามสัมภาษณ์ |
|---|---|---|
| 1 | [[01-cloud-run-functions\|Cloud Run Functions]] |"Cloud Functions ต่างจาก Cloud Run อย่างไร? และวิธีแก้ปัญหา Cold Start" |
| 2 | [[02-cloud-storage\|Cloud Storage]] |"จะเก็บไฟล์ 1PB อย่างไรให้ประหยัดเงินที่สุด? และความลับของ Signed URLs" |
| 3 | [[03-managed-databases\|Managed Databases]] |"เมื่อไหร่ควรใช้ Cloud SQL และเมื่อไหร่ควรไป Firestore? — เจาะลึก High Availability" |
| 4 | [[04-iam-security\|IAM Security]] |"Principle of Least Privilege คืออะไร? และทำไมการใช้ Root Key ถึงเป็นจุดจบของบริษัท" |

> [!question] ลองทำก่อน
> หากคุณมีงานที่"รันแค่นาทีละครั้ง" แต่ละครั้งใช้เวลาทำงานแค่ 2 วินาที:
> 1. คุณจะเลือกเปิด Virtual Machine (VM) ทิ้งไว้ 24 ชม. หรือใช้ Serverless?
> 2. หากงานนี้ต้องใช้ Memory มหาศาลแต่รันแค่แป๊บเดียว ตัวเลือกไหนจะ"ถูกเงิน" ที่สุด?
>
> หยุดคิด 30 วินาที... แล้วเริ่มเรียนบทที่ 1
