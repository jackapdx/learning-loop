---
contentType: learning-loop
level: senior
status: polished
tags: [database, backup, postgres, disaster-recovery, rpo, rto, wal]
prerequisites: []
---

# Database Backup Fundamentals (พื้นฐานการสำรองฐานข้อมูล)

---

## 🎯 ปฐมนิเทศ (Orient)

"เรามี backup อยู่แล้ว — รัน`pg_dump` ทุกคืน" — ประโยคนี้ฟังดูปลอดภัย แต่ในโลกความเป็นจริง มันอาจแปลว่าคุณยอมรับ Data Loss ได้สูงสุด 23 ชั่วโมง 59 นาที และยอมให้ธุรกิจหยุดนิ่งเป็นวันระหว่างรอ restore ฐานข้อมูลขนาด 2TB

การสำรองฐานข้อมูลไม่ใช่แค่"มี backup file ไว้ที่ไหนสักแห่ง" มันคือการออกแบบระบบที่ตอบคำถาม 3 ข้อ: **ข้อมูลจะเสียหายแค่ไหน (RPO)?**,** ระบบจะกลับมาใช้ได้เมื่อไหร่ (RTO)?**, และ ** คุณแน่ใจได้ยังไงว่า restore จะสำเร็จ (Backup Testing)?**

---

## 🧪 ลองทำก่อน (Attempt)

> ** สถานการณ์:** คุณดูแลฐานข้อมูล PostgreSQL ขนาด 500GB สำหรับระบบ E-commerce ที่มี transaction เฉลี่ย 2,000 รายการ/นาที มูลค่าธุรกรรมรวม ~$50K/ชั่วโมง ทีม infrastructure มี 3 คน (รวมคุณ)
>
> ** ข้อจำกัด:**
> - Budget สำหรับ storage เพิ่มเติม: $500/เดือน
> - ระบบต้องกลับมาให้บริการได้ภายใน 2 ชั่วโมงหลังจาก incident (SLA)
> - ฐานข้อมูลรันบน bare-metal server เดียว — ไม่มี managed service
> - Disk I/O ของ server ถูกใช้งานอยู่ที่ ~60% ในช่วงกลางคืน, ~85% ในช่วงกลางวัน
>
> ** คำถาม:** คุณจะออกแบบ backup strategy อย่างไรให้ตอบโจทย์ทั้ง Recovery Time, Data Loss, และ Budget? ระบุประเภทของ backup, ความถี่, และเครื่องมือที่คุณจะใช้ —** พร้อมอธิบายว่าคุณกำลัง trade-off อะไร **
>
> **✋ หยุดตรงนี้ก่อน **— ลองคิด strategy สัก 60 วินาที ก่อนเลื่อนลงอ่าน Feedback

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"รัน`pg_dump` ทุกคืนตอนตี 3 แล้วเก็บไฟล์ไว้ใน disk ลูกเดียวกัน" | ⚠️ ** ขาดบริบทด้าน Disaster Recovery!** คำตอบนี้จัดการได้แค่"เผลอลบข้อมูล" แต่ถ้า disk ลูกนั้นพัง — ทั้ง database และ backup หายพร้อมกัน คุณยังไม่ได้คิดเรื่อง off-site storage และ RPO ของคุณคือ 24 ชม. ซึ่งแปลว่าเสียรายได้ $1.2M (24 × $50K) |
|"ใช้`pg_basebackup` ทุกวัน + WAL archiving ไป S3" | ⚠️ ** ใกล้เคียง!** แต่ยังไม่ได้ตอบว่า WAL archiving อย่างเดียวพอหรือไม่ —`pg_basebackup` ทุกวันจะใช้ I/O สูง (500GB full copy) ซึ่งที่ disk utilization 60% ตอนกลางคืน อาจทำให้ restore ล้มเหลวเพราะ I/O แข่งกับ production และคุณต้องมีคนเขียน script จัดการ base backup + WAL cleanup เอง — ทีมมีแค่ 3 คน |
|"ใช้ WAL-G ทำ weekly full backup + continuous WAL archiving ไป S3 +`pg_dump` รายวันสำหรับ quick restore ของ single table. Full backup ตอนสุดสัปดาห์ตอนโหลดต่ำสุดเพื่อลดผลกระทบ" | ✅ ** คิดเป็นระบบ!** คุณแบ่ง backup เป็น 3 ระดับ: (1) WAL-G สำหรับ disaster recovery แบบ PITR — RPO ~0 ถ้า WAL ถูก archive ทัน, (2) Full backup รายสัปดาห์เพื่อลด I/O overhead — trade-off คือ RPO เพิ่มเป็น 1 สัปดาห์ถ้า WAL archive เสียหาย, (3)`pg_dump` รายวันสำหรับ quick restore เฉพาะจุดโดยไม่ต้อง restore ทั้ง cluster คุณยอมรับ operational complexity ที่สูงขึ้นเพื่อแลกกับ RPO ที่ดีขึ้น — นี่คือ Senior-level trade-off thinking |

