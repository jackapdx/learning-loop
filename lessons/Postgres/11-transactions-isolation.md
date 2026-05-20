---
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, system-design, postgres]
---

# Transactions & Isolation Levels (ความถูกต้องในโลกที่วุ่นวาย)

---

## ปฐมนิเทศ (Orient)

ในโลกของ Distributed Systems ข้อมูลสามารถถูกแก้ไขพร้อมกันได้จากหลายทิศทาง (Concurrency) คำถามคือ **"ฐานข้อมูลของคุณรับประกันความถูกต้อง (Consistency) ได้แค่ไหน?"**

แม้ว่า PostgreSQL จะรองรับ ACID แต่ละระดับความเข้มงวด (Isolation Levels) มีราคาที่ต้องจ่าย แลกมาระหว่าง ** ความถูกต้อง ** และ ** ความเร็ว ** บทเรียนนี้จะช่วยให้คุณตัดสินใจได้ว่า เมื่อไหร่ควรใช้ค่ามาตรฐาน (Read Committed) และเมื่อไหร่ที่ต้องยกระดับเป็น Serializable เพื่อความปลอดภัยสูงสุด

---

## ลองทำก่อน (Attempt)

> ✍️ ** สถานการณ์:** คุณกำลังทำระบบโอนเงิน (Money Transfer) Transaction ของคุณมีขั้นตอนดังนี้:
> 1.`SELECT balance FROM accounts WHERE id = 1;` (อ่านได้ 1,000 บาท)
> 2. ตรวจสอบใน Code ว่ายอดเงินพอไหม (1,000 >= 100) →"พอ"
> 3.`UPDATE accounts SET balance = balance - 100 WHERE id = 1;`
>
> ** คำถาม:** หากมี 2 Transaction ทำงานแบบเดียวกันนี้"พร้อมกัน" เป๊ะๆ มีโอกาสไหมที่ยอดเงินจะติดลบ? ทั้งที่ Postgres เป็น ACID?

**หยุดคิดสักครู่ **— ACID รับประกันว่า Transaction รันสำเร็จหรือไม่สำเร็จ แต่รับประกันว่าผลลัพธ์จะเป็นไปตามตรรกะที่คุณเขียนหรือไม่?

---

## ผลตอบรับ (Feedback)

| สิ่งที่คุณอาจคิด | การวิเคราะห์ (Senior Perspective) |
|---|---|
|"ไม่ติดลบแน่นอน เพราะมี Transaction ครอบอยู่" | ❌ ** ผิด!** ภายใต้ระดับ **Read Committed **(ค่าเริ่มต้น) ทั้ง 2 อันสามารถอ่านยอด 1,000 บาทได้พร้อมกันก่อนที่จะมีการ Commit ทำให้ทั้งคู่คิดว่าเงินพอ และหักเงินจนติดลบ |
|"ต้องใช้ SELECT FOR UPDATE ล็อกแถวไว้" | ✅ ** ถูกต้อง!** นี่คือการแก้ปัญหาที่ตรงจุดที่สุด (Pessimistic Locking 🧵) |
|"เปลี่ยน Isolation Level เป็น Serializable" | ✅ ** ถูกต้อง (ระดับทฤษฎี)!** ฐานข้อมูลจะรับผิดชอบให้เอง แต่ต้องระวัง Error และต้องมีระบบ Retry |

---

### คำอธิบาย (Explain)

PostgreSQL รองรับระดับความเข้มงวดของธุรกรรมตามมาตรฐาน SQL โดยใช้กลไก MVCC เพื่อรับประกันว่าการทำงานที่ขนานกันจะไม่ทำให้ข้อมูลสูญเสียความถูกต้อง [source: PostgreSQL Documentation — Transaction Isolation]

### 1. 4 ระดับของ Isolation ใน PostgreSQL


| Level | ความเข้มงวด | สรุปสั้นๆ |
|---|---|---|
|**Read Uncommitted **| ต่ำสุด | ใน Postgres จะทำงานเหมือน Read Committed (ไม่มี Dirty Read) |
|**Read Committed **(Default) | ปานกลาง | อ่านได้เฉพาะข้อมูลที่ Commit แล้ว แต่ข้อมูลอาจเปลี่ยนไปหากอ่านซ้ำใน Transaction เดียวกัน |
|**Repeatable Read **| สูง | รับประกันว่าอ่านกี่ครั้งใน Transaction เดียวกัน ข้อมูลจะเหมือนเดิมเสมอ |
|**Serializable ** | สูงสุด | รับประกันว่าผลลัพธ์จะเหมือนกับการรัน Transaction ทีละอันเรียงกัน (Sequential) |

