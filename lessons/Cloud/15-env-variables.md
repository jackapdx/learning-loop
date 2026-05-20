---
verified: false
contentType: learning-loop
level: beginner
status: polished
tags: [devops, security, configuration, 12-factor-app]
prerequisites: [core/10-monolith-microservice-monorepo]
---

# .env (การจัดการ Config ผ่าน Environment Variables)

---

## 🎯 ปฐมนิเทศ (Orient)

เมื่อพัฒนาแอปพลิเคชัน เรามักต้องใช้ข้อมูลที่เปลี่ยนแปลงตามสภาพแวดล้อม (Environment) เช่น URL ของ Database หรือความลับ (Secrets) อย่าง API Keys หากเราเขียนข้อมูลเหล่านี้ลงใน Code โดยตรง (Hardcoding) จะทำให้ไม่สามารถนำแอปพลิเคชันไปรันในสภาพแวดล้อมอื่น (เช่น นำไปรันบน Server จริง) ได้ง่ายๆ และที่ร้ายแรงที่สุดคือความเสี่ยงที่ความลับจะรั่วไหลเมื่อนำโค้ดขึ้นระบบควบคุมเวอร์ชัน (Version Control) การจัดการค่าคอนฟิกเหล่านี้อย่างปลอดภัยจึงเป็นรากฐานสำคัญของสถาปัตยกรรมซอฟต์แวร์ที่แข็งแรง

## 🧪 ลองทำก่อน (Attempt)

> **สถานการณ์:** คุณกำลังพัฒนา Node.js App และต้องการเชื่อมต่อกับ Database ในเครื่องตัวเอง (Local) แต่เมื่อ Deploy ขึ้น Server จริง (Production) Database URL จะเปลี่ยนไป นอกจากนี้ คุณใช้ API Key สำคัญของ Stripe ในการตัดเงินลูกค้า
>
> ** ข้อจำกัด:**
> - ห้ามนำ API Key และ Password ของ Production ใส่ไว้ในไฟล์ที่ถูก Commit เข้า Git เด็ดขาด (ความลับรั่วไหล)
> - ทีมพัฒนา (เพื่อนร่วมทีม) ต้องสามารถดึงโค้ดมารันในเครื่องตัวเองได้โดยรู้ว่าต้องตั้งค่าอะไรบ้าง
> - ต้องรองรับการ Deploy ผ่าน Docker หรือ Cloud Provider (เช่น Vercel, Google Cloud Run) ได้อย่างราบรื่น
>
> ** คำถาม:** วิธีใดคือวิธีที่สมดุลที่สุดในการจัดการ Database URL และ API Key ในโปรเจกต์นี้?
> 1. สร้างไฟล์`config.js` แยกต่างหากและใส่ URL กับ Key ทุกสภาพแวดล้อมไว้ในนั้น แล้ว Commit เข้า Git เพื่อให้ทุกคนใช้ได้เหมือนกัน
> 2. เขียนค่าเหล่านั้นลงใน Code ตรงๆ แต่ใช้`if-else` เช็กว่ากำลังรันอยู่ที่ไหน (เช่น`if (env === 'prod') { url = '...' }`)
> 3. ใช้การเก็บค่าไว้ระดับระบบปฏิบัติการ (Environment Variables) ดึงค่าจริงจากไฟล์ที่ถูก Ignore ใน Git และสร้างไฟล์แม่แบบทิ้งไว้ใน Git
> 4. เก็บเฉพาะ Password ไว้ในไฟล์`password.txt` ส่วน URL ปล่อยไว้ในโค้ด เพื่อให้อ่านรหัสผ่านตอนโปรแกรมเริ่มทำงาน
>
> **✋ หยุดตรงนี้ก่อน! ลองนึกถึงความเสี่ยงเมื่อคุณทำ Source Code หลุด หรือมีคนใหม่เข้ามาร่วมทีม เขาจะตั้งค่าโปรเจกต์ได้อย่างไร?**

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"config.js ใน Git" | ❌ ** อันตรายและขาดบริบท!** ความลับของคุณจะรั่วไหลสู่ระบบ Git ทันที และเมื่อ Deploy คุณต้องระวังไม่ให้ไฟล์นี้หลุดไปถึงสาธารณะ |
|"if-else ใน Code" | ⚠️ ** ไม่ยืดหยุ่น!** ความลับ (Secrets) ยังคงอยู่ใน Source Code แม้จะแยกเงื่อนไขได้ และทำให้โค้ดดูแลยากขึ้นเมื่อสภาพแวดล้อมมีหลายรูปแบบ (Dev/Staging/QA/Prod) |
|"Environment Variables" | ✅ ** คิดตามหลักปฏิบัติสากล!** วิธีนี้แยก Config ออกจาก Code ชัดเจน ไฟล์ความลับถูกเก็บแยกต่างหาก และไฟล์แม่แบบช่วยเป็นเอกสารให้ทีมรู้โครงสร้างที่ต้องใช้ |
|"password.txt" | ⚠️ ** จัดการยาก!** เป็นวิธีดั้งเดิมที่ปลอดภัยกว่า Hardcode นิดหน่อย แต่ใช้งานยากมากในยุค Container และ Cloud ที่มักส่ง Config ผ่าน Environment ของระบบปฏิบัติการ |

