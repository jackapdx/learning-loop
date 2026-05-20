---
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, system-design, postgres]
---

# Window Functions (วิเคราะห์ข้อมูลโดยไม่ต้องใช้ GROUP BY)

---

## ปฐมนิเทศ (Orient)

**Window Functions ** คือหนึ่งในฟีเจอร์ที่ทรงพลังที่สุดของ SQL ที่ช่วยให้คุณรันการคำนวณข้าม"ชุดของแถว" (Window) โดยที่ยังรักษาเอกลักษณ์ของแต่ละแถวไว้ได้ (ไม่ถูกยุบรวมเหมือน`GROUP BY`)

หากคุณเคยต้องเขียน Self-join หรือ Subquery ที่ซับซ้อนเพื่อหา"ผลรวมสะสม" (Running Total) หรือ"อันดับ" (Ranking) บทเรียนนี้จะเปลี่ยนชีวิตการเขียน SQL ของคุณให้สั้นลง สะอาดขึ้น และมีประสิทธิภาพสูงขึ้น

---

## ลองทำก่อน (Attempt)

> ✍️ ** สถานการณ์:** คุณมีตารางยอดขาย (`sales`) ที่มีข้อมูลพนักงาน (`employee_id`), ยอดขาย (`amount`), และวันที่ (`sale_date`)
>
> ** คำถาม:** คุณต้องการดึงข้อมูลทุกแถวออกมา พร้อมกับเพิ่ม Column ที่แสดง"ยอดรวมยอดขายสะสมของพนักงานคนนั้นๆ ตั้งแต่วันแรกจนถึงวันที่มียอดขายนั้น" (Running Total per Employee) คุณจะเขียน SQL นี้อย่างไรโดยไม่ใช้ Subquery?

**หยุดคิดสักครู่ **— หากใช้แค่`SUM` และ`GROUP BY` คุณจะรักษาข้อมูลแต่ละรายการไว้ได้อย่างไร?

---

## ผลตอบรับ (Feedback)

| วิธีการ | การวิเคราะห์ (Senior Perspective) |
|---|---|
|"ใช้ GROUP BY และ JOIN กลับมา" | ⚠️ ทำได้จริง แต่ Code จะยาวอ่านยาก และฐานข้อมูลต้องประมวลผลซ้ำซ้อน (Self-join) |
|"เขียน Loop ใน Application Code" | ❌ ** ช้าที่สุด!** การดึงข้อมูลทั้งหมดมาคำนวณใน App จะทำให้ Network 📡 คอขวด และสูญเสียพลังของ Database 📦 Engine |
|"ใช้ Window Function:`SUM(...) OVER(...)`" | ✅ ** ถูกต้อง!** นี่คือวิธีที่คลีนและเร็วที่สุด ข้อมูลจะถูกคำนวณในรอบเดียวพร้อมกับการดึงข้อมูล |

---

## คำอธิบาย (Explain)

### Syntax พื้นฐานของ Window Functions

```sql
SELECT 
    column_name,
    FUNCTION_NAME() OVER (
        PARTITION BY group_column    -- (ไม่บังคับ) แบ่งกลุ่มข้อมูลเหมือน GROUP BY
        ORDER BY sort_column         -- (ไม่บังคับ) ลำดับการคำนวณใน Window
   )
FROM table_name;
```

### 3 กลุ่มฟังก์ชันที่พบบ่อย

#### 1. Aggregate Window Functions
ใช้ฟังก์ชันมาตรฐาน (`SUM`,`AVG`,`COUNT`) แต่ทำงานเป็น Window
```sql
-- หา Running Total ยอดขายสะสมตามพนักงาน
SELECT 
    employee_id, 
    amount,
    SUM(amount) OVER (PARTITION BY employee_id ORDER BY sale_date) as running_total
FROM sales;
```

#### 2. Ranking Functions
จัดอันดับข้อมูลภายในกลุ่ม
*  `ROW_NUMBER()`: อันดับแบบเรียงตัวเลข (1, 2, 3, 4)
*  `RANK()`: อันดับแบบข้ามเลขถ้าคะแนนเท่ากัน (1, 2, 2, 4)
*  `DENSE_RANK()`: อันดับแบบไม่ข้ามเลขถ้าคะแนนเท่ากัน (1, 2, 2, 3)