### 2. ความผิดปกติที่อาจเกิดขึ้น (Anomalies)
*   **Dirty Read:** อ่านข้อมูลที่คนอื่นกำลังแก้แต่ยังไม่ Commit (Postgres ป้องกันให้เสมอ)
*   **Non-repeatable Read:** อ่านแถวเดิมซ้ำ 2 ครั้งใน Transaction เดียวกันแต่ได้ค่าไม่เท่ากัน
*   **Phantom Read:**SELECT ช่วงข้อมูลเดิม 2 ครั้ง แต่ได้จำนวนแถวไม่เท่ากัน (เพราะมีคนแทรกข้อมูลใหม่)
*   **Serialization Anomaly:** ผลลัพธ์รวมของระบบผิดพลาด แม้แต่ละ Transaction จะดูถูกต้อง (เช่น โจทย์การโอนเงินข้างต้น)

---

## ขยายความ (Extend)

### Serialization Failure: สิ่งที่ต้องเตรียมใจ
เมื่อคุณใช้`SERIALIZABLE` หรือ`REPEATABLE READ` บางครั้ง Postgres จะตอบกลับมาว่า **"ฉันทำให้ Transaction นี้สำเร็จไม่ได้เพราะมันจะขัดแย้งกับคนอื่น"**(Error 40001)
*   **ทางแก้:**Application ของคุณต้องมีกลไก **"Retry"** อัตโนมัติเมื่อเจอ Error นี้

### การเลือก Isolation Level ให้เหมาะกับงาน
*   **Read Committed:** งานส่วนใหญ่ 95% ของระบบ (เร็ว ⚡, ไม่ซับซ้อน)
*   **Repeatable Read:** งานทำ Report ที่ต้องการความนิ่งของข้อมูลตลอดการรัน
*   **Serializable:** งานที่เกี่ยวกับเงินทองหรือกฎทางธุรกิจที่ซับซ้อนและห้ามพลาดเด็ดขาด

### เทคนิคระดับ Senior: Lost Update Protection
ในการ`UPDATE` ข้อมูล อย่าเขียนแค่`SET balance = {new_val}` แต่ให้คำนวณใน SQL เลย:
```sql
UPDATE accounts SET balance = balance - 100 
WHERE id = 1 AND balance >= 100;
-- วิธีนี้จะปลอดภัยกว่ามากแม้จะอยู่ใน Read Committed
```

---

## จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:**
Isolation Level เริ่มต้นของ PostgreSQL คืออะไร?
ความผิดปกติแบบใดที่`Repeatable Read` ป้องกันได้แต่`Read Committed` ทำไม่ได้?
หากคุณได้รับ Error`serialization_failure` คุณควรทำอย่างไร?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>

**Read Committed **
**Non-repeatable Read **(และใน Postgres มันป้องกัน Phantom Read ได้ด้วย!)
**รัน Transaction นั้นใหม่อีกครั้ง (Retry)** จนกว่าจะสำเร็จ

</details>

---

## สะท้อนคิด (Reflect)

> 💭 ในแอปของคุณตอนนี้ — คุณจัดการกับ"ยอดเงิน" หรือ"จำนวนสินค้าคงเหลือ" อย่างไร? คุณพึ่งพาแค่ระดับ Isolation เริ่มต้น หรือคุณได้ใส่การล็อก (Locking 🧵) ที่รัดกุมไว้แล้ว? ความผิดพลาดเพียง 1 ในล้านครั้งในโลกของเงินทองอาจหมายถึงความเสียหายมหาศาล!

---

## หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[09-locking-concurrency\|Locking & Concurrency — วิธีใช้ SELECT FOR UPDATE เพื่อเสริมความปลอดภัยให้ Transaction]]
- [[05-vacuum-mvcc\|VACUUM & MVCC — เข้าใจว่า MVCC สร้าง Snapshot ของแต่ละ Transaction อย่างไร]]
- [[12-extensions-ecosystem\|Extensions — เครื่องมือช่วยตรวจสอบความถูกต้องของข้อมูล]]
