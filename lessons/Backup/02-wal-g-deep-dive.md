---
verified: false
contentType: deep-dive
level: senior
status: polished
tags: [database, backup, postgres, wal-g, wal, pitr, go, compression]
prerequisites: [database-backup-fundamentals]
---

# WAL-G Deep Dive — เจาะลึกสถาปัตยกรรมการสำรองฐานข้อมูลยุคใหม่

---

## 🎯 ปฐมนิเทศ (Orient)

WAL-G คือ successor ของ WAL-E — เครื่องมือ Continuous Archiving ที่เปลี่ยนจาก Python เป็น Go และอ้างว่า **restore เร็วกว่าเดิม 4 เท่า ** จนถึง 7 เท่าบนบาง hardware แต่มันไม่ใช่"เปลี่ยนภาษาแล้วเร็วขึ้น" ง่าย ๆ — มันคือการออกแบบใหม่ทั้งหมดของ pipeline การบีบอัด, การเชื่อมต่อ cloud storage, และการจัดการ parallel I/O

บทเรียนนี้จะพาคุณลงไปดูว่าทำไมทีมที่ Heroku, Citus, และ Fly.io ถึงเลือกใช้ WAL-G — และอะไรคือข้อจำกัดที่คุณต้องจัดการเอง

---

## 📖 คำอธิบาย (Explain)

### WAL-G คืออะไร? — มากกว่าแค่"WAL-E เวอร์ชัน Go"

WAL-G เกิดจากโปรเจกต์ฝึกงานของ Katie Li ที่ Citus Data ในปี 2017 — โจทย์คือ"ทำ WAL-E ให้ดีขึ้น" แต่แทนที่จะ refactor โค้ด Python ทีมเลือก rewrite ทั้งหมดใน Go [source: Citus Data blog — Introducing WAL-G]

WAL-G เป็น **continuous archiving tool **— หมายความว่ามันช่วยคุณ:
1.**Push **: ส่ง WAL segments และ base backups ไปยัง cloud storage (S3, GCS, Azure, Swift, local, SFTP)
2.**Fetch **: ดึง WAL segments และ base backups กลับมาเพื่อ restore
3.**Delete **: จัดการ retention policy — ลบ backups เก่าและ WAL ที่ไม่จำเป็น

มันสนับสนุน 6 ฐานข้อมูล (สถานะ production: PostgreSQL, MySQL/MariaDB, SQL Server, Greenplum; beta: MongoDB, Redis) และรองรับการบีบอัด 4 วิธี: LZ4, LZMA, ZSTD, Brotli [source: WAL-G GitHub README]

### Architecture Deep Dive — ทำไม Go ถึงเร็วกว่า Python สำหรับงานนี้?

#### Pipeline ของ WAL-E (Python) — จุดที่เป็นคอขวด

WAL-E ใช้ **Unix pipes ** เชื่อมต่อกระบวนการภายนอก:
```
PostgreSQL WAL segment → Python process → pipe → lzop compression → pipe → AWS SDK → S3
```

ปัญหาหลัก 3 อย่าง:
1.**Memory copies **: ข้อมูลถูก copy ระหว่าง pipe buffers หลายครั้ง —`perf` analysis แสดงว่านี่คือคอขวดหลัก
2.**Pipe buffer limits **: Linux kernel มีข้อจำกัดขนาด pipe buffer ที่เข้มงวดขึ้นเรื่อย ๆ — การปรับแต่งยากขึ้นตาม kernel version
3.**Process overhead **: การ spawn external process (`lzop`,`cat`) เพิ่ม latency ทุกครั้งที่มีการ archive WAL segment (ทุก ~16MB)

#### Pipeline ของ WAL-G (Go) — ตัดกระบวนการภายนอกทิ้ง

```
PostgreSQL WAL segment → Go process (in-memory LZ4/LZMA/ZSTD/Brotli) → Go AWS SDK (multi-part upload) → S3
```

WAL-G link compression library โดยตรง (C library ผ่าน CGo สำหรับ LZMA/Brotli) — ไม่ต้อง spawn process, ไม่มี pipe, ไม่มี extra memory copy นี่คือสาเหตุที่โค้ด ** ลดจาก 6,500 บรรทัด (WAL-E) เหลือ 1,500 บรรทัด (WAL-G)** และ restore throughput แตะ ~95% ของ theoretical maximum ของ EBS bandwidth (875 MiB/s บน r4.8xlarge) [source: Citus Data blog — Introducing WAL-G]

### Compression — เร็ว vs เล็ก

WAL-G ให้คุณเลือก trade-off ระหว่าง compression speed กับ storage cost:

| Algorithm | Speed (relative) | Compression Ratio | เหมาะกับ... |
|---|---|---|---|
|**LZ4 **| เร็วที่สุด (default) | ~2:1 | WAN bandwidth จำกัด, restore ต้องเร็วที่สุด |
|**ZSTD **| เร็ว | ~3:1 | Balance ที่ดี — เร็วพอและเล็กกว่า LZ4 |
|**Brotli **| ปานกลาง | ~3:1 (ดีกว่า ZSTD เล็กน้อย) | คล้าย ZSTD แต่ decompress เร็วกว่าเล็กน้อย |
|**LZMA **| ช้าที่สุด | ~6:1 (ดีกว่า LZ4 6 เท่า) | Storage cost คือ priority, restore speed ไม่สำคัญมาก |

```bash
# ตั้งค่าผ่าน environment variable
export WALG_COMPRESSION_METHOD=zstd

# หรือผ่าน config file (YAML/JSON)
# WALG_COMPRESSION_METHOD: zstd
```

⚠️ **Limitation:** การเปลี่ยน compression algorithm กลางคัน — backups เก่าจะ restore ไม่ได้ถ้าไม่มี decompression library เดิม คุณต้องเก็บ backups เก่าไว้หรือ migrate ทีละส่วน

### Safety Features — สิ่งที่ WAL-G ทำเหนือกว่า WAL-E

#### 1. Non-Exclusive Base Backup

WAL-E ใช้"exclusive backup mode" — ถ้า backup process ตายระหว่างทาง PostgreSQL จะค้างใน backup mode และต้องการ manual intervention (ลบ`backup_label` file) เพื่อเริ่มใหม่

WAL-G ใช้ **non-exclusive backup mode **(PostgreSQL 9.6+) —`backup_label` และ`tablespace_map` ถูกอ่านจาก SQL query แทนที่จะเขียนลง disk — ไม่มี stale state ถ้ากระบวนการตาย [source: Citus Data blog]

#### 2. Atomic Restore —`pg_control` Last

WAL-G restore`pg_control` file เป็น ** ไฟล์สุดท้าย **— เพราะถ้า`pg_control` ถูกเขียนก่อนที่ไฟล์อื่นจะครบ PostgreSQL จะพยายาม start และ corrupt ฐานข้อมูล นี่คือ safety feature ที่ WAL-E ไม่มี

#### 3. Delta Backups — ประหยัด Storage

WAL-G รองรับ **delta backups **— backup เฉพาะหน้าที่เปลี่ยนไปจาก full backup ล่าสุด:

```bash
# Full backup (copy ทุก page)
wal-g backup-push /var/lib/postgresql/data

# Delta backup (copy เฉพาะ changed pages since last full)
wal-g backup-push --delta /var/lib/postgresql/data
```

| Backup Type | Storage Used | Restore Speed | Risk |
|---|---|---|---|
| Full | 100% ของ database size | ปกติ | ไม่มี dependency |
| Delta | ~10-20% ของ database size | ต้อง fetch full + delta | ถ้า full backup ถูกลบ — delta ใช้ไม่ได้ |

⚠️ ** ถ้าใช้ delta backup:** คุณต้องเก็บ full backup ที่ delta อ้างถึงไว้เสมอ —`wal-g delete retain FULL 5` จะเก็บ 5 full backups ล่าสุดและ delta ของมัน

---

## 🔬 ขยายความ (Extend)

### WAL-G vs WAL-E — ตารางเปรียบเทียบ

| | WAL-E (Python) | WAL-G (Go) |
|---|---|---|
|**Restore speed **| Baseline | 4x-7x เร็วกว่า [source: Citus benchmark] |
|** โค้ด **| 6,500 lines | 1,500 lines |
|**Parallel restore **| ❌ single-threaded | ✅ parallel (multi-CPU) |
|**Compression **| lzop (external) | LZ4/LZMA/ZSTD/Brotli (linked) |
|**Atomic restore **| ❌ manual | ✅ pg_control restored last |
|**Backup mode **| Exclusive (stale state risk) | Non-exclusive |
|**Encryption **| GPG | GPG + libsodium + Yandex Cloud KMS |
|**Database support **| PostgreSQL only | PG + MySQL + SQL Server + Mongo + Redis + Greenplum |
|**Unit tests **| จำกัด (integration-heavy) | Mock-based unit tests + fault injection |
|**Active development **| ❌ Archived (last commit 2023) | ✅ Active (May 2026) |

### Decision Framework — ควรใช้ WAL-G เมื่อ...

