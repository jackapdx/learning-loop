---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [database, backup, postgres, wal-g, pgbackrest, barman, comparison, trade-offs]
prerequisites: [database-backup-fundamentals, wal-g-deep-dive]
---

# Backup Tool Comparison — WAL-G vs pgBackRest vs Barman (เปรียบเทียบเครื่องมือสำรองฐานข้อมูล)

---

## 🎯 ปฐมนิเทศ (Orient)

"ใช้ WAL-G" —"ไม่, pgBackRest สิ" —"Barman ดีกว่าเพราะ enterprise" การถกเถียงเรื่อง backup tool มักจบที่การเลือกตามความคุ้นเคย ไม่ใช่ตาม context แต่ความจริงคือ: **ไม่มี tool ไหนดีที่สุด — มีแต่ tool ที่ trade-off คนละชุด** และการเลือกผิดอาจแปลว่า restore ไม่ได้ตอน disaster จริง

บทเรียนนี้จะวาง WAL-G, pgBackRest และ Barman บนโต๊ะเดียวกัน — ไม่ใช่เพื่อหาผู้ชนะ แต่เพื่อให้คุณเลือกได้ถูกต้องตามขนาดฐานข้อมูล, ขนาดทีม, infrastructure, และ business requirements ของคุณ

---

## 🧪 ลองทำก่อน (Attempt)

>**สถานการณ์**:คุณเป็น Lead Infrastructure Engineer ในทีม 8 คน ดูแล PostgreSQL clusters 12 ตัว (self-hosted, bare-metal) แต่ละตัวมีขนาดตั้งแต่ 200GB ถึง 4TB ทั้งหมดรันระบบการเงินที่ต้องการ audit trail สมบูรณ์ โดยมีข้อกำหนด:
>
> -**RPO**: 0 (ห้ามเสียข้อมูลแม้แต่วินาทีเดียว — financial compliance)
> -**RTO**: < 1 ชั่วโมง
> -**Storage budget:**$2,000/เดือน (รวมทั้งหมด 12 clusters)
> -**ทีม**: DBA 2 คน, DevOps 3 คน, SRE 1 คน
> -**Geography**: 2 data centers (primary + DR)
>
> **ข้อจำกัดเพิ่มเติม**: > - ฐานข้อมูล 4TB ใช้เวลา full backup ~6 ชั่วโมง
> - Network ระหว่าง data centers: 1 Gbps dedicated link
> - Compliance ต้องการ backup เก็บ 90 วัน
>
>**คำถาม**:คุณจะเลือก backup tool ตัวไหน — WAL-G, pgBackRest, หรือ Barman — สำหรับจัดการ 12 clusters นี้? อธิบาย trade-off ที่คุณยอมรับ และอะไรคือจุดอ่อนที่สุดของ strategy ที่คุณเลือก
>
>**✋ หยุดตรงนี้ก่อน**— ใช้เวลา 90 วินาทีตัดสินใจ — ไม่ใช่แค่ชื่อ tool แต่ต้องบอกว่าทำไม tool อีก 2 ตัวไม่เหมาะ

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"ใช้ WAL-G — มันง่ายสุด, config น้อย, restore เร็ว" | ⚠️ **คิดแบบ single-instance!** WAL-G จัดการทีละ instance — คุณต้อง setup, monitor, และ manage 12 instances แยกกัน ไม่มี centralized dashboard, ไม่มี built-in retention policy ข้าม instance, และการทำ backup จาก 4TB instance ทุกวันอาจชนกับ I/O limits WAL-G ไม่มี backup scheduling ในตัว → คุณต้องเขียน cron เอง 12 ตัว + monitoring แยก |
|"ใช้ Barman — มันออกแบบสำหรับ multi-server, มี centralized management, Barman-to-Barman replication สำหรับ DR" | ⚠️ **โอกาสถูกแต่ยังขาด!** Barman จัดการ multi-server ได้ดี และ WAL streaming (แทน archive_command) ลดความเสี่ยงเรื่อง WAL lag แต่ Barman ใช้ rsync-based incremental backup — ไม่มี parallel restore, และบนฐานข้อมูล 4TB full backup 6 ชม. นานเกินไป Barman ก็ไม่มี built-in encryption — คุณต้องจัดการ encryption at rest เองซึ่ง compliance อาจต้องการ |
|"ใช้ pgBackRest — ทำ parallel backup/restore, block-level incremental (สำคัญสำหรับ 4TB instance), centralized repository, และ built-in encryption" | ✅ **คิดเป็นระบบภายใต้ constraints!** pgBackRest เก่งที่สุดบนฐานข้อมูลขนาดใหญ่เพราะ: (1)**Block-level incremental backup**— หลังจาก full backup ครั้งแรก backup ครั้งต่อ ๆ ไปทำเฉพาะ changed blocks → บน 4TB database backup อาจใช้แค่ 30-60 นาทีแทน 6 ชม., (2)**Parallel backup/restore** ทุกขั้นตอน — ใช้ multi-CPU และ multi-network streams, (3)**Centralized repo**— 12 instances push ไป repo เดียว, จัดการ retention policy รวม, (4)**Built-in encryption**— AES-256, (5)**Delta restore**— restore เฉพาะ blocks ที่เปลี่ยน ลด RTO อย่างมาก |

