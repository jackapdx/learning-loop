---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [postgres, system-design, reliability]
---

# วิกฤต Transaction ID Wraparound (The Database Hard-Stop)

---

## 🎯 ปฐมนิเทศ (Orient)

ในโลกของ PostgreSQL มีระเบิดเวลาลูกหนึ่งที่เรียกว่า **Transaction ID (TXID) Wraparound** หากคุณไม่รู้จักมัน วันหนึ่ง Database ของคุณอาจจะหยุดรับคำสั่ง Write (INSERT/UPDATE/DELETE) ทันทีเพื่อป้องกันข้อมูลพัง และคุณจะทำอะไรไม่ได้เลยนอกจากนั่งรอ`VACUUM` ทำงานเป็นชั่วโมงหรือเป็นวัน บทเรียนนี้จะพาไปดูเบื้องหลังของ MVCC และวิธีที่ Senior Engineer ป้องกันหายนะนี้

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️**สถานการณ์**:คุณเป็น Lead Engineer ที่บริษัท Startup ที่กำลังโตเร็วมาก (Hyper-growth) ระบบของคุณประมวลผลธุรกรรมนับล้านต่อวันบน PostgreSQL
>
> คืนวันเสาร์ เวลา 03:00 น. จู่ๆ ระบบแจ้งเตือนว่า **"database is not accepting commands to avoid wraparound data loss"** และทุกอย่างกลายเป็น Read-only ทันที
>
>**คำถาม**:> 1. ทำไม PostgreSQL ถึงต้อง"หยุด" การทำงานของระบบคุณ?
> 2. คุณจะตรวจสอบได้อย่างไรว่าสถานการณ์ตอนนี้เลวร้ายแค่ไหน (เหลือเวลาอีกเท่าไหร่)?
>
>**หยุดตรงนี้ก่อน**— ลองนึกถึงความรู้เรื่อง MVCC ที่คุณมี

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"Restart เครื่องน่าจะหาย" | ❌ **อันตรายมาก!** นี่ไม่ใช่บั๊กของซอฟต์แวร์ แต่เป็นกลไกความปลอดภัย การ Restart ไม่ช่วยอะไร และอาจทำให้`VACUUM` ต้องเริ่มใหม่ |
|"เพิ่ม Disk หรือ CPU" | ⚠️**แก้ไม่ตรงจุด!** ปัญหานี้เกี่ยวกับตัวเลข Counter 32-bit ที่กำลังจะเต็ม ไม่ใช่ทรัพยากรเครื่อง |
|"รัน VACUUM FREEZE ทันที" | ✅**นี่คือคำตอบ!** คุณต้องช่วยให้ PostgreSQL"Freeze" แถวข้อมูลเก่าเพื่อให้เลข TXID กลับมาใช้ใหม่ได้ |**ทำไมคนส่วนใหญ่ถึงพลาด?** เพราะเรามักมองว่า`autovacuum` ทำงานของมันได้เองเสมอ แต่ในระบบที่ Write หนักมาก`autovacuum` อาจจะทำงานไม่ทัน หรือถูก Long-running transaction บล็อกไว้

---

## 📖 คำอธิบาย (Explain)

### 1. ทำไมต้องมี Wraparound?

PostgreSQL ใช้ **MVCC (Multi-Version Concurrency Control)** โดยทุกครั้งที่ Update ข้อมูล มันจะไม่ทับข้อมูลเก่า แต่จะสร้าง"Version ใหม่" และติดป้ายกำกับว่าแถวนี้ถูกสร้างโดย Transaction ID (TXID) ไหน

เลข TXID นี้เป็นตัวเลข **32-bit** ซึ่งมีค่าสูงสุดประมาณ **4,200 ล้าน**
- เพื่อความประหยัดเนื้อที่ PostgreSQL จึงใช้การวนซ้ำ (Circular)
- โดยกำหนดให้เลขครึ่งหนึ่ง (2,100 ล้าน) อยู่ใน"อดีต" และอีกครึ่งหนึ่งอยู่ใน"อนาคต"

### 2. จุดจบของโลก (The Wraparound)