**ทำไมการให้เหตุผลแบบนี้สำคัญ?** เพราะในโลกจริง ไม่มี"backup strategy ที่ดีที่สุด" — มีแต่ strategy ที่ยอมรับ trade-off ชุดหนึ่งเพื่อให้ได้ outcome อีกชุดหนึ่ง คนที่บอกว่า"ใช้ tool X ก็จบ" โดยไม่ระบุว่าต้องแลกอะไร — ยังไม่พร้อมดูแล production

---

## 📖 คำอธิบาย (Explain)

### ทำไม Backup ถึงไม่ใช่แค่"copy ไฟล์ไว้"?

ปัญหาใหญ่ที่สุดของ backup คือ **illusion of safety **— การมีไฟล์ backup อยู่ไม่ได้แปลว่าคุณจะ restore ได้  Three core concepts ที่กำหนดคุณภาพของ backup:

#### 1. RPO (Recovery Point Objective) — ข้อมูลหายได้แค่ไหน?

**RPO คือระยะเวลาสูงสุดของข้อมูลที่คุณยอมให้สูญหาย ** วัดเป็นหน่วยเวลา

| RPO | ความหมาย | Backup Strategy ที่ต้องใช้ | ต้นทุนที่เพิ่มขึ้น |
|---|---|---|---|
| 24 ชม. | ยอมเสียข้อมูล 1 วัน |`pg_dump` รายวัน | ต่ำสุด — disk space ค่าไฟล์ dump |
| 1 ชม. | ยอมเสียข้อมูล 1 ชม. | WAL archiving ทุกชั่วโมง + daily base backup | ปานกลาง — S3 storage + WAL management |
| ~0 (secs) | แทบไม่เสียข้อมูล | Continuous WAL archiving (archive ทุก 16MB WAL segment) | สูง — storage cost ของ WAL segments, network bandwidth, monitoring |

> **Key insight:**RPO ไม่ใช่ technical decision — มันคือ **business decision ** ที่วิศวกรต้อง translate เป็น technical architecture [source: PostgreSQL docs — Continuous Archiving]

#### 2. RTO (Recovery Time Objective) — ระบบจะกลับมาเมื่อไหร่?

**RTO คือระยะเวลาสูงสุดที่ระบบจะกลับมาให้บริการได้ ** วัดเป็นหน่วยเวลา

| RTO | สิ่งที่ต้องมี | Trade-off |
|---|---|---|
| 1-2 วัน | Full backup + manual restore procedure | operationally cheap — แต่ธุรกิจหยุดนาน |
| 2-4 ชม. | Automated restore script + pre-tested procedure | complexity เพิ่ม — ต้อง maintain script และ test สม่ำเสมอ |
| < 15 นาที | Hot standby + automated failover | cost สูงสุด — ต้องมี replica running ตลอดเวลา |

#### 3. Backup Testing — คุณ restore ได้จริงไหม?

>"A backup isn't a backup until you've restored from it." — ภูมิปัญญาชาว DBA

Crunchy Data แนะนำให้ทดสอบ restore อย่างน้อยทุกเดือน [source: Crunchy Data — Introduction to Postgres Backups] โดยเฉพาะอย่างยิ่ง:
- ทดสอบ restore ** ทั้งระบบ ** ไม่ใช่แค่บาง table
- วัดเวลาจริงจาก start restore จนแอพกลับมาใช้ได้
- จำลอง disaster scenario จริง: disk failure, accidental DROP, ransomware

### ประเภทของ Backup — Logical vs Physical

นี่คือจุดตัดสินใจแรกที่สำคัญที่สุด:

| | Logical Backup (`pg_dump`) | Physical Backup (WAL-based) |
|---|---|---|
|** คืออะไร **| SQL representation ของข้อมูล —`CREATE TABLE ... INSERT INTO ...` | File-level copy ของ data directory + WAL segments |
|**Restore speed **| ช้ามาก (ต้อง rebuild indexes) | เร็ว (copy files + replay WAL) |
|**Granularity **| ✅ Restore ได้ทีละ table / database | ❌ ต้อง restore ทั้ง cluster |
|**Cross-version **| ✅ Restore ข้าม PostgreSQL version ได้ | ❌ ต้องเป็น major version เดียวกัน |
|**PITR **| ❌ Restore ได้เฉพาะจุดที่ dump | ✅ Restore ได้ทุกวินาทีที่ WAL ถูก archive |
|**I/O impact **| Sequential scan ทั้งตาราง — อาจกระทบ production | File copy + streaming WAL — ใช้ I/O น้อยกว่าเมื่อใช้ delta/incremental |
|** ขนาด backup **| เล็กกว่า (ไม่มี indexes) | ใหญ่กว่า (copy ทั้ง data directory) |

> ** ข้อควรระวัง:**`pg_dump` บนฐานข้อมูลขนาดใหญ่ (500GB+) อาจใช้เวลาหลายชั่วโมง และระหว่างนั้น MVCC จะเก็บ row versions เก่าไว้จนกว่า dump จะเสร็จ — ซึ่งอาจทำให้เกิด table bloat และ performance degradation [source: Crunchy Data blog]

---

## 🔬 ขยายความ (Extend)

### WAL (Write-Ahead Log) คือหัวใจของ Physical Backup

Write-Ahead Log คือกลไกที่ PostgreSQL บันทึกทุกการเปลี่ยนแปลงก่อนลง data files จริง — เพื่อให้ crash recovery ทำได้ WAL ถูกแบ่งเป็น segments ขนาด 16MB (default) และเมื่อ segment เต็ม PostgreSQL จะสร้าง segment ใหม่

**สำหรับ backup:** คุณตั้งค่า`archive_command` ใน`postgresql.conf` เพื่อให้ PostgreSQL ส่ง WAL segment ที่เต็มแล้วไปยังที่เก็บสำรอง (S3, NFS, local path):

```bash
# ตัวอย่าง: ส่ง WAL ไปยัง WAL-G
archive_command = 'wal-g wal-push %p'

# หรือใช้ pgBackRest
archive_command = 'pgbackrest --stanza=main archive-push %p'
```

⚠️ **Limitation:** ถ้า`archive_command` fail — PostgreSQL จะ ** เก็บ WAL segment นั้นไว้ ** และไม่สร้าง segment ใหม่ ซึ่งอาจทำให้`pg_wal` directory เต็มและ database ** หยุดทำงาน ** คุณต้องมี monitoring สำหรับ archive status

### RPO/RTO Matrix — การเลือก Strategy

```sql
-- ✅ ตัวอย่าง: strategy สำหรับ RPO < 1 นาที, RTO < 2 ชม.
/*
  1. Continuous WAL archiving via WAL-G → RPO ~seconds
  2. Weekly full backup via WAL-G → base for PITR
  3. Daily pg_dump for quick single-table restore
  4. Restore tested monthly on staging
  5. Monitoring: archive_command latency, WAL segment backlog, backup age
  
  ⚠️ สิ่งที่ต้องแลก:
  - Storage cost: S3 เก็บ WAL + full backups ~1.5× database size
  - Operational: ต้อง monitor archive_command failure, WAL lag
  - Complexity: ต้องการ automated restore script + runbook
*/
```

### Decision Framework: เมื่อไหร่ควรใช้ Backup แต่ละประเภท

#### ควรใช้ Logical Backup (`pg_dump`) เมื่อ...
- ✅ ต้องการ restore เฉพาะ table หรือ database เดียว
- ✅ กำลัง upgrade PostgreSQL major version
- ✅ ฐานข้อมูลขนาดเล็กกว่า 50GB
- ✅ ต้องการ corruption check (pg_dump scan ทั้งตาราง ถ้าเจอ corruption จะ throw error)

#### ควรหลีกเลี่ยง`pg_dump` เมื่อ...
- ❌ ฐานข้อมูล > 100GB (restore ช้าเพราะต้อง rebuild indexes)
- ❌ ต้องการ RPO < 1 ชม.
- ❌ Production มีโหลดสูงตลอดเวลา (sequential scan จะกระทบ performance)

#### ควรใช้ Physical Backup + WAL Archiving เมื่อ...
- ✅ ต้องการ PITR (RPO เป็นวินาที)
- ✅ ฐานข้อมูล > 100GB
- ✅ ต้องการ restore ทั้ง cluster อย่างรวดเร็ว