#### ✅ เหมาะกับ:
-** ทีม DevOps ที่คุ้นกับ CLI/Infrastructure-as-Code **— config ผ่าน environment variables หรือ config file, ใช้ cron สำหรับ scheduling
-**Multi-database environments **— มีทั้ง PostgreSQL, MySQL, MongoDB — WAL-G ตัวเดียวจัดการทั้งหมด
-**Cloud-native deployments **— Kubernetes, containerized — WAL-G binary เดียวไม่ต้องติดตั้ง dependencies มาก
-**Budget-conscious storage **— delta backups + compression (ZSTD/LZMA) ลด storage cost อย่างมีนัยสำคัญ
-** ต้องการ PITR แต่ไม่ต้องการ operational overhead ของ pgBackRest **— WAL-G ง่ายกว่า pgBackRest ในการ setup

#### ❌ ไม่เหมาะกับ:
-**Managed databases (RDS, Cloud SQL, Azure)**— WAL-G ต้องการ filesystem access เพื่อ restore — managed services ไม่ให้ access ระดับนี้ — ใช้ built-in backup ของ provider แทน
-** ฐานข้อมูล > 1TB ที่ต้องการ block-level incremental backup **— pgBackRest ทำ incremental ได้ละเอียดกว่า WAL-G (block-level vs page-level)
-** ทีมที่ต้องการ GUI/Scheduling ในตัว **— WAL-G เป็น CLI-only, ไม่มี scheduler ในตัว — ต้องใช้ cron หรือ external orchestrator
-** องค์กรที่ต้องการ centralized backup management หลาย server **— Barman ออกแบบมาเพื่อสิ่งนี้โดยเฉพาะ — WAL-G ทำงานแบบ per-instance

### Production Setup — ตัวอย่าง Config จริง

```bash
# /etc/wal-g/config.yaml (WAL-G configuration)
WALG_FILE_PREFIX: /var/backups/wal-g
WALG_COMPRESSION_METHOD: zstd
WALG_DOWNLOAD_CONCURRENCY: 24       # Parallel restore threads
WALG_UPLOAD_CONCURRENCY: 16         # Parallel upload threads
WALG_UPLOAD_DISK_CONCURRENCY: 8     # Disk scan parallelism
WALG_NETWORK_RATE_LIMIT: 104857600  # 100 MB/s rate limit (ไม่ให้ WAL-G กิน bandwidth ทั้งหมด)
WALG_STATSD_ADDRESS: localhost:8125 # Metrics → Prometheus

# ⚠️ สิ่งที่ต้องระวัง:
# - UPLOAD_CONCURRENCY สูงเกิน → disk I/O spike บน production
# - DOWNLOAD_CONCURRENCY สูงเกิน → network saturation ระหว่าง restore
# - ถ้าไม่มี rate limit → WAL-G จะใช้ bandwidth เต็มที่ = แอพอื่นล่ม
```

```bash
# postgresql.conf — WAL archiving setup
archive_mode = on
archive_command = 'wal-g wal-push %p'
archive_timeout = 60s  # Force WAL segment rotation ทุก 60 วิ

# ⚠️ ถ้าไม่มี archive_timeout:
# บน low-write database, WAL segment อาจใช้เวลาหลายนาทีกว่าจะเต็ม 16MB
# → RPO จริงอาจเป็นนาที ไม่ใช่วินาที
```

### Operational Gotchas — สิ่งที่ Docs ไม่ได้บอก

1.**`archive_command` failure จะหยุด database **— ถ้า S3 unreachable หรือ credential หมดอายุ, PostgreSQL จะเก็บ WAL segment ไว้และไม่สร้างใหม่ →`pg_wal/` เต็ม → database หยุด ต้องมี`archive_command` timeout + alerting

2.**Delta backup dependency chain **— ถ้าลบ full backup โดยไม่ได้ตั้งใจ delta ทุกตัวที่อ้างอิง full backup นั้นจะใช้ไม่ได้ ทันใดนั้นคุณอาจมี backup 10 ตัวที่ restore ไม่ได้ —`wal-g delete` มี`FIND_FULL` mode เพื่อป้องกันเรื่องนี้

3.**Cross-major-version restore? ไม่ได้ **— WAL-G restore ใช้ physical files — ต้องเป็น PostgreSQL major version เดียวกัน ถ้าจะ upgrade → ใช้`pg_dump`/`pg_restore` หรือ`pg_upgrade`

4.**WAL-G เองก็ต้องการ backup **— ในบาง setup (เช่น Kubernetes CronJob) WAL-G binary อาจหายไปตอน node restart — ต้องมี strategy สำหรับ restore ตัว WAL-G เอง

