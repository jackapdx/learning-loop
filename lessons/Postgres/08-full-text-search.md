---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [chat-exp, system-design, postgres]
---

# Full-Text Search (สร้างระบบค้นหาในตัวโดยไม่ต้องใช้ Elasticsearch)

---

## 🎯 ปฐมนิเทศ (Orient)

เมื่อคุณต้องทำระบบค้นหาข้อความ (Search) หลายคนมักนึกถึงคำสั่ง`LIKE '%keyword%'` แต่เมื่อข้อมูลเริ่มใหญ่ขึ้น วิธีนี้จะช้าจนใช้งานไม่ได้ และไม่สามารถจัดลำดับความสำคัญ (Ranking) หรือจัดการกับคำที่เขียนต่างกันแต่ความหมายเหมือนกันได้

PostgreSQL มาพร้อมกับ **Full-Text Search (FTS)** ในตัว ซึ่งทรงพลังพอที่จะจัดการข้อมูลหลักล้านแถวได้โดยไม่ต้องติดตั้งระบบแยกอย่าง Elasticsearch บทเรียนนี้จะสอนวิธีใช้`tsvector`,`tsquery` และการทำ Index เพื่อให้ระบบ Search ของคุณเร็วและฉลาดขึ้น

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️ ** สถานการณ์:** คุณมีตารางบทความ (`articles`) 10 ล้านแถว คุณต้องการค้นหาคำว่า"Database 📦 Optimization" ในเนื้อหาบทความ
>
> ** คำถาม:** ระหว่างการใช้`WHERE content LIKE '%Database 📦%' AND content LIKE '%Optimization%'` กับการใช้ PostgreSQL Full-Text Search แบบไหนจะเร็วกว่ากัน? และแบบไหนจะให้ผลลัพธ์ที่"แม่นยำ" กว่า (เช่น ค้นหาคำว่า"optimized" แล้วเจอคำว่า"optimization" ด้วย)?

**หยุดคิดสักครู่ **— ความเร็วสำคัญ แต่ความฉลาดในการค้นหาก็สำคัญไม่แพ้กัน...

---

## 💬 ผลตอบรับ (Feedback)

| วิธีการค้นหา | การวิเคราะห์ (Senior Perspective) |
|---|---|
|"ใช้ LIKE '%...%'" | ❌ ** ช้าและโง่!** ฐานข้อมูลต้องสแกนทุกแถว (Sequential Scan) และไม่สามารถหาคำที่เขียนต่างกันนิดหน่อยได้ (เช่น Singular/Plural หรือ Stemming) |
|"ติดตั้ง Elasticsearch/Algolia" | ⚠️ ดีที่สุดในเชิงฟีเจอร์ แต่ต้องแลกมาด้วยความซับซ้อนในการ Sync ข้อมูล และค่าใช้จ่ายที่เพิ่มขึ้น |
|"ใช้ PostgreSQL Full-Text Search" | ✅ ** ทางเลือกที่สมดุล!** เร็วมาก (ใช้ GIN Index) รองรับการทำ Ranking และ Stemming โดยที่ข้อมูลไม่ต้องออกจากฐานข้อมูลเลย |

---

### คำอธิบาย (Explain)

PostgreSQL FTS เป็นตัวเลือกที่ยอดเยี่ยมสำหรับระบบที่ต้องการความเร็วและความถูกต้องของข้อมูล (Consistency) โดยไม่ต้องแบกรับภาระในการจัดการระบบค้นหาแยกต่างหาก [source: ParadeDB — PostgreSQL FTS vs. Elasticsearch]

### 1. สองหัวใจหลักของ FTS

*   **`tsvector` (Text Search Vector):** การแปลงข้อความให้เป็น"รายการของคำสำคัญ" ที่ฐานข้อมูลเข้าใจและค้นหาได้เร็ว ⚡
*   **`tsquery` (Text Search Query):** รูปแบบการเขียนคำค้นหาที่รองรับ Operator อย่าง`&` (AND),`|` (OR), และ`!` (NOT)

```sql
-- ค้นหาบทความที่มีคำว่า 'database' และ 'sql'
SELECT title 
FROM articles 
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'database & sql');
```