#### ควรหลีกเลี่ยง Physical Backup เมื่อ...
- ❌ ทีมไม่มี bandwidth จัดการ operational complexity (monitoring, alerting, testing)
- ❌ ใช้ managed database ที่มี built-in PITR (RDS, Cloud SQL) — WAL-G ไม่สามารถ restore เข้า managed instance ได้โดยตรง
- ❌ ต้องการ cross-version restore

### Production Gotchas

1. **`archive_command` failure = database freeze **— PostgreSQL จะไม่ยอมให้ WAL segment ใหม่ถูกสร้างจนกว่า segment ปัจจุบันจะถูก archive สำเร็จ ต้องมี`archive_timeout` เพื่อ force segment rotation
2.**Disk full จาก WAL **— ถ้า`archive_command` ช้า, WAL segments จะสะสมใน`pg_wal/` จน disk เต็ม
3.**Restore ไม่เคยถูกทดสอบ **— backup file อาจ corrupt, ตารางอาจหาย, หรือ config ไม่ตรง — และคุณจะรู้เมื่อ disaster เกิดแล้วเท่านั้น
4.**Restore duration scales with database size **— ฐานข้อมูล 2TB อาจใช้เวลา restore หลายชั่วโมง — ต้องรู้และสื่อสารกับ business

---

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. ถ้าคุณใช้`pg_dump` ทุก 6 ชั่วโมง RPO ของคุณคือเท่าไหร่? และ trade-off หลักคืออะไรเมื่อเทียบกับ Continuous WAL Archiving?
> 2. ในสถานการณ์ที่ฐานข้อมูล 2TB และ disk I/O เหลือเพียง 10% — ทำไม physical backup ถึงดีกว่า logical backup?
> 3. ทำไมถึงต้องทดสอบ restore — ในเมื่อ backup file มีและดูเหมือนจะครบ?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.**RPO ≈ 6 ชั่วโมง **— ข้อมูลที่เกิดระหว่าง dump อาจหายสูงสุด 6 ชม. Trade-off คือ storage cost ต่ำกว่าและ operational simplicity สูงกว่า Continuous WAL (ไม่ต้องจัดการ archive_command, WAL segments, monitoring) — แต่แลกด้วย data loss ที่มากกว่า ถ้ารายได้ต่อชั่วโมงสูง การประหยัดค่า storage อาจไม่คุ้มกับค่าเสียหายของข้อมูล 6 ชม.

2.**Physical backup (base backup + WAL replay) restore เร็วกว่า ** เพราะเป็นการ copy files โดยตรงแล้ว replay WAL — ไม่ต้อง rebuild indexes เหมือน logical backup ในขณะที่`pg_dump` ต้อง CREATE INDEX ใหม่ทั้งหมดซึ่งบนฐานข้อมูล 2TB อาจใช้เวลาเป็นวัน

3.** เพราะ backup file ≠ restoreable backup **— ไฟล์อาจเสียหาย (corruption), config อาจไม่ตรง (ต่าง version, extension หาย), อาจมีตารางที่ถูกลืม (เช่น`pg_dump` ไม่รวม large objects โดย default), หรือ procedure อาจซับซ้อนกว่าที่คิด การทดสอบ restore เท่านั้นที่จะยืนยันว่าคุณ recover ได้จริงในเวลาที่กำหนด

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> - ในระบบที่คุณดูแลตอนนี้ RPO และ RTO จริง ๆ คือเท่าไหร่? คุณรู้ได้ยังไง — หรือคุณแค่"เดา"?
> - ครั้งสุดท้ายที่คุณทดสอบ restore จริง ๆ คือเมื่อไหร่? ถ้ายังไม่เคย — อะไรคือสิ่งที่คุณกลัวว่าจะเจอ?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[../Backup/02-wal-g-deep-dive|WAL-G Deep Dive]]
- [[../Backup/03-backup-tool-comparison|Backup Tool Comparison]]
- [[../Postgres/05-vacuum-mvcc|VACUUM & MVCC]]
- [[../Distributed/01-self-recovery|Self-Recovery Patterns]]

---

## 🔗 แหล่งอ้างอิง (Sources)

> ** อ้างอิง:**
> - [PostgreSQL Official Docs — Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/current/continuous-archiving.html)
> - [Crunchy Data — Introduction to Postgres Backups (2023)](https://www.crunchydata.com/blog/introduction-to-postgres-backups)
> - [Crunchy Data — pgBackRest Documentation](https://pgbackrest.org/)
> - [WAL-G GitHub Repository](https://github.com/wal-g/wal-g)
> - [pg_dump Official Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
