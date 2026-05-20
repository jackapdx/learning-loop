---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [cloud, databases, gcp, cloud-sql, firestore, high-availability]
---

# Managed Databases: สถาปัตยกรรมฐานข้อมูลแบบไร้กังวล

---

## 🎯 ปฐมนิเทศ (Orient)

*"การรัน PostgreSQL บน Virtual Machine (VM) คือการหาเรื่องใส่ตัว"* นี่คือคำกล่าวที่ Senior Engineer มักจะเตือนน้องๆ เพราะการดูแล Database ไม่ใช่แค่การรันมันขึ้นมา แต่คือการจัดการ **Backup, Patching, Replication, และ High Availability (HA)** ซึ่งเป็นงานที่น่าเบื่อและเสี่ยงสูง **Managed Databases ** จะทำสิ่งเหล่านี้ให้คุณโดยอัตโนมัติ เพื่อให้คุณไปโฟกัสที่การออกแบบ Schema และประสิทธิภาพของ Query แทน

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️ ** สถานการณ์:** คุณกำลังออกแบบระบบ"Banking Application" ที่ต้องมีความแม่นยำสูง (ACID) และ"E-commerce Product Catalog" ที่ต้องการสเกลระดับโลก
> -**Banking:** ต้องการ Transaction ที่เป๊ะที่สุด ข้อมูลห้ามพังเด็ดขาด
> -**Catalog:** ข้อมูลสินค้ามีความหลากหลาย (Attributes เยอะ) และต้องรองรับคนเข้าชมหลักล้าน
>
> ** คำถาม:** ในฐานะ Senior Architect คุณจะเลือกใช้บริการใดของ Google Cloud สำหรับทั้ง 2 งานนี้?
> 1.**Cloud SQL (PostgreSQL)** สำหรับ Banking และ **Firestore ** สำหรับ Catalog
> 2.**Firestore ** สำหรับ Banking และ **Cloud SQL ** สำหรับ Catalog
>
> **✋ หยุดตรงนี้ก่อน **— (คำใบ้: ลองนึกถึงความต่างระหว่าง 'ความเป๊ะ' กับ 'ความยืดหยุ่น')

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"เลือกข้อ 1" | ✅ ** นี่คือระดับ Senior!** คุณเข้าใจว่า SQL คือเจ้าแห่งความเป๊ะ (ACID) ส่วน Firestore (NoSQL) คือเจ้าแห่งความสเกลและความยืดหยุ่นของข้อมูลที่ไม่แน่นอน |
|"เลือกข้อ 2" | ❌ ** เสี่ยงมาก!** การทำระบบบัญชีที่ซับซ้อนบน NoSQL จะทำให้คุณเขียนโค้ดแก้เรื่องความถูกต้อง (Integrity) จนปวดหัว และ Cloud SQL ก็ไม่ยืดหยุ่นพอสำหรับ Catalog ที่เปลี่ยนฟิลด์บ่อยๆ |

**ทำไมคนส่วนใหญ่ถึงพลาด?** เพราะเรามักพยายามใช้"เครื่องมือเดียวแก้ทุกปัญหา" (One-size-fits-all) แต่ในระบบขนาดใหญ่ การเลือก DB ให้ตรงกับ **Access Pattern ** คือหัวใจสำคัญ

---

## 📖 คำอธิบาย (Explain)

💡 ใน Google Cloud (GCP) มี 3 ตัวเลือกหลักที่มือโปรต้องรู้จัก:

### 1. Cloud SQL (Relational - PostgreSQL/MySQL)

-** จุดเด่น:** รองรับมาตรฐาน SQL เต็มรูปแบบ, มี ACID สูง, ทำ Joint ได้ซับซ้อน
-**High Availability (HA):**GCP จัดการรันเครื่องสำรอง (Standby) ไว้ในอีก Zone หนึ่งให้อัตโนมัติ หากเครื่องหลักล่ม มันจะสลับไปหา Standby ในไม่กี่วินาที