### 2. Stemming: การลดรูปคำ
PostgreSQL ฉลาดพอที่จะรู้ว่า`running`,`runs`,`ran` มาจากรากศัพท์เดียวกันคือ`run` ทำให้คุณค้นหาได้กว้างและแม่นยำขึ้น

### 3. GIN Index: อาวุธลับความเร็วสูง
เพื่อให้ Search ทำงานได้ในระดับมิลลิวินาที เราต้องสร้าง Index ประเภท GIN บน Column ที่เป็น`tsvector`
```sql
-- แนะนำให้สร้างเป็น Generated Column เพื่อความเร็วสูงสุด
ALTER TABLE articles ADD COLUMN content_tsv tsvector 
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX idx_content_fts ON articles USING GIN (content_tsv);
```

### 4. Ranking & Highlighting: ทำให้เหมือน Google
*   **`ts_rank`:** ให้คะแนนความเกี่ยวข้อง (เช่น คำที่หาปรากฏบ่อยแค่ไหน หรืออยู่ใกล้กันไหม)
*   **`ts_headline`:** ทำตัวหนาครอบคำที่ค้นหาเพื่อแสดงใน UI

```sql
SELECT title, ts_rank(content_tsv, query) as rank
FROM articles, to_tsquery('english', 'postgres') query
WHERE content_tsv @@ query
ORDER BY rank DESC;
```

---

## 🔬 ขยายความ (Extend)

### การค้นหาหลายภาษา (Multi-language)
PostgreSQL รองรับพจนานุกรมหลายภาษา หากคุณทำแอปที่รองรับทั้งไทยและอังกฤษ คุณสามารถเก็บค่า`language` ไว้ในตารางและเรียกใช้ใน`to_tsvector` ได้ (สำหรับภาษาไทยอาจต้องใช้ Extension เพิ่มเติม เช่น`icu` หรือ`pg_thai`)

### เมื่อไหร่ที่ควรย้ายไป Elasticsearch?
แม้ Postgres จะเก่งมาก แต่หากคุณต้องการฟีเจอร์เหล่านี้ Elasticsearch จะทำได้ดีกว่า:
*   **Fuzzy Search:** เช่น พิมพ์ผิด (Typo) แล้วยังหาเจอ (Postgres ทำได้ผ่าน`pg_trgm` แต่ไม่ยืดหยุ่นเท่า)
*   **Faceting/Aggregations:** เช่น การทำฟิลเตอร์ข้างหน้าจอว่า"มีสินค้าในหมวดหมู่นี้กี่ชิ้น" สำหรับข้อมูลมหาศาล
*   **Suggestions:** ระบบเดาคำค้นหา (Auto-complete)

---

## ✅ จุดตรวจสอบ (Checkpoint)

🎯**Quick Check:**
ฟังก์ชันใดที่ใช้แปลงข้อความเป็นรูปแบบที่ค้นหาได้เร็ว ⚡?
Operator ใดใน`tsquery` ที่ใช้แทนเงื่อนไข OR?
ทำไมการใช้`tsvector` คู่กับ GIN Index ถึงเร็วกว่าการใช้`LIKE`?

<details>
<summary>ดูเฉลย (คลิกเพื่อเปิด)</summary>

**`to_tsvector()`**
**`|`**(Pipe)
เพราะ GIN Index คือ **Inverted Index **(เหมือนสารบัญท้ายเล่ม) ที่บอกตำแหน่งของคำแต่ละคำไว้แล้ว ทำให้ไม่ต้องสแกนหาข้อความในทุกแถวใหม่

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 หากระบบ Search ของคุณตอนนี้ยังเป็น`LIKE` และกำลังเริ่มช้าลง ลองเปลี่ยนมาใช้ Full-Text Search ใน PostgreSQL ดูสิ — คุณจะได้ระบบที่"ฉลาดขึ้น" และ"เร็วขึ้น" โดยไม่ต้องเสียเงินเพิ่มแม้แต่บาทเดียว!

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[02-index-types\|Index Types — เจาะลึก GIN Index และความแตกต่างจาก B-tree]]
- [[07-json-jsonb\|JSON & JSONB — การทำ Full-Text Search บนข้อมูล JSON]]
- [[12-extensions-ecosystem\|Extensions — การใช้`pg_trgm` เพื่อทำ Fuzzy Search ใน Postgres]]