**ทำไม pgBackRest ถึงชนะใน context นี้ — และ trade-off คืออะไร?** pgBackRest มี **learning curve สูงกว่า** WAL-G มาก — config ซับซ้อน (INI files, stanzas), ต้องการความรู้เรื่อง WAL internals, และการ troubleshoot ต้องอาศัย DBA ที่มีประสบการณ์ ทีมคุณมี DBA 2 คน — พอดี แต่ถ้าทีมมี DevOps-only 3 คน (ไม่มี DBA) → complexity ของ pgBackRest อาจกลายเป็น operational risk เอง

ในทางกลับกัน **ถ้าทุก instance เป็น managed database (RDS)**— ทั้ง 3 tools นี้ restore ไม่ได้ทั้งหมด (ต้องการ filesystem access) → ใช้ built-in backup ของ provider แทน

---

## 📖 คำอธิบาย (Explain)

### สามเครื่องมือ สาม Philosophy

#### WAL-G —"เรียบง่าย, เร็ว, Multi-Database"

ออกแบบโดย Citus Data (ปัจจุบันเป็นส่วนหนึ่งของ Microsoft) ในปี 2017 WAL-G คือ successor ของ WAL-E ที่ถูก rewrite ใน Go เพื่อแก้ปัญหา performance [source: Citus Data blog]

**Philosophy**: One binary, many databases, minimal config

```bash
# Config — environment variables หรือ YAML file
export WALG_FILE_PREFIX=s3://my-bucket/backups
export WALG_COMPRESSION_METHOD=zstd
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...

# Usage
wal-g backup-push /var/lib/postgresql/data      # Full backup
wal-g backup-push --delta /var/lib/postgresql/data  # Delta backup
wal-g wal-push %p                                # Archive WAL (in archive_command)
wal-g backup-fetch /var/lib/postgresql/data LATEST  # Restore
```

#### pgBackRest —"ประสิทธิภาพสูงสุด, ขนาดใหญ่, ฟีเจอร์ครบ"

พัฒนาโดย Crunchy Data (David Steele, Stephen Frost) — องค์กรที่ดูแล PostgreSQL managed service (Crunchy Bridge) ใช้ pgBackRest ภายในเอง [source: Crunchy Data blog — Introduction to Postgres Backups]

**Philosophy**: ทำทุกอย่างเกี่ยวกับ backup ให้ดีที่สุด — ไม่สน database อื่นนอกจาก PostgreSQL

```ini
# /etc/pgbackrest/pgbackrest.conf
[main]
pg1-path=/var/lib/postgresql/data
pg1-port=5432

[global]
repo1-path=/var/lib/pgbackrest
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=super-secret-key
repo1-retention-full=4          # Keep 4 full backups
repo1-retention-diff=2          # Keep 2 differentials per full
repo1-bundle=yes                # Bundle small files
repo1-block=y                   # Block incremental
process-max=8                   # Parallel operations
compress-type=zst
compress-level=6
```

```bash
# Usage
pgbackrest --stanza=main --type=full backup     # Full backup
pgbackrest --stanza=main --type=incr backup     # Incremental backup
pgbackrest --stanza=main --type=diff backup     # Differential backup
pgbackrest --stanza=main --type=time --target="2024-01-15 14:30:00+00" restore  # PITR
```

#### Barman —"Enterprise Multi-Server, Centralized"

