---
verified: false
contentType: overview
level: senior
status: polished
tags: [chat-exp, system-design, observability, sre, monitoring]
---

# Observability & SRE — ศิลปะการมองเห็นสิ่งที่ซ่อนอยู่ในระบบ

> [!info] ปฐมนิเทศ
> ระบบที่ล่มไม่ใช่สิ่งที่น่ากลัวที่สุด แต่ระบบที่"กำลังจะล่ม" หรือ"ล่มแบบเงียบๆ" โดยที่คุณไม่รู้ตัวต่างหากที่น่ากลัวที่สุด
>
> ซีรีส์นี้จะเปลี่ยนคุณจากคนที่คอยเช็คแค่ว่า"Server ยังรันอยู่ไหม?" (Up/Down) ให้กลายเป็นวิศวกรที่เข้าใจทุกจังหวะการเต้นของหัวใจระบบ ผ่านหลักการ **Levels of Monitoring** และเครื่องมือยอดนิยมอย่าง **LGTM Stack**>
> Each lesson takes **5-10 minutes** based on the **Learning Loop** principle.

## 🗺️ แผนผังการเรียนรู้ (Roadmap)

### Path A: The Strategy (What to measure?) → #1

[[01-monitoring-levels|Levels of Monitoring]] — เข้าใจ Golden Signals, RED และ USE Methods เพื่อเลือก Metrics ที่ถูกต้อง

### Path B: The Tools (How to measure?) → #2

[[02-lgtm-stack|The LGTM Stack]] — เจาะลึกการทำงานร่วมกันของ Grafana, Prometheus, Loki และ Tempo

## 📋 รายชื่อบทเรียนทั้งหมด (Lesson List)

| # | บทเรียน | คำถามสัมภาษณ์ |
|---|---|---|
| 1 | [[01-monitoring-levels\|Monitoring Levels]] |"คุณจะรู้ได้อย่างไรว่าระบบช้าลงเพราะ CPU เต็ม หรือเพราะ Database 📦 Lock?" |
| 2 | [[02-lgtm-stack\|LGTM Stack]] |"ความแตกต่างระหว่าง Logs, Metrics และ Traces คืออะไร? และเมื่อไหร่ควรใช้ตัวไหน?" |

> [!question] ลองทำก่อน
> หากระบบของคุณเริ่มตอบสนองช้า (High Latency) แต่ CPU และ RAM ของเซิร์ฟเวอร์ยังเหลือเฟือ:
> 1. คุณจะเช็คที่จุดไหนเป็นอันดับแรก?
> 2. Metrics ตัวไหนที่จะบอกคุณได้ว่าคอขวดอยู่ที่"คิว" (Queue) หรือ"การรอทรัพยากร" (Wait Time)?
>
> หยุดคิด 30 วินาที... แล้วเริ่มเรียนบทที่ 1