**ทำไมการให้เหตุผลแบบนี้สำคัญ?**
การแยก Config ออกจาก Code ไม่ใช่เพื่อความสวยงาม แต่เป็นเรื่องของ ** ความปลอดภัยของระบบ (Security)** และ ** ความสามารถในการย้ายที่รัน (Portability)** ซึ่งทำให้แอปพลิเคชันของคุณพร้อมสำหรับการทำ CI/CD และ Scale บน Cloud

### คำอธิบาย (Explain)

การแยกการตั้งค่า (Config) ออกจากโค้ดโดยใช้ Environment Variables คือหัวใจสำคัญของแอปพลิเคชันที่พร้อมสเกลและมีความปลอดภัยสูง [source: The Twelve-Factor App — III. Config]

Environment Variables คือตัวแปรที่เก็บไว้นอกโปรแกรม (ระดับ OS หรือ Container) ทำให้โปรแกรมสามารถอ้างอิงค่าเหล่านี้ได้เมื่อทำงาน

หลักการ **12-Factor App (หมวด Config)** ระบุว่า: _"แอปพลิเคชันที่ดีควรสามารถนำไป Open Source ได้ทันทีในเวลาใดก็ได้ โดยไม่มี Credentials ใดๆ หลุดออกไป"_ นั่นหมายความว่า Config ไม่ใช่ส่วนหนึ่งของ Code

### การเปรียบเทียบวิธีจัดการ Config

| Approach | สิ่งที่แก้ปัญหาได้ (Solves) | สิ่งที่ต้องแลก (What You Give Up) | เหมาะกับสถานการณ์ (Best When) |
|---|---|---|---|
|**Hardcoding / Config Files ใน Git **| ใช้งานง่ายที่สุดในตอนแรก |** ความปลอดภัย **(Secrets รั่วไหล), ความสะดวกตอน Deploy ข้าม Env | โค้ดสำหรับทดสอบสั้นๆ ที่ไม่มีความลับใดๆ |
|**Environment Variables (.env)**| แยก Config ชัดเจน, ปลอดภัยบน Git | Type Safety (ตัวแปรเป็น String ทั้งหมด), ต้องกระจายไฟล์ .env เองในทีม | โปรเจกต์ทั่วไป, ขนาดกลาง, การพัฒนาบน Local |
|**Secret Management Service **| ศูนย์รวมความลับ, ทำ Rotation ง่าย, ปลอดภัยสูงสุด | ความซับซ้อนในการเชื่อมต่อช่วงเริ่มต้น, อาจมีค่าใช้จ่าย (เช่น AWS Secrets Manager) | ระบบ Production สเกลใหญ่, สถาปัตยกรรม Microservices |

### แนวปฏิบัติที่ดีกับไฟล์สภาพแวดล้อม

-**`.env`:** ไฟล์เก็บ Config จริง (ห้าม Commit! ต้องระบุใน`.gitignore`)
-**`.env.example`:** ไฟล์แม่แบบที่มีแต่ชื่อคีย์ (Commit ได้) เพื่อเป็นคู่มือ

```bash
# .env (Local Only - ห้าม Commit เด็ดขาด)
DB_URL=postgresql://user:p@ssw0rd@localhost:5432/mydb
STRIPE_API_KEY=sk_test_your_stripe_test_key_here

# .env.example (Safe to Commit)
DB_URL=postgresql://localhost:5432/mydb
STRIPE_API_KEY=
```