พัฒนาโดย 2ndQuadrant (ปัจจุบันเป็นส่วนหนึ่งของ EDB/EnterpriseDB) — ออกแบบมาสำหรับ DBA ที่ดูแล PostgreSQL หลายเครื่อง [source: pgBarman.org]**Philosophy**: เครื่องกลางหนึ่งเครื่องจัดการ backup ให้ PostgreSQL clusters หลายตัว — ทำงานผ่าน SSH/WAL streaming

```ini
# /etc/barman.conf
[barman]
barman_home = /var/lib/barman
log_file = /var/log/barman/barman.log
compression = gzip

# /etc/barman.d/production-server.conf
[production-db]
description ="Production Database Server"
ssh_command = ssh postgres@prod-db-01
conninfo = host=prod-db-01 user=barman dbname=postgres
backup_method = postgres         # Use pg_basebackup via replication protocol
streaming_archiver = on          # Receive WAL via streaming replication
slot_name = barman               # Replication slot to prevent WAL loss
retention_policy = RECOVERY WINDOW OF 4 WEEKS
```

```bash
barman backup production-db       # Take backup
barman recover production-db ...  # Restore
barman list-server                # List all managed servers
```

---

### ตารางเปรียบเทียบ — หัวต่อหัว

| Feature | WAL-G | pgBackRest | Barman |
|---|---|---|---|
|**ภาษา**| Go | C + Perl | Python |
|**Database support**| PG, MySQL, SQL Server, Mongo, Redis, Greenplum | PostgreSQL เท่านั้น | PostgreSQL เท่านั้น |
|**Backup types**| Full + Delta (page-level) | Full + Differential +**Incremental (block-level)**| Full + Incremental (rsync-based) |
|**Parallel backup**| ✅ Multi-CPU upload | ✅ ทุกขั้นตอน parallel | ❌ Single-threaded |
|**Parallel restore**| ✅ Multi-CPU download | ✅ ทุกขั้นตอน parallel | ❌ Single-threaded |
|**Compression**| LZ4, ZSTD, LZMA, Brotli | gz, bz2, zst, none | gzip, bzip2, none |
|**Encryption**| GPG, libsodium, Yandex KMS | AES-256 (built-in) | ❌ ไม่มี (ใช้ external) |
|**Centralized mgmt**| ❌ Per-instance | ✅ Repository model (many→one) | ✅ Server model (one→many) |
|**WAL streaming**| ❌ archive_command เท่านั้น | ❌ archive_command เท่านั้น | ✅ archive_command **+ streaming replication**|
|**Delta restore**| ❌ | ✅ restore เฉพาะ changed blocks | ❌ |
|**Scheduling**| ❌ ใช้ cron | ❌ ใช้ cron | ❌ ใช้ cron |
|**Multi-repo**| ❌ Single storage | ✅ Multi-repo (local + remote) | ❌ Single storage |
|**Cloud DB support**| backup ได้ แต่ restore ไม่ได้ | ❌ ต้องการ filesystem access | ❌ ต้องการ filesystem access |
|**Config format**| Env vars / YAML / JSON | INI files | INI files |
|**Learning curve**| ปานกลาง | สูง | สูง |
|**Active maintainers**| Community (active May 2026) | Crunchy Data | EDB/2ndQuadrant |

---

## 🔬 ขยายความ (Extend)

### Decision Matrix — ใช้ตัวไหน เมื่อไหร่?

#### ใช้ WAL-G เมื่อ...

| ✅ เหมาะ | ❌ ไม่เหมาะ |
|---|---|
| ทีม DevOps ขนาดเล็ก (1-3 คน) — setup ง่ายสุด | องค์กรที่มี DBA โดยเฉพาะและมี compliance requirement สูง |
| ใช้หลาย database engines (MySQL + Postgres) — tool เดียว | ฐานข้อมูล > 1TB ที่ต้องการ incremental backup ละเอียด |
| Cloud-native (Kubernetes, containers) — binary เล็ก, no deps | ต้องการ centralized backup management |
| Budget ต่ำ — delta backups + compression จัดการ storage cost | ต้องการ restore แบบ delta restore (restore เฉพาะ changed blocks) |
| Self-hosted PostgreSQL — ต้องการ PITR แบบตรงไปตรงมา | มีหลาย instances และต้องการ จัดการ retention policy รวมศูนย์ |

**จุดอ่อนที่สุดของ WAL-G:** ไม่มี delta restore — ถ้าต้อง restore ฐานข้อมูล 4TB แล้วมีแค่ 500MB ที่เปลี่ยน — WAL-G ต้อง restore full backup (4TB) แล้ว replay WAL → RTO อาจนานเป็นชั่วโมง

