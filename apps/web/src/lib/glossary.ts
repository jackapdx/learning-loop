/**
 * Glossary — system design vocabulary with Thai definitions.
 * Keys are case-insensitive for matching in content.
 */
export const glossary: Record<string, string> = {
  // Distributed Systems
  CAP: "**CAP Theorem** — ในระบบกระจายตัว (Distributed System) คุณเลือกได้แค่ 2 ใน 3: Consistency (ข้อมูลถูกต้อง), Availability (ระบบตอบสนองเสมอ), Partition Tolerance (ทนต่อการตัดขาดของเครือข่าย)",
  "Consistency": "ข้อมูลทุกโหนดมีค่าเหมือนกันในเวลาเดียวกัน แข็งแกร่งที่สุดใน ACID",
  "Availability": "ทุกรีเควสได้รับการตอบสนองเสมอ แม้บางโหนดจะล่ม",
  "Partition Tolerance": "ระบบยังทำงานได้แม้การสื่อสารระหว่างโหนดถูกตัดขาด",
  ACID: "Atomicity, Consistency, Isolation, Durability — หลักประกันของฐานข้อมูล Relational",
  BASE: "Basically Available, Soft-state, Eventually Consistent — ตรงข้ามกับ ACID, ใช้ในระบบ NoSQL",
  "PACELC": "ส่วนขยายของ CAP: หากมี Partition (P) ให้เลือก A หรือ C; Else (E) ให้เลือก L (Latency) หรือ C (Consistency)",

  // Databases
  MVCC: "**Multi-Version Concurrency Control** — PostgreSQL เก็บข้อมูลหลายเวอร์ชันเพื่อให้อ่านและเขียนพร้อมกันได้โดยไม่บล็อกกัน",
  Sharding: "การแบ่งข้อมูลในแนวนอน (Horizontal Partitioning) กระจายไปหลายเครื่องเพื่อเพิ่มความจุและประสิทธิภาพ",
  Indexing: "โครงสร้างข้อมูลที่ช่วยให้ค้นหาได้เร็วขึ้น โดยแลกมาด้วยพื้นที่จัดเก็บและความช้าตอนเขียน",
  "Connection Pooling": "เทคนิคจัดการการเชื่อมต่อฐานข้อมูลแบบใช้ซ้ำ ลด Overhead การสร้าง Connection ใหม่ทุกครั้ง",
  Replication: "การคัดลอกข้อมูลไปยังหลายเซิร์ฟเวอร์เพื่อเพิ่ม Availability และ Read Throughput",
  "PITR": "**Point-in-Time Recovery** — ความสามารถในการกู้คืนฐานข้อมูลกลับไปยังวินาทีใดก็ได้ในอดีต โดยอาศัยการ Backup ร่วมกับ Write-Ahead Logs (WAL)",

  // Networking
  WebSocket: "โปรโตคอล Full-Duplex บน TCP — เปิด Connection เดียวแล้วส่งข้อมูลสองทางได้ตลอด เหมาะกับแอป Real-time",
  "Load Balancer": "ตัวกระจายทราฟฟิกไปยังหลายเซิร์ฟเวอร์ — L4 ทำงานระดับ TCP, L7 ทำงานระดับ HTTP (อ่าน Header ได้)",
  "Weighted Least Connections": "อัลกอริทึม LB ที่ฉลาดที่สุด — กระจายโหลดตามจำนวนการเชื่อมต่อจริง โดยคำนวณ 'น้ำหนัก' (Weight) ตามความแรงของเซิร์ฟเวอร์ด้วย",
  "Health Check": "การตรวจสอบสถานะเซิร์ฟเวอร์ — LB จะส่ง Request (Active) หรือสังเกตผลลัพธ์ (Passive) เพื่อคัดเครื่องที่เสียออกจาก Pool",
  "Sticky Session": "การส่งผู้ใช้คนเดิมไปหาเซิร์ฟเวอร์เครื่องเดิมเสมอ — ง่ายต่อการเขียนโปรแกรม แต่ทำให้ระบบสเกลและทำ Zero Downtime ยากขึ้น",
  "gRPC": "เฟรมเวิร์ก RPC ความเร็วสูงจาก Google — ใช้ Protocol Buffers แทน JSON, ทำงานบน HTTP/2, รองรับ Streaming",
  "API Gateway": "Reverse Proxy ด่านหน้าที่จัดการ Cross-cutting Concerns เช่น Auth, Rate Limiting และ Service Discovery",
  Kong: "API Gateway ยอดนิยมที่สร้างบน Nginx และ OpenResty — โดดเด่นเรื่องประสิทธิภาพและการขยายความสามารถด้วย Plugins",
  "Rate Limiting": "การจำกัดจำนวน Request ที่ผู้ใช้สามารถส่งเข้ามาได้ในช่วงเวลาหนึ่ง เพื่อป้องกันระบบล่ม (Overload)",
  "BFF": "**Backend For Frontend** — สถาปัตยกรรมที่สร้างเซอร์วิสคั่นกลางเพื่อจัดการ Logic เฉพาะสำหรับแต่ละช่องทาง (Web, Mobile)",
  "Service Mesh": "เลเยอร์โครงสร้างพื้นฐานสำหรับจัดการการสื่อสารระหว่างเซอร์วิส (East-West Traffic) — มักใช้ Sidecar Proxy",
  CDN: "**Content Delivery Network** — เครือข่ายเซิร์ฟเวอร์ที่กระจายอยู่ทั่วโลก เก็บ Cache เนื้อหาใกล้ผู้ใช้เพื่อลด Latency",

  // Messaging
  "Pub/Sub": "**Publish/Subscribe** — รูปแบบการสื่อสารแบบ Asynchronous ที่ผู้ส่ง (Publisher) ไม่รู้จักผู้รับ (Subscriber)",
  "Kafka": "แพลตฟอร์ม Event Streaming แบบ Distributed — เก็บข้อความเป็น Log, รองรับการอ่านย้อนหลังและ Replay สูง",
  "Dead Letter Queue": "คิวสำหรับเก็บข้อความที่ประมวลผลไม่สำเร็จหลัง Retry หลายครั้ง — ใช้ Debug และป้องกันข้อมูลสูญหาย",

  // Caching & Buffering
  "Cache Invalidation": "หนึ่งในปัญหาที่ยากที่สุดในวิทยาการคอมพิวเตอร์ — เมื่อข้อมูลต้นทางเปลี่ยน จะอัปเดตหรือลบข้อมูลใน Cache อย่างไร",
  Buffer: "พื้นที่พักข้อมูลชั่วคราวเพื่อประสานความเร็ว (Speed Mismatch) ระหว่าง Producer และ Consumer — เน้นการส่งต่อ (FIFO) ไม่ใช่การอ่านซ้ำ",
  Cache: "พื้นที่เก็บข้อมูลชั่วคราวเพื่อลด Latency ในการเข้าถึงข้อมูลเดิมที่ใช้บ่อย — เน้นการอ่านซ้ำ (Read Many)",
  "TTL": "**Time To Live** — ระยะเวลาที่ข้อมูลใน Cache มีอายุ ก่อนถูกพิจารณาว่าหมดอายุและถูกลบ",
  Redis: "In-memory Data Store ความเร็วสูง — ใช้เป็น Cache, Message Broker, หรือแม้แต่ Database เบาๆ",
  "Load Leveling": "การใช้ Buffer (เช่น Queue) เพื่อรับแรงกระแทกจาก Traffic ที่มาเป็นระลอก เพื่อไม่ให้ระบบปลายทางล่ม",

  // Architecture & Organization
  Microservices: "สถาปัตยกรรมที่แยกระบบเป็น Services เล็กๆ อิสระต่อกัน — แต่ละ Service มี Database และ Deploy Cycle ของตัวเอง",
  Monolith: "แอปพลิเคชันที่รวมทุกอย่างไว้ใน Deployment Unit เดียว — ง่ายตอนเริ่ม แต่ซับซ้อนและ Deploy ช้าเมื่อโตขึ้น",
  "Modular Monolith": "ทางสายกลาง — โค้ดถูกแยกเป็น Module ชัดเจน (เหมือน Microservices) แต่ยังรันอยู่ในก้อนเดียว (Monolith) ลดภาระ DevOps",
  Monorepo: "การเก็บโค้ดทุกโปรเจกต์และ Library ไว้ใน Repository เดียวกัน — แชร์โค้ดง่าย แต่ต้องใช้ Tooling จัดการสูง (Nx, Turbo, Bazel)",
  Polyrepo: "หนึ่งโปรเจกต์/เซอร์วิส ต่อหนึ่ง Repository — อิสระในการจัดการสิทธิ์ แต่แชร์โค้ดและคุมเวอร์ชัน Library ยากมาก",
  "Event Sourcing": "เก็บประวัติการเปลี่ยนแปลงเป็นลำดับของ Events แทนการเก็บ State ปัจจุบัน — เหมาะกับ Audit Trail และ Debugging",
  CQRS: "**Command Query Responsibility Segregation** — แยก Read และ Write Model ออกจากกัน เพื่อปรับแต่งแต่ละด้านให้เหมาะสม",
  "Idempotency": "คุณสมบัติที่การทำ Operation ซ้ำหลายครั้งให้ผลลัพธ์เหมือนทำครั้งเดียว — สำคัญมากใน Distributed Systems และการทำ Retry",

  // Deployment & Ops
  "Zero Downtime Deployment": "การอัปเดตซอฟต์แวร์โดยที่ระบบไม่หยุดทำงาน — ผู้ใช้ไม่รู้สึกตัวว่ามีการเปลี่ยนเวอร์ชัน",
  "Blue-Green Deployment": "กลยุทธ์ Deploy โดยมี 2 สภาพแวดล้อมเท่ากัน (Blue/Green) — สลับ Traffic ทั้งหมดทีเดียว สลับคืน (Rollback) ได้ทันที",
  "Canary Deployment": "การทยอยปล่อยเวอร์ชันใหม่ให้ผู้ใช้กลุ่มเล็กๆ (เช่น 5%) ทดสอบก่อน — เพื่อจำกัดความเสียหายหากมี Bug ร้ายแรง",
  "Rolling Update": "การทยอยอัปเดตเซิร์ฟเวอร์ทีละเครื่องใน Pool จนครบ — ประหยัดทรัพยากรกว่า Blue-Green แต่ใช้เวลานานกว่า",
  "Expand-Contract": "**Parallel Change Pattern** — ขั้นตอนการเปลี่ยน Database Schema แบบ 5 ขั้น เพื่อไม่ให้ระบบพังระหว่างการ Deploy",
  "Graceful Shutdown": "การปิดระบบอย่างละมุน — รอให้ Request ที่ค้างอยู่ทำงานจนจบก่อนจะหยุดการทำงานของเซิร์ฟเวอร์",
  "RPO": "**Recovery Point Objective** — ระยะเวลาสูงสุดที่ยอมรับได้ในการสูญเสียข้อมูลเมื่อระบบล่ม (เช่น RPO = 4 ชั่วโมง แปลว่าข้อมูลย้อนหลัง 4 ชั่วโมงอาจสูญหายได้)",

  // Observability
  Observability: "ความสามารถในการเข้าใจสถานะภายในของระบบจากข้อมูลภายนอก — ประกอบด้วย Metrics, Logs, Traces",
  "SLO": "**Service Level Objective** — เป้าหมายความน่าเชื่อถือที่วัดได้ เช่น '99.9% ของ Requests ต้องตอบใน < 200ms'",
  "SLA": "**Service Level Agreement** — สัญญาระหว่างผู้ให้บริการและลูกค้า ระบุบทลงโทษหากทำ SLO ไม่ได้",
  "SLI": "**Service Level Indicator** — ตัวชี้วัดจริงที่วัดได้ เช่น อัตรา Error, Latency, Throughput",

  // General
  "Trade-off": "การแลกเปลี่ยน — คุณสมบัติหนึ่งที่ดีขึ้นมักแลกมาด้วยอีกคุณสมบัติที่แย่ลง ไม่มีของฟรีในวิศวกรรม",
  Latency: "ความหน่วง — เวลาที่ข้อมูลเดินทางจากต้นทางถึงปลายทาง (วัดเป็น ms)",
  Throughput: "ปริมาณงานที่ระบบทำได้ต่อหน่วยเวลา (เช่น Requests/sec, Messages/sec)",
  "SPOF": "**Single Point of Failure** — จุดเดียวในระบบที่หากล้มเหลวจะทำให้ทั้งระบบล่ม",
  "Horizontal Scaling": "การเพิ่มจำนวนเครื่อง (Scale Out) แทนการเพิ่มสเปคเครื่องเดิม (Vertical Scaling)",
  "I/O": "**Input/Output** — การรับส่งข้อมูลเข้าและออกจากระบบ (เช่น Disk Read/Write, Network IO) ซึ่งมักเป็นคอขวดหลักในแง่ประสิทธิภาพของระบบ",
  "Eventual Consistency": "โมเดลความสอดคล้องที่ยอมให้ข้อมูลต่างกันชั่วคราว แต่รับประกันว่าจะตรงกันในที่สุด — ใช้ในระบบ Distributed ขนาดใหญ่",
  "Strong Consistency": "โมเดลที่รับประกันว่าทุกโหนดเห็นข้อมูลเดียวกันทันทีหลังเขียน — แลกมาด้วย Latency และ Availability",
};

/** Terms sorted by length descending so longer matches take priority */
export const glossaryTerms = Object.keys(glossary).sort((a, b) => b.length - a.length);