```sql
-- ใครยอดขายสูงสุด 3 อันดับแรกของแต่ละแผนก?
SELECT * FROM (
    SELECT 
        name, department, amount,
        DENSE_RANK() OVER (PARTITION BY department ORDER BY amount DESC) as rank
    FROM employee_sales
) tmp WHERE rank <= 3;
```

#### 3. Value Functions
เข้าถึงข้อมูลของแถวอื่นใน Window
*  `LAG()`: ดึงค่าจาก"แถวก่อนหน้า" (เหมาะมากสำหรับหา Growth Rate)
*  `LEAD()`: ดึงค่าจาก"แถวถัดไป"
*  `FIRST_VALUE()` /`LAST_VALUE()`: ดึงค่าแรก/ค่าสุดท้ายของ Window

```sql
-- เทียบยอดขายวันนี้กับเมื่อวาน (หา Difference)
SELECT 
    sale_date, amount,
    LAG(amount) OVER (ORDER BY sale_date) as prev_day_amount,
    amount - LAG(amount) OVER (ORDER BY sale_date) as difference
FROM daily_sales;
```

---

## ขยายความ (Extend)

### Window Frames: การกำหนดขอบเขตที่ละเอียดขึ้น
บางครั้งเราไม่ได้ต้องการคำนวณ"ทั้งหมด" แต่ต้องการคำนวณ"3 วันย้อนหลัง" หรือ"5 แถวก่อนหน้า" เราใช้`ROWS` หรือ`RANGE` ในการกำหนด Frame
```sql
-- หา Moving Average 3 วันล่าสุด
SELECT 
    sale_date, amount,
    AVG(amount) OVER (
        ORDER BY sale_date 
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
   ) as moving_avg_3_days
FROM daily_sales;
```

### ประสิทธิภาพ (Performance)
*   **Window Functions ไม่ใช่ Magic:** มันยังต้องมีการ Sort ข้อมูลภายใน หากข้อมูลมหาศาล (ล้านแถว) การทำ Index บน Column ที่ใช้ใน`PARTITION BY` และ`ORDER BY` จะช่วยให้ Window Function ทำงานเร็วขึ้นอย่างมาก
*   **Filter ข้อมูลก่อน:** พยายาม`WHERE` ข้อมูลให้เล็กลงก่อนจะรัน Window Functions เพื่อลดภาระการ Sort

---

## จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:**
ฟังก์ชันไหนที่ใช้หา"อันดับ" โดยที่ถ้าคะแนนเท่ากันให้อันดับเหมือนกัน และลำดับถัดไปไม่ข้ามตัวเลข?
หากต้องการดึงข้อมูลแชทออกมา โดยเพิ่ม Column ที่บอกว่า"ข้อความก่อนหน้านี้ส่งมาเมื่อไหร่" ต้องใช้ฟังก์ชันใด?
ความแตกต่างที่สำคัญที่สุดระหว่าง`GROUP BY` และ Window Functions คืออะไร?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>

**DENSE_RANK()**
**LAG(created_at)**
**การรักษาจำนวนแถว:**`GROUP BY` จะยุบแถวรวมกัน (Aggregation) แต่ Window Functions จะรักษาจำนวนแถวเดิมไว้ทั้งหมดพร้อมผลลัพธ์การคำนวณเพิ่มเข้ามา

</details>

---

## สะท้อนคิด (Reflect)

> 💭 ลองกลับไปดู SQL Report ที่ซับซ้อนที่สุดที่คุณเคยเขียน — มีจุดไหนที่ใช้ Subquery ซ้อนกันหลายชั้นไหม? ลองคิดดูว่าหากเปลี่ยนมาใช้ Window Functions Code ของคุณจะอ่านง่ายขึ้นและทำงานเร็วขึ้นได้กี่เท่า?

---

## หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[04-ctes-recursive\|CTEs & Recursive — การใช้งาน Window Functions ร่วมกับ CTE เพื่อความสะอาดของ Code]]
- [[10-explain-analyze\|EXPLAIN ANALYZE — วิธีตรวจสอบว่า Window Function กินทรัพยากรตรงไหน]]
- [[02-index-types\|Index Types — การใช้ Index เพื่อเร่งความเร็วในการ Sort ของ Window Function]]