#### ใช้ pgBackRest เมื่อ...

| ✅ เหมาะ | ❌ ไม่เหมาะ |
|---|---|
| ฐานข้อมูล > 500GB — block-level incremental ประหยัดเวลาและ storage อย่างมาก | ใช้ managed database (RDS/Cloud SQL) — restore ไม่ได้ |
| องค์กรที่มี DBA — learning curve สูงแต่คุ้มค่า | ทีมเล็กที่ไม่มี bandwidth จัดการ complexity |
| ต้องการ PITR แบบละเอียด + delta restore — RTO ต่ำสุด | ต้องใช้กับ database engine อื่นนอกจาก PostgreSQL |
| Compliance ต้องการ encryption at rest — built-in AES-256 | ต้องการ cross-database-engine backup |
| มี storage budget สำหรับ multi-repo (local + remote) — redundancy สูงสุด | |**จุดอ่อนที่สุดของ pgBackRest:** Complexity — config ซับซ้อน, troubleshooting ต้องเข้าใจ WAL internals, และถ้า setup ผิด restore อาจล้มเหลวแบบเงียบ ๆ [source: Crunchy Data blog]

#### ใช้ Barman เมื่อ...

| ✅ เหมาะ | ❌ ไม่เหมาะ |
|---|---|
| จัดการ PostgreSQL clusters หลายตัว — centralized จากเครื่องเดียว | ฐานข้อมูลขนาดใหญ่ > 1TB — ไม่มี parallel restore |
| ต้องการ WAL streaming (นอกเหนือจาก archive_command) — ลดความเสี่ยง WAL loss | ต้องการ restore เร็ว — single-threaded restore |
| มี network ดีระหว่าง Barman server และ PostgreSQL servers (SSH) | อยู่ใน cloud (no direct SSH/fs access) |
| Enterprise environment ที่มี DBA ทีมใหญ่ | ต้องการ encryption ในตัว — Barman ไม่มี |
| ต้องการ DR แบบ geographical — Barman-to-Barman replication | |

**จุดอ่อนที่สุดของ Barman:** Single-threaded restore — บนฐานข้อมูลใหญ่ RTO นานกว่า WAL-G และ pgBackRest อย่างมีนัยสำคัญ

### Operational Cost Comparison — ไม่ใช่แค่ License (ทั้ง 3 ตัวฟรี)

| Cost Factor | WAL-G | pgBackRest | Barman |
|---|---|---|---|
|**Setup time**| ~1-2 ชม. | ~1-2 วัน (stanza, config, testing) | ~1-2 วัน (SSH keys, per-server config) |
|**ต่อเนื่อง/เดือน**| ~2-4 ชม. (monitoring, retention) | ~4-8 ชม. (retention tuning, repo mgmt) | ~4-8 ชม. (multi-server monitoring) |
|**Troubleshooting**| ปานกลาง (อ่าน Go errors) | ยาก (WAL internals + INI config) | ยาก (SSH issues + Python stack traces) |
|**ความรู้ที่ต้องการ**| Postgres + cloud storage | Postgres internals + WAL mechanics | Postgres + SSH + Linux admin |
|**Risk of misconfiguration**| ต่ำ-ปานกลาง | สูง (หลาย config options) | สูง (SSH + per-server config) |

### สิ่งที่ทั้ง 3 ตัวทำไม่ได้ — Managed DB Reality Check

**Managed databases (RDS, Cloud SQL, Azure PostgreSQL):** ทั้ง WAL-G, pgBackRest และ Barman ไม่สามารถ restore เข้า managed instance ได้ เพราะ managed services ไม่ให้ filesystem access

สำหรับ managed databases:
- ใช้ **built-in backup** ของ provider (RDS automated backup, Cloud SQL backup)
- ใช้ **`pg_dump`** สำหรับ logical backup + cross-provider migration
- PITR มีให้ในตัวอยู่แล้ว — ไม่ต้องตั้งค่า WAL archiving เอง

>**ข้อควรระวัง**:built-in backup ของ provider มัก restore ได้เฉพาะภายใน provider เดียวกัน — vendor lock-in คือ trade-off ของ convenience