หากเลข TXID วิ่งไปเรื่อยๆ จนวันหนึ่งมัน"วนกลับมา" ทับเลขเดิม ข้อมูลที่เคยอยู่ในอดีตจะกลายเป็นอยู่ในอนาคตทันที!
*   **ผลลัพธ์**:ข้อมูลเก่าของคุณจะ"หายตัวไป" (Invisible) เพราะ PostgreSQL คิดว่ามันยังไม่เกิดขึ้น

### 3. กลไกการป้องกัน

ก่อนจะถึงจุดตาย PostgreSQL จะเข้าสู่โหมด **Safety Shutdown**:
-**200 ล้าน TXID:** เริ่มรัน`autovacuum` แบบดุดัน (to prevent wraparound)
-**เหลือ 1 ล้านสุดท้าย:** หยุดรับคำสั่ง Write ทุกชนิด!

---

## 🔬 ขยายความ (Extend)

### วิธีการ Monitor (The Senior Way)

อย่ารอให้ระบบล่ม ให้รัน Query นี้เพื่อดูว่าจุดจบอยู่ใกล้แค่ไหน:

```sql
SELECT 
    datname, 
    age(datfrozenxid) AS age_in_txids,
    round(100 * age(datfrozenxid) / 2000000000.0, 2) AS percent_towards_wraparound
FROM pg_database
ORDER BY age_in_txids DESC;
```

*หาก`percent_towards_wraparound` เกิน 50% (1,000 ล้าน) คุณต้องเริ่มกังวลแล้ว*

### วิธีป้องกัน: การ Tuning Autovacuum

ในระบบที่ Write หนัก ค่า Default มักจะไม่พอ:

```sql
-- ปรับให้ Autovacuum ทำงานเร็วขึ้นและบ่อยขึ้น
ALTER SYSTEM SET autovacuum_vacuum_cost_limit = 1000; -- ยอมให้กิน I/O มากขึ้น
ALTER SYSTEM SET autovacuum_freeze_max_age = 500000000; -- เริ่ม Freeze เร็วขึ้นที่ 500 ล้าน
```

### ศัตรูตัวฉกาจ: Long-running Transactions

แม้คุณจะตั้ง`autovacuum` ดีแค่ไหน แต่ถ้ามีใครเปิด Transaction ค้างไว้ (Idle in transaction) นานเกินไป มันจะบล็อกไม่ให้`VACUUM` ลบข้อมูลเก่าได้เลย

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯 **Quick Check:** เลข TXID ของ PostgreSQL มีขนาดกี่ bit และรองรับได้สูงสุดเท่าไหร่?
`autovacuum` จะเริ่มทำงานแบบ"Force" (to prevent wraparound) เมื่อ TXID ถึงเท่าไหร่?
อะไรคือสาเหตุหลักที่ทำให้`VACUUM` ไม่สามารถเคลียร์ TXID ได้แม้ว่าจะตั้งค่าไว้ดีแล้ว?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>**32-bit (ประมาณ 4,200 ล้าน)** แต่ใช้จริงได้แค่ 2,100 ล้านเพราะต้องแบ่งเป็นอดีต/อนาคต **200 ล้าน**(โดย Default)
**Long-running Transactions** หรือสภาวะ **Idle in transaction** ที่ค้างไว้นานๆ ทำให้ Cleanup Horizon ไม่ขยับ

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ในระบบที่คุณดูแลอยู่ตอนนี้ คุณเคยเช็ค`age(datfrozenxid)` บ้างไหม? การที่`autovacuum` กำลังรันอยู่ ไม่ได้แปลว่ามันกำลังทำงานได้สำเร็จ การเข้าใจ"ขีดจำกัด" ของเครื่องมือที่คุณใช้ คือสิ่งที่แยกแยะระหว่างคนใช้เครื่องมือเป็น กับวิศวกรที่คุมเครื่องมือได้

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

🔗 - [[05-vacuum-mvcc\|MVCC และ VACUUM พื้นฐาน]]
- [[09-locking-concurrency\|การจัดการ Lock และ Transaction]]
