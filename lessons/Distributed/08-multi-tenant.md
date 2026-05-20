---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, system-design, distributed-systems, saas, architecture]
---

# Multi-Tenant Architecture (การออกแบบระบบสำหรับลูกค้าหลายราย)

---

## 🎯 ปฐมนิเทศ (Orient)

"SaaS" (Software as a Service) คือเป้าหมายของบริษัทซอฟต์แวร์ยุคใหม่ แต่การเปลี่ยนจากระบบที่รันให้ลูกค้าคนเดียว (Single Tenant) ไปเป็นระบบที่รองรับลูกค้าหมื่นราย (Multi-Tenant) บนโครงสร้างพื้นฐานเดียวกันนั้นไม่ใช่เรื่องง่าย บทเรียนนี้จะพาคุณไปดูวิธีการจัดการความปลอดภัย ความเป็นส่วนตัวของข้อมูล และปัญหา"เพื่อนบ้านเสียงดัง" (Noisy Neighbor) ที่อาจทำให้ระบบล่มทั้งแผงได้

---

## 🧪 ลองทำก่อน (Attempt)

> **สถานการณ์:** คุณเป็น Lead Engineer ของระบบ CRM แบบ SaaS ปัจจุบันมีลูกค้า 500 ราย ข้อมูลทั้งหมดถูกเก็บอยู่ใน **ฐานข้อมูลตัวเดียวกัน** และใช้คอลัมน์ `tenant_id` ในการแยกข้อมูล ปัญหาเกิดขึ้นเมื่อ **ลูกค้า A** (บริษัทใหญ่) รัน Report มหาศาลจนฐานข้อมูล CPU พุ่งไปที่ 100% ทำให้ **ลูกค้า B, C, D** (บริษัทเล็กๆ) เข้าใช้งานระบบไม่ได้เลย
>
> **ข้อจำกัด:**
> - งบประมาณจำกัด ไม่สามารถซื้อ DB แยกให้ลูกค้าทุกรายได้
> - ลูกค้ารายใหญ่ที่สุดต้องการ SLA 99.99% และ Data Isolation สูงสุด
> - ทีม Ops มีแค่ 3 คน ต้องดูแลระบบให้ง่ายที่สุด
>
> **คำถาม:** คุณจะออกแบบสถาปัตยกรรม Multi-Tenant อย่างไรให้สมดุลระหว่างต้นทุน (Cost), ความปลอดภัย (Isolation), และความง่ายในการดูแล (Operational Simplicity)?

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"ให้ทุกคนอยู่ Pool (Shared Table) เหมือนเดิม แล้วเพิ่ม CPU" | ❌ **ไม่ยั่งยืน!** Vertical Scaling มีขีดจำกัด และไม่ได้แก้ต้นเหตุ Noisy Neighbor — ลูกค้า A จะยังทำให้ลูกค้า B, C, D ช้าอยู่ดี |
|"แยกทุกคนเป็น Silo (DB-per-Tenant)" | ⚠️ **ปลอดภัยแต่ไม่สมจริง!** แม้จะได้ Isolation สูงสุด แต่ 500 Databases กับทีม Ops 3 คนคือฝันร้ายด้านการดูแล — แถมต้นทุนพุ่งเกินงบประมาณ |
|"ใช้ Hybrid: ลูกค้าใหญ่แยก Silo, ลูกค้าที่เหลืออยู่ Bridge (Schema-per-Tenant)" | ✅ **Senior-level!** จับคู่ระดับ Isolation ให้เหมาะกับ SLA และงบประมาณ — ลูกค้า Premium ได้ความปลอดภัยสูงสุด, ลูกค้าทั่วไปแชร์ทรัพยากรอย่างมีประสิทธิภาพ, และทีม Ops ดูแลแค่ไม่กี่ Schema + Silo เฉพาะรายสำคัญ |

**ทำไมคนส่วนใหญ่ถึงพลาด?** เพราะคิดถึง Multi-Tenancy เป็นแบบใดแบบหนึ่ง (All-or-Nothing) แทนที่จะมองเป็น **Spectrum** ที่คุณสามารถผสมผสานหลายโมเดลเข้าด้วยกันตามความต้องการของลูกค้าแต่ละกลุ่ม

---

## 📖 คำอธิบาย (Explain)

การออกแบบระบบ Multi-tenant คือการสร้างสมดุลระหว่าง"ประสิทธิภาพของทรัพยากร" (Resource Efficiency) และ"การแยกส่วนข้อมูล" (Data Isolation) [source: AWS Whitepaper — SaaS Storage Strategies]

### 3 รูปแบบหลักของ Multi-Tenancy