---

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**> 1. ทำไม pgBackRest ถึงใช้คำว่า"incremental" ในความหมายที่ต่างจาก WAL-G's"delta" — และเมื่อไหร่ความแตกต่างนี้ถึงสำคัญ?
> 2. ถ้าคุณมี PostgreSQL 10 instances แต่ละตัว 50GB — ทำไม WAL-G ถึงเป็นทางเลือกที่ดีกว่า Barman ทั้งที่ Barman ออกแบบมาสำหรับ multi-server?
> 3. อะไรคือสถานการณ์ที่คุณ **ไม่ควรใช้ทั้ง 3 ตัวนี้เลย**?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.**WAL-G delta**= backup เฉพาะ pages ที่เปลี่ยนไปจาก full backup ล่าสุด (page-level, 8KB granularity)**pgBackRest incremental**= backup เฉพาะ blocks ที่เปลี่ยนไปจาก backup ใด ๆ ก่อนหน้า (block-level, granularity ละเอียดกว่า) ความแตกต่างนี้สำคัญเมื่อฐานข้อมูล > 1TB และมี write pattern ที่เปลี่ยนแค่ส่วนเล็ก ๆ ของ database — pgBackRest จะเร็วกว่าและใช้ storage น้อยกว่าเพราะไม่ต้อง scan ทั้ง file เพื่อหา changed pages

2. แม้ Barman จะทำ centralized management ได้ดี แต่สำหรับ 50GB instances: (a) setup overhead ของ Barman (SSH keys, per-server config, streaming replication slots) ไม่คุ้มกับขนาดที่เล็ก, (b) WAL-G setup บน 50GB ใช้เวลา < 30 นาทีต่อ instance โดยไม่ต้องมี Barman server กลาง, (c) restore speed — WAL-G parallel restore เร็วกว่าบน even small instances, (d) Barman เก่งเมื่อ instances ใหญ่พอที่ centralized management ลด operational overhead — แต่ที่ 50GB, overhead ในการ setup Barman อาจมากกว่าการจัดการ WAL-G 10 instances แยกกัน

3.**เมื่อใช้ managed databases (RDS, Cloud SQL, Azure)**— ทั้ง 3 ตัว restore ไม่ได้เพราะต้องการ filesystem access ใช้ built-in backup +`pg_dump` แทน **เมื่อต้องการ cross-version restore**— physical backup tools restore ได้เฉพาะ major version เดียวกัน ใช้`pg_dump`/`pg_restore` แทน

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> - ในองค์กรของคุณตอนนี้ — ใครเป็นคนตัดสินใจเลือก backup tool? คนนั้นเข้าใจ trade-off จริง ๆ หรือเลือกเพราะ"tool นี้ดัง"/"เราใช้ tool นี้มาตลอด"?
> - ถ้าคุณต้อง justify การเปลี่ยนจาก tool ปัจจุบันไปอีกตัว — คุณจะอธิบาย trade-off ให้ CTO หรือ VP Engineering ที่ไม่ใช่ DBA เข้าใจได้อย่างไร?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[../Backup/01-database-backup-fundamentals|Backup Fundamentals]]
- [[../Backup/02-wal-g-deep-dive|WAL-G Deep Dive]]
- [[../Postgres/05-vacuum-mvcc|VACUUM & MVCC]]
- [[../Postgres/06-connection-pooling-replicas|Connection Pooling & Replicas]]
- [[../Distributed/01-self-recovery|Self-Recovery Patterns]]
- [[../Distributed/04-spof|Single Point of Failure]]

---

## 🔗 แหล่งอ้างอิง (Sources)

> **อ้างอิง**:
> - [WAL-G GitHub Repository](https://github.com/wal-g/wal-g)
> - [pgBackRest Official Documentation](https://pgbackrest.org/)
> - [Barman (pgBarman) Official Documentation](https://pgbarman.org/)
> - [PostgreSQL Backup Tools Comparison — DEV Community](https://dev.to/piteradyson/postgresql-backup-tools-comparison-databasus-wal-g-pgbackrest-and-barman-2kg)
> - [Crunchy Data — Introduction to Postgres Backups (2023)](https://www.crunchydata.com/blog/introduction-to-postgres-backups)
> - [Citus Data — Introducing WAL-G (2017)](https://www.citusdata.com/blog/2017/08/18/introducing-wal-g-faster-restores-for-postgres/)
> - [PostgreSQL Official Docs — Continuous Archiving and PITR](https://www.postgresql.org/docs/current/continuous-archiving.html)
