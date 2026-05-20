---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, system-design, postgres]
---

# CTEs & Recursive Queries (จัดการข้อมูลแบบโครงสร้างต้นไม้)

---

## 🎯 ปฐมนิเทศ (Orient)

**CTE (Common Table Expression)** คือการสร้าง"ตารางเสมือนชั่วคราว" เพื่อให้ SQL ของคุณอ่านง่ายขึ้นและแบ่งสัดส่วนได้ชัดเจน แต่ความสามารถที่แท้จริงที่แยก Senior ออกจาก Junior คือ **Recursive CTE** ซึ่งเป็นวิธีเดียวในมาตรฐาน SQL ที่ใช้จัดการกับข้อมูลที่มีความสัมพันธ์เป็นลำดับชั้น (Hierarchical Data) หรือโครงสร้างแบบกราฟ (Graph) ได้อย่างมีประสิทธิภาพ

ในบทนี้ คุณจะได้เรียนรู้วิธีการใช้ CTE เพื่อทำให้ Code สะอาดขึ้น และการใช้ Recursion เพื่อแก้โจทย์ที่ดูเหมือนเป็นไปไม่ได้ใน SQL ธรรมดา

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️**สถานการณ์**:คุณมีตารางพนักงาน (`employees`) ที่มี Column`id`,`name`, และ`manager_id` (ซึ่งชี้กลับไปที่`id` ของหัวหน้า)
>
>**คำถาม**:หากคุณต้องการดึงรายชื่อพนักงานทุกคนที่อยู่"ภายใต้สายการบังคับบัญชา" ของ CEO (รวมถึงลูกน้องของลูกน้อง และถัดลงไปเรื่อยๆ ไม่จำกัดชั้น) คุณจะเขียน SQL อย่างไร?**หยุดคิดสักครู่**— หากคุณไม่รู้จำนวนชั้นที่แน่นอน คุณจะเขียน`JOIN` กี่ครั้งถึงจะพอ?

---

## 💬 ผลตอบรับ (Feedback)

| วิธีการ | การวิเคราะห์ (Senior Perspective) |
|---|---|
|"JOIN ตารางตัวเองซ้ำๆ 5-6 ครั้ง" | ⚠️ ไม่ยืดหยุ่น! หากโครงสร้างองค์กรลึกกว่า 6 ชั้น ข้อมูลก็จะหายไป และ Code จะยาวเหยียดอ่านยาก |
|"ดึงข้อมูลทั้งหมดมาจัดการใน Application" | ❌ **อันตราย!** หากบริษัทมีพนักงานหลักแสนคน การดึงข้อมูลทั้งหมดมาสร้าง Tree ใน RAM จะทำให้ระบบช้าและเปลือง Memory มหาศาล |
|"ใช้ Recursive CTE" | ✅**ถูกต้อง!** นี่คือวิธีที่ทรงพลังที่สุด ฐานข้อมูลจะทำ Recursion ให้เองจนกว่าจะครบทุกชั้น โดยส่งกลับมาเป็นชุดข้อมูลเดียว |

---

## 📖 คำอธิบาย (Explain)

### 1. Basic CTE (Non-Recursive)

เปรียบเสมือนการสร้างตัวแปรเพื่อเก็บผลลัพธ์ของ Query หนึ่งไว้ใช้ใน Query ถัดไปภายในคำสั่งเดียว

```sql
WITH regional_sales AS (
    SELECT region, SUM(amount) as total_sales
    FROM orders
    GROUP BY region
),
top_regions AS (
    SELECT region
    FROM regional_sales
    WHERE total_sales > 1000000
)
SELECT * FROM orders WHERE region IN (SELECT region FROM top_regions);
```

### 2. Recursive CTE (หัวใจของบทนี้)

โครงสร้างประกอบด้วย 2 ส่วนหลัก เชื่อมด้วย`UNION ALL`:
**Anchor Member:** จุดเริ่มต้น (เช่น หาตัว CEO)**Recursive Member:** การหาลูกน้องในชั้นถัดไป โดยอ้างอิงจากผลลัพธ์ก่อนหน้า

```sql
WITH RECURSIVE org_chart AS (
    -- 1. Anchor: เริ่มที่ CEO
    SELECT id, name, manager_id, 1 as level
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- 2. Recursive: หาคนที่มี manager_id ตรงกับ id ในรอบก่อนหน้า
    SELECT e.id, e.name, e.manager_id, oc.level + 1
    FROM employees e
    INNER JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT * FROM org_chart ORDER BY level;
```

---

## 🔬 ขยายความ (Extend)

### Materialized CTE (PostgreSQL 12+)

โดยปกติ PostgreSQL จะพยายามเอา CTE ไปยุบรวมกับ Main Query (Inlining) เพื่อ Optimize แต่บางครั้งเราอยากให้มันรันแยกกันและเก็บผลลัพธ์ชั่วคราวไว้เลย เราใช้`MATERIALIZED`

```sql
WITH expensive_query AS MATERIALIZED (
    SELECT ... -- Query ที่รันนานๆ
)
SELECT * FROM expensive_query; -- จะดึงจากที่คำนวณไว้แล้ว
```

### การป้องกัน Infinite Loop

ในการทำ Recursive กับข้อมูลแบบ Graph (เช่น เพื่อนแนะนำเพื่อน) อาจเกิดการวนลูปได้ เราควรมีกลไกป้องกัน เช่น การเก็บเส้นทาง (Path) ที่เคยไปมาแล้ว

```sql
WITH RECURSIVE search_graph(id, link, path, cycle) AS (
    SELECT id, link, ARRAY[id], false FROM graph
    UNION ALL
    SELECT g.id, g.link, path || g.id, g.id = ANY(path)
    FROM graph g, search_graph sg
    WHERE g.id = sg.link AND NOT cycle
)
SELECT * FROM search_graph;
```

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯 **Quick Check:** ส่วนประกอบ 2 ส่วนของ Recursive CTE ที่เชื่อมด้วย`UNION ALL` เรียกว่าอะไรบ้าง?
การใช้ CTE ดีกว่าการใช้ Subquery ปกติในแง่ใดมากที่สุด?
หากต้องการดึงข้อมูลหมวดหมู่สินค้า (Categories) ที่ซ้อนกันหลายชั้น (Parent/Child) ควรใช้อะไร?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>**Anchor Member** และ **Recursive Member**
**Readability & Reusability:** Code อ่านง่ายขึ้นมากเพราะแบ่งเป็นสัดส่วน และเรียกใช้ซ้ำได้ใน Query เดียวกัน
**Recursive CTE**

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ลองนึกถึงฟีเจอร์"Comment Threads" (การตอบกลับคอมเมนต์ซ้อนกันหลายชั้น) ในแอปพลิเคชันของคุณ — ตอนนี้คุณดึงข้อมูลมาแสดงผลอย่างไร? หากใช้ Recursive CTE คุณจะลดความซับซ้อนของ Code หลังบ้านลงไปได้มากแค่ไหน?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[03-window-functions\|Window Functions — การใช้ Window Functions ร่วมกับ CTE เพื่อวิเคราะห์ข้อมูลเป็นขั้นตอน]]
- [[12-extensions-ecosystem\|Extensions — เครื่องมือเสริมที่ช่วยจัดการกราฟข้อมูลได้ลึกซึ้งกว่าเดิม]]
- [[10-explain-analyze\|EXPLAIN ANALYZE — วิธีเช็คว่า Recursive Query ของคุณทำงานหนักแค่ไหน]]