**Silo (Database-per-Tenant):** แยกฐานข้อมูลให้ลูกค้าแต่ละราย
- **ข้อดี:** Isolation สูงสุด, ปรับแต่งให้แต่ละรายได้ง่าย, สบายใจเรื่องความปลอดภัย
- **ข้อเสีย:** ราคาแพง, ดูแลยาก (ต้องอัปเกรด 1,000 DB แทนที่จะเป็น 1)

**Bridge (Schema-per-Tenant):** ใช้ฐานข้อมูลเดียว แต่แยก Schema
- **ข้อดี:** สมดุลระหว่างราคาและการจัดการ, แยกข้อมูลชัดเจนในระดับโครงสร้าง
- **ข้อเสีย:** ยังมีปัญหา Noisy Neighbor ในระดับทรัพยากรเครื่อง

**Pool (Shared Table):** ทุกคนอยู่ในตารางเดียวกัน แยกด้วย `tenant_id`
- **ข้อดี:** ประหยัดที่สุด, ดูแลง่ายที่สุด (อัปเดตจุดเดียว)
- **ข้อเสีย:** ความเสี่ยงข้อมูลรั่วไหลสูงถ้าเขียนโค้ดพลาด, เกิดปัญหา Noisy Neighbor ได้ง่ายที่สุด

### ตารางเปรียบเทียบ

| คุณสมบัติ | Silo | Bridge | Pool |
|:---|:---|:---|:---|
|**ความคุ้มค่า (Cost)**| ต่ำ (แพง) | ปานกลาง | สูง (ประหยัด) |
|**การแยกข้อมูล (Isolation)**| สูงสุด | ปานกลาง | ต่ำ |
|**ความง่ายในการ Scale**| ยาก (ติดเรื่องจำนวน DB) | ปานกลาง | ง่ายที่สุด |
|**ความปลอดภัย**| ดีมาก | ดี | ต้องระวังเป็นพิเศษ |

---

## 🔬 ขยายความ (Extend)

### Row-Level Security (RLS) ใน PostgreSQL
หากคุณเลือกแบบ **Pool** (Shared Table) คุณควรใช้ RLS เพื่อป้องกันมนุษย์ (Dev) เขียน Query ลืม `WHERE tenant_id = ...`:
```sql
-- สร้างนโยบายความปลอดภัย
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_order_isolation ON orders
FOR ALL TO authenticated
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```
ด้วยวิธีนี้ แม้คุณจะเขียน `SELECT * FROM orders` แอปจะเห็นแค่ข้อมูลของลูกค้าที่ล็อกอินอยู่เท่านั้น

### การรับมือ Noisy Neighbor
- **Throttling / Rate Limiting:** จำกัดจำนวน Request ต่อวินาทีของแต่ละ Tenant
- **Tiered Hosting:** ลูกค้าจ่ายถูกอยู่ Pool, ลูกค้าจ่ายแพงอยู่ Silo
- **Resource Quotas:** ใช้ Database ที่รองรับการจำกัดทรัพยากรราย User/Schema

---

## ✅ จุดตรวจสอบ (Checkpoint)

**Quick Check:**

1. หากลูกค้าเป็นธนาคารที่ซีเรียสเรื่อง Data Privacy มากๆ คุณควรแนะนำโมเดลไหน?
2. ข้อดีที่สุดของโมเดล Shared Table (Pool) คืออะไร?
3. ปัญหา"Noisy Neighbor" มักเกิดกับโมเดลไหนบ่อยที่สุด?

<details>
<summary>คลิกเพื่อดูคำตอบ</summary>

1. **Silo (Database-per-Tenant)** — เพื่อความมั่นใจสูงสุดว่าข้อมูลจะไม่ปนกับใครในระดับกายภาพ
2. **Operational Efficiency (ประหยัดและดูแลง่าย)** — คุณสามารถอัปเกรดโครงสร้างตารางหรือทำ Backup ได้ในที่เดียวสำหรับลูกค้าทุกคน
3. **Pool (Shared Table)** — เพราะทุกคนแย่งชิง CPU, Memory และ Disk IO ชุดเดียวกันบนฐานข้อมูลตัวเดียว

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> "Multi-tenancy is a spectrum, not a binary choice." — ระบบของคุณตอนนี้เอียงไปทาง"ความประหยัด" หรือ"ความปลอดภัย"? และถ้ามีลูกค้ายักษ์ใหญ่เข้ามาในวันพรุ่งนี้ สถาปัตยกรรมของคุณจะรับมือไหวไหม?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[../Core/04-database-sharding|Database Sharding: เมื่อ Multi-tenant เริ่มใหญ่เกินหนึ่งเครื่อง]]
- [[../Postgres/11-transactions-isolation|Transaction Isolation: ความลับของความปลอดภัยใน DB]]
- [Whitepaper: SaaS Storage Strategies on AWS](https://aws.amazon.com/blogs/apn/calculating-tenant-costs-in-a-saas-environment/)