### 2. Firestore (NoSQL - Document)

-** จุดเด่น:** **Serverless 100%**, สเกลตามการใช้งานจริง (Pay-per-use), ยืดหยุ่นเรื่อง Schema (JSON-like)
-** เหมาะสำหรับ:**Mobile 📱 Backends, User Profiles, Product Catalogs

### 3. Bigtable (NoSQL - Wide Column)

-** จุดเด่น:** รองรับข้อมูลระดับ Petabytes และ Low Latency มหาศาล
-** เหมาะสำหรับ:**Time-series, Ad-tech, และงานที่ต้องการ Write หนักๆ ระดับล้านรายการต่อวินาที

---

## 🔬 ขยายความ (Extend)

### ยุทธศาสตร์ Senior: การบริหารจัดการราคาและประสิทธิภาพ

**Read Replicas:** เมื่อ Database 📦 หลักทำงานหนักเกินไป (CPU พุ่ง) จากการที่มีคนมา"อ่าน" เยอะ ให้เปิด Read Replicas แยกออกมาเพื่อกระจายโหลด
**Point-in-Time Recovery (PITR):**Managed DB ช่วยให้คุณ"ย้อนเวลา" กลับไปวินาทีใดก็ได้ในช่วง 7 วันที่ผ่านมา (หากเกิดเหตุการณ์มีคนเผลอรัน`DROP TABLE`)
**Automatic Scaling:** ใน Cloud SQL คุณสามารถตั้งค่าให้ **"เพิ่ม Disk อัตโนมัติ"** ได้เมื่อพื้นที่ใกล้เต็ม เพื่อป้องกันระบบล่มแบบกะทันหัน

### ตารางตัดสินใจ (Decision Matrix)

| โจทย์ | ตัวเลือกที่แนะนำ |
|:---|:---|
| ข้อมูลซับซ้อน ต้องจอยเยอะๆ |**Cloud SQL **|
| ต้องการประหยัดเงินที่สุด (งานน้อยจ่ายน้อย) |**Firestore **|
| ข้อมูลใหญ่มากและต้องการ Write หนักๆ |**Bigtable **|

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:**
"High Availability" ใน Cloud SQL ทำงานอย่างไร?
หากคุณต้องการสร้างแอปแชทที่มีคนใช้พร้อมกัน 1 ล้านคน ตัวเลือกไหนประหยัดและสเกลง่ายที่สุด?
Managed Database 📦 ช่วยลดภาระของทีม Engineer ในเรื่องใดบ้าง?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>

GCP จะรัน **Standby Instance ** ไว้ในอีก Zone (พื้นที่แยกกัน) และทำการซิงค์ข้อมูลตลอดเวลา หากเครื่องหลักพัง ระบบจะเปลี่ยน IP ไปหาเครื่องสำรองให้อัตโนมัติ (Failover)
**Firestore ** เพราะเป็น Serverless และสเกลตาม Request ที่เข้ามาจริงโดยไม่ต้องจองเซิร์ฟเวอร์ทิ้งไว้
**Backups, OS/DB Patching, Replication, Storage Scaling, และ Hardware Monitoring **

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 คุณยังจ่ายค่า Engineer ให้มานั่งทำ Backup DB และลง Patch Security ด้วยมืออยู่หรือไม่? ต้นทุนของ Managed Database 📦 อาจดูแพงกว่าการเช่าเครื่องเปล่า แต่"ค่าเสียโอกาส" และ"ค่าความเสี่ยง" เมื่อระบบล่มนั้นแพงกว่าหลายเท่าตัว

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[../Postgres/00-overview|เจาะลึก PostgreSQL แบบมือโปร]]
- [[../NoSQL/01-sql-vs-nosql-tradeoffs|NoSQL Patterns: เมื่อไหร่ควรเปลี่ยนมาใช้]]
- [GCP: Cloud SQL High Availability explained](https://cloud.google.com/sql/docs/postgres/high-availability)