5.**Timeline changes หลัง`pg_upgrade`**— หลังจาก major upgrade, timeline อาจ reset →`wal-g delete retain N` อาจเรียงลำดับ backup ผิด (ใช้ timeline/WAL segment แทน chronological time) ต้องใช้`--use-sentinel-time` flag

---

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. WAL-G ทำ parallel restore ได้ยังไง — และ trade-off คืออะไรเมื่อเพิ่ม concurrency?
> 2. ถ้าคุณเปลี่ยนจาก LZ4 เป็น LZMA compression วันนี้ — จะเกิดอะไรขึ้นกับ backups เก่าที่ใช้ LZ4?
> 3. ใน context ไหนที่ WAL-G"ไม่เหมาะ" — และเครื่องมืออะไรที่คุณควรใช้แทน?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1. WAL-G ใช้ Go's goroutine เพื่อ download และ decompress หลาย WAL segments พร้อมกัน — แต่ละ goroutine จัดการหนึ่ง segment การเพิ่ม`WALG_DOWNLOAD_CONCURRENCY` ทำให้ restore เร็วขึ้น ** แต่ ** ถ้าสูงเกินไป: (a) network bandwidth อาจอิ่มตัวจนกระทบ production, (b) CPU อาจ throttle จาก decompression หลาย streams, (c) disk I/O อาจเป็นคอขวดใหม่ — เพราะ writes หลาย streams พร้อมกันอาจ random I/O แทน sequential

2. Backups เก่าที่ใช้ LZ4 จะ restore ไม่ได้ — เพราะ WAL-G จะพยายาม decompress ด้วย ZSTD/LZMA และ fail WAL-G ใช้ compression algorithm เดียวกันสำหรับทุก operation — การเปลี่ยน compression ต้อง: (a) เก็บ backups เก่าไว้จนหมดอายุ หรือ (b) migrate โดยทำ full backup ใหม่ด้วย algorithm ใหม่ แล้วค่อยลบของเก่า

3. WAL-G ไม่เหมาะกับ: (1)**Managed databases **(RDS/Cloud SQL) — restore ไม่ได้เพราะต้องการ filesystem access → ใช้ built-in backup ของ provider, (2)** ฐานข้อมูล > 1TB ที่ต้อง block-level incremental **→ pgBackRest ดีกว่าเพราะ restore เฉพาะ changed blocks (ไม่ต้อง scan ทั้ง file), (3)** องค์กรที่ต้องการ centralized multi-server management **→ Barman ออกแบบมาเพื่อจัดการหลาย instance จากเครื่องเดียว

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> - ถ้าระบบของคุณใช้ managed database (RDS/Cloud SQL) — คุณได้ทดสอบ restore จาก backup ของ provider แล้วหรือยัง? ใช้เวลานานแค่ไหน — ตรงกับ SLA ที่คุณสัญญากับ business หรือไม่?
> - ในระบบ self-hosted — คุณใช้เครื่องมืออะไรสำหรับ backup ตอนนี้? มันจัดการอะไรให้คุณได้และไม่ได้ — และถ้า`archive_command` fail วันนี้, คุณจะรู้ภายในกี่นาที?

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[../Backup/01-database-backup-fundamentals|Backup Fundamentals]]
- [[../Backup/03-backup-tool-comparison|Backup Tool Comparison]]
- [[../Postgres/05-vacuum-mvcc|VACUUM & MVCC]]
- [[../Postgres/13-transaction-id-wraparound|TXID Wraparound]]
- [[../Distributed/01-self-recovery|Self-Recovery Patterns]]

---

## 🔗 แหล่งอ้างอิง (Sources)

> ** อ้างอิง:**
> - [WAL-G GitHub Repository (Active, May 2026)](https://github.com/wal-g/wal-g)
> - [Citus Data — Introducing WAL-G: Faster Disaster Recovery for Postgres (2017)](https://www.citusdata.com/blog/2017/08/18/introducing-wal-g-faster-restores-for-postgres/)
> - [WAL-G Documentation (ReadTheDocs)](https://wal-g.readthedocs.io/)
> - [Fly.io Community — Point-in-time backups using Postgres and wal-g](https://community.fly.io/t/point-in-time-backups-using-postgres-and-wal-g/6867)
> - [PostgreSQL Official Docs — Continuous Archiving](https://www.postgresql.org/docs/current/continuous-archiving.html)
> - [WAL-E GitHub Repository (Archived)](https://github.com/wal-e/wal-e)