```javascript
// ✅ Code ตัวอย่าง (Node.js)
require('dotenv').config();

// ⚠️ Limitation: process.env เก็บค่าเป็น String เสมอ
// ไม่ควรเชื่อถือ Type และควรทำ Validation ก่อนใช้งาน (เช่น ด้วย Zod)
const port = parseInt(process.env.PORT || '3000', 10);
const dbUrl = process.env.DB_URL;

if (!dbUrl) {
  throw new Error('Missing DB_URL environment variable');
}
```

> ** อ้างอิง:**
> - [The Twelve-Factor App — III. Config](https://12factor.net/config)
> - [Node.js Documentation — process.env](https://nodejs.org/api/process.html#processenv)

## 🔬 ขยายความ (Extend)

### ควรใช้ Environment Variables เมื่อ...

- ✅ เก็บ Credentials และ Secrets (API Keys, Passwords, Access Tokens)
- ✅ เก็บค่า Endpoint ที่เปลี่ยนตาม Environment (URL ของ Database หรือ External API)
- ✅ ควบคุม Feature Flags เพื่อเปิด/ปิดฟีเจอร์โดยไม่ต้องแก้โค้ดและ Deploy ใหม่

### ควรหลีกเลี่ยงการพึ่งพาแต่ไฟล์ .env เมื่อ...

- ❌ จำนวนตัวแปร Config เพิ่มเป็นหลักหลายร้อยตัว (ควรเปลี่ยนไปใช้ Config Server หรือ Consul)
- ❌ เป็นระบบโครงสร้างพื้นฐานระดับสูง ที่ต้องหมุนเวียน (Rotate) รหัสผ่านทุกๆ วันโดยอัตโนมัติ (ควรใช้ Secret Manager แทน)

### สิ่งที่ต้องแลก (Trade-offs)

-**Validation Issues:** แอปพลิเคชันอาจพังระหว่างทำงาน (Runtime Error) หากลืมตั้งค่าตัวแปรในระบบ Production แนะนำให้ใช้เครื่องมือเช็ก (Schema Validation) ตั้งแต่แอปเริ่มทำงาน
-**Secret Sprawl:** เมื่อมี Microservices หลายตัว การจัดการไฟล์เหล้านี้ของทุกตัวบนเครื่องนักพัฒนาจะเริ่มสร้างความสับสน

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. ทำไมเราจึงจำเป็นต้องมีไฟล์`.env.example` ควบคู่ไปกับไฟล์ที่มีค่าจริง?
> 2. สมมติว่าคุณเผลอ Push ไฟล์ความลับที่มี Database Password ของ Production ขึ้น GitHub สู่สาธารณะ การลบไฟล์นั้นออกแล้ว Commit ทับใหม่ ปลอดภัยเพียงพอหรือไม่?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.** เพื่อการสื่อสารในทีม **— ไฟล์แม่แบบไม่เก็บความลับ แต่ทำหน้าที่บอกเพื่อนร่วมทีมหรือผู้ที่มารับงานต่อว่า"แอปพลิเคชันนี้ต้องใช้ตัวแปรอะไรบ้างถึงจะรันได้"
2.** ไม่เพียงพอและอันตรายมาก **— เพราะ Git เก็บประวัติย้อนหลังไว้ทั้งหมด ใครก็ตามสามารถดู History และนำ Password ไปใช้ได้ การแก้ไขที่ถูกต้องคือ **(1) เปลี่ยน Password นั้นทิ้งทันที **(Revoke/Rotate) และ (2) อาจใช้คำสั่งลบประวัติ Git ด้วยเครื่องมืออย่าง BFG หรือ`git-filter-repo`

</details>

## 🤔 สะท้อนคิด (Reflect)

> ในโปรเจกต์ปัจจุบันของคุณ มี API Key หรือ Token ใดที่ถูกฮาร์ดโค้ดฝังไว้ในไฟล์ซอร์สโค้ดบ้างหรือไม่? ถ้าโค้ดโปรเจกต์นี้หลุดเป็นสาธารณะวันนี้ ความเสียหายจะรุนแรงแค่ไหน?

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[11-zero-downtime-deployment|Zero-downtime Deployment]]
- [[../Cloud/04-iam-security|Cloud/IAM Security]]
- [[../Postgres/06-connection-pooling-replicas|Postgres/Connection Pooling]]
