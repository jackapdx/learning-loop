---
contentType: learning-loop
level: senior
status: polished
tags: [testing, api-testing, service-virtualization, mountebank, mock-server]
prerequisites: []
---

# API Testing with Mountebank: จำลองโลกของ Dependency (Service Virtualization)

---

## ปฐมนิเทศ (Orient)

ระบบ Microservices สมัยใหม่แทบทุกตัวต้องเรียก API ภายนอก ไม่ว่าจะเป็น Payment Gateway, SMS Provider, หรือ Internal Service ของทีมอื่น ปัญหาคือ Dependency เหล่านี้ไม่ได้พร้อมให้คุณทดสอบเสมอ: Sandbox ล่ม, Rate Limit เต็ม, ทีมอื่นยังเขียนไม่เสร็จ, หรือคุณแค่ไม่อยากเสียเงินเรียก API จริงทุกครั้งที่รัน Test การ"Mock" ในโค้ด (if/else หรือ DI Mock) แก้ปัญหาเฉพาะ Unit Test ได้ แต่ **ไม่ได้ทดสอบ Network Call จริงๆ **— คุณจะรู้ได้อย่างไรว่าโค้ดคุณ handle Connection Timeout, 500 Error, หรือ Response ช้าจาก Dependency ได้ถูกต้อง? นี่คือจุดที่ **Service Virtualization ** เข้ามาแทนที่

---

## ลองทำก่อน (Attempt)

> ✍️ ** สถานการณ์:** คุณกำลังสร้างระบบจองตั๋วคอนเสิร์ตที่ต้องเรียก 3 External APIs:
> 1.**Payment API **(Third-party, คิดเงินจริงต่อครั้ง, Sandbox เสถียรแค่ 60%)
> 2.**Seat Map API **(Internal Team B, ยังเขียนไม่เสร็จ — อีก 3 สัปดาห์)
> 3.**SMS Notification API **(Production เดียวกับที่ลูกค้าใช้ — ห้ามส่ง SMS จริงตอนเทส)
>
> ** ข้อจำกัด:**
> - คุณต้องส่งมอบ Integration Test ภายในวันศุกร์นี้
> - CI/CD Pipeline ต้องรัน Test อัตโนมัติทุก Commit
> - ต้องทดสอบ Failure Scenarios: Payment Timeout, Seat Map ตอบกลับช้า 10 วิ, SMS API คืน 503
>
> ** คำถาม:** คุณจะออกแบบ Test Environment อย่างไรให้:
> 1. ทดสอบได้ทันทีโดยไม่ต้องรอ Team B
> 2. ไม่เสียเงินค่า Payment API จริงทุกรอบที่รัน CI
> 3. จำลอง Network Failure ได้เหมือนจริง (Timeout, Latency, 5xx Error)
>
> ** หยุดตรงนี้ก่อน **— (คำใบ้: Mock ในโค้ดจะเทสแค่ Logic แต่การเทส Network Failure ต้องให้มี"ของจริง" มารับ Request แล้วตอบกลับแบบตั้งใจพัง)

---

## ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"ใช้ Mock Library ในโค้ด (Jest Mock, Sinon)" | ⚠️ ** ใช้ได้แค่ Unit Test!**Mock ในโค้ดข้าม Network Layer ไปเลย — คุณไม่มีทางรู้ว่าโค้ดคุณ handle`ECONNREFUSED`, Socket Timeout, หรือ DNS Resolution Failure ได้จริงหรือเปล่า และทุกครั้งที่ API Contract เปลี่ยน คุณต้องตามแก้ Mock ทุกที่ |
|"ใช้ JSON Server / json-server" | ⚠️ ** ดีกว่า Mock ในโค้ด ** เพราะมี Network Call จริง แต่ json-server ทำได้แค่ CRUD REST — ไม่สามารถจำลอง Latency, Fault Injection, หรือ Stateful Behavior (เช่น"ตอบ 200 ครั้งแรก, 500 ครั้งที่สอง") |
|"ใช้ Mountebank / WireMock / MockServer" | ✅ ** นี่คือ Service Virtualization!** คุณสร้าง External HTTP Server จริงๆ ที่รับ Request และตอบกลับตามเงื่อนไขที่คุณตั้งไว้ — รองรับ Latency Injection, Fault Simulation, Proxy Recording และ State Machine เพื่อจำลอง Dependency ได้เหมือนจริงโดยไม่ต้องแก้โค้ดเลยแม้แต่บรรทัดเดียว |

**ทำไมการเลือกนี้สำคัญ?**Mock ในโค้ดทำให้คุณเทสแค่"Happy Path ในหัวคุณ" — แต่ Service Virtualization ทำให้คุณเทส"โลกความเป็นจริงที่พังได้" การที่ระบบคุณรอดจาก Payment Gateway Timeout คือสิ่งที่ Mock ในโค้ดไม่เคยบอกคุณได้

---

## คำอธิบาย (Explain)

### Service Virtualization คืออะไร?

**Service Virtualization ** คือการสร้าง"ตัวปลอม" ของ Dependency ที่ทำงานบน Network จริง — มันรับ Request ผ่าน HTTP/TCP จริงๆ และตอบกลับตาม Behavior ที่คุณกำหนด ต่างจาก Mock ในโค้ดที่แทนที่แค่ Function Call

```text
┌─────────────┐     HTTP Request      ┌──────────────────┐
│  Your App   │ ──────────────────────>│  Mountebank      │
│  (Real)     │ <──────────────────────│  (Virtual API)   │
└─────────────┘     HTTP Response      └──────────────────┘
                                              │
                                        Behavior Config:
                                        - 200 OK (Normal)
                                        - 500 Error (Fault)
                                        - 3000ms Delay (Slow)
                                        - Proxy to Real API
```

### Mountebank — เครื่องมือ Service Virtualization แบบ Protocol-Agnostic

Mountebank สร้างโดย Brandon Byars (อดีต ThoughtWorks) เป็น Open-Source Tool ที่จำลอง HTTP, HTTPS, TCP, SMTP, GraphQL และ gRPC ได้ผ่าน REST API หรือ CLI [source: mountebank docs — overview]

**แนวคิดหลัก 3 อย่าง:**

1.**Imposter **—"ตัวปลอม" คือ Service เสมือนที่เปิด Port รับ Request จริงๆ (เช่น`http://localhost:4545`)
2.**Stub **— กฎการตอบกลับของ Imposter นั้นๆ (เช่น"ถ้า Request เป็น POST /pay → ตอบ 200")
3.**Predicate **— เงื่อนไขที่ใช้เลือก Stub (match URL, Method, Headers, Body Content)

```js
// ตัวอย่าง: สร้าง Payment API ปลอมผ่าน Mountebank REST API
// สมมติ Mountebank รันที่ localhost:2525 (management port)
// เราสั่งให้มันสร้าง Imposter ที่ localhost:4545

POST http://localhost:2525/imposters
{
 "port": 4545,
 "protocol":"http",
 "stubs": [
    {
     "predicates": [
        {
         "equals": {"method":"POST","path":"/pay" }
        }
      ],
     "responses": [
        {
         "is": {
           "statusCode": 200,
           "headers": {"Content-Type":"application/json" },
           "body": {"transactionId":"txn_123","status":"success" }
          }
        }
      ]
    },
    {
      // Stub ที่ 2: จำลอง Payment Timeout (ตอบช้า 10 วิ)
     "predicates": [
        {
         "equals": {"method":"POST","path":"/pay" },
          // ⚠️ ปัญหา: predicates ซ้ำกับ stub แรก → ใช้ matching order หรือ x-inject header
        }
      ],
     "responses": [
        {
         "is": {
           "statusCode": 200,
           "body": {"status":"success" }
          },
         "_behaviors": {
           "wait": 10000  // ตอบช้า 10 วินาที — จำลอง Network Latency
          }
        }
      ]
    }
  ]
}
```
> ⚠️ ** ข้อจำกัดของตัวอย่างข้างบน:** ถ้าใช้ Predicate ซ้ำกัน Mountebank จะเลือก Stub แรกที่ Match เสมอ — ถ้าต้องการให้ระบบทำงานได้หลาย State ต้องใช้ **Stub Overlap Behavior ** หรือ`x-mountebank-inject-headers` เพื่อให้ Client เลือกว่าจะให้ตอบแบบไหน [source: mountebank docs — predicates]

---

## ขยายความ (Extend)

### Mountebank vs WireMock vs MockServer — เลือกอะไรเมื่อไหร่?

| | Mountebank | WireMock | MockServer |
|---|---|---|---|
|**Language **| Node.js | Java (Standalone JAR) | Java (Standalone JAR) |
|**Protocols **| HTTP, HTTPS, TCP, SMTP, gRPC | HTTP, HTTPS | HTTP, HTTPS |
|**Config API **| REST API (JSON) | REST API + Java DSL | REST API + Java/JS Client |
|**Proxy Recording **| ✅`proxyOnce` /`proxyAlways` | ✅ Record & Playback | ✅ Forward & Record |
|**State Machine **| ✅`behaviors` (wait, repeat, shell) | ✅ Scenarios (limited) | ❌ (ต้องทำเองผ่าน Callback) |
|**Latency Injection **| ✅`wait` behavior | ✅`withFixedDelay()` | ❌ (ต้องใช้ proxy delay) |
|**Fault Injection **| ✅`shellTransform` (run script), TCP disconnect | ✅`withFault()` | ❌ |
|** เหมาะเมื่อ **| ต้องการเทสหลาย Protocol, Fault Injection ซับซ้อน, CI Pipeline เบาๆ | ทีม Java, ต้องการ Java DSL, เทส HTTP/HTTPS เป็นหลัก | เทส Microservices ที่มี Dynamic Port, ต้องการ Client Library |
|** ไม่เหมาะเมื่อ **| ทีมไม่มี Node.js runtime ใน CI, ต้องการ Java SDK Integration | ต้องเทส TCP/gRPC/SMTP | ต้องการ Stateful Behavior หรือ Fault Injection |

### เมื่อไหร่ควรใช้ Service Virtualization (และเมื่อไหร่ไม่ควร)

**ควรใช้ Service Virtualization เมื่อ:**
- ✅ Dependency ยังพัฒนาไม่เสร็จ หรือไม่เสถียรพอให้เทส
- ✅ ต้องการเทส Failure Scenarios ที่ Dependency จริงทำให้เกิดยาก (Timeout, 5xx, Malformed Response)
- ✅ CI/CD ต้องการรัน Test ซ้ำๆ โดยไม่เสียค่าใช้จ่าย (API ที่คิดเงินต่อ Call)
- ✅ ต้องการ Contract Testing — Verify ว่า Request ที่คุณส่งตรงกับ Spec ของ Dependency

**ไม่ควรใช้ Service Virtualization เมื่อ:**
- ❌ Dependency มี Behavior ซับซ้อนที่จำลองไม่ได้ (ML Model, Legacy Mainframe)
- ❌ การเปลี่ยน API Contract บ่อยทำให้ Maintaining Stubs แพงกว่าการรอของจริง
- ❌ Dependency มี Rate Limit ที่ไม่กระทบ Test (ฟรี Tier เพียงพอ)

### สิ่งที่ต้องแลก (Trade-offs)

-**Maintenance Cost:** ทุกครั้งที่ API Contract ของ Dependency เปลี่ยน คุณต้องอัปเดต Stubs — ถ้ามี 10 Microservices ที่ใช้ Payment API เดียวกัน ต้องอัปเดต Stubs 10 ที่
-**False Confidence:**Stubs ตอบแบบที่คุณ"คิดว่า" Dependency จะตอบ — แต่ของจริงอาจตอบต่างจากที่คุณคิด ทำให้ Test ผ่าน แต่ Production พัง
-**Complexity:** การตั้งค่า Mountebank ใน CI Pipeline (Docker, Network, Port Management) เพิ่มความซับซ้อนให้ Infrastructure

### เทคนิค Production: Proxy Recording + Stub

Mountebank มีโหมด`proxyOnce` — มันจะ Forward Request ไปยัง API จริงครั้งแรก, เก็บ Response ไว้, และใช้ Response ที่เก็บไว้ในครั้งต่อๆ ไป:

```json
{
 "port": 4545,
 "protocol":"http",
 "stubs": [
    {
     "responses": [
        {
         "proxy": {
           "to":"https://api.real-payment.com",
           "mode":"proxyOnce"
          }
        }
      ]
    }
  ]
}
```
> ⚠️ ** ข้อควรระวัง:**`proxyOnce` ใช้ได้ดีกับ Idempotent API (GET, Read-only) — กับ POST/PUT ที่มี Side Effect (สร้าง Transaction จริง) มันจะสร้างของจริงในครั้งแรก! ใช้`proxyAlways` หรือเขียน Custom Stub แทนสำหรับ Mutating Operations

---

## จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. Mock ในโค้ด (Jest Mock) กับ Service Virtualization (Mountebank) ต่างกันที่อะไร? และทำไม Mock ในโค้ดถึงไม่พอสำหรับ Integration Test?
> 2. ถ้าคุณใช้ Mountebank`proxyOnce` กับ POST`/create-order` — อะไรคือความเสี่ยง?
> 3. คุณมี Payment API ที่เปลี่ยน`/v1/pay` เป็น`/v2/pay` — ถ้าคุณใช้ Mountebank Stubs อยู่ 10 Microservices คุณต้องแก้กี่ที่? และนี่คือ Trade-off อะไรของ Service Virtualization?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.**Mock ในโค้ด ** แทนที่ Function Call — มันทดสอบเฉพาะ Logic แต่ไม่ทดสอบ Network Layer (Timeout, Connection Refused, DNS Failure, Serialization)**Service Virtualization ** สร้าง Server ปลอมที่รับ HTTP Request จริง — ทำให้ทดสอบ Network Behavior, Retry Logic, Circuit Breaker, และ Timeout Handling ได้ทั้งหมดในระดับ Integration Test

2.** เสี่ยงสร้าง Order จริง!**`proxyOnce` จะ Forward POST ไป API จริงในครั้งแรกและสร้าง Order จริง — ถ้า API นั้นไม่ใช่ Idempotent (สั่งซื้อของ, หักเงิน) จะเกิด Side Effect ใน Production ควรใช้ Custom Stub หรือ`proxyAlways` สำหรับ Write Operations

3.** ต้องแก้ 10 ที่ **— ทุก Microservice ที่มี Stub ของ Payment API ต้องอัปเดต Path จาก`/v1/pay` →`/v2/pay` นี่คือ **Maintenance Cost ** ของ Service Virtualization: Stubs กระจายตาม Microservices, ไม่ใช่ Single Source of Truth การแก้คือใช้ Shared Mountebank Config (Config-as-Code ใน Git Repo กลาง) หรือใช้ Contract Testing (Pact) เพื่อ Detect Breaking Change

</details>

---

## สะท้อนคิด (Reflect)

> 💭 ในระบบที่คุณทำอยู่ตอนนี้ External Dependency ตัวไหนที่"เทสกับของจริงไม่ได้" บ้าง? (เสียเงิน, ยังไม่เสร็จ, ไม่เสถียร) แล้วคุณมั่นใจแค่ไหนว่าโค้ดคุณ handle ทุก Failure Mode ของ Dependency นั้นได้อย่างถูกต้อง — ไม่ใช่แค่ Happy Path? การที่ CI ผ่านสีเขียวทุกวัน อาจหมายความว่าคุณแค่"ยังไม่เคยลองเทสให้มันพัง"

---

## หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[02-load-testing|Load Testing: กดดันระบบให้ถึงจุดแตกหัก]]
- [[../Distributed/02-dual-write|Dual Write: เมื่อเขียน 2 ระบบต้องทำอย่างไรให้ Atomic]]
- [[../Networking/03-grpc-vs-rest|gRPC vs REST: Protocol ไหนเหมาะกับ Internal Service]]
- [[../Observability/00-overview|Observability & SRE: การมองเห็นสิ่งที่ซ่อนอยู่ในระบบ]]
- [Mountebank Documentation](https://www.mbtest.org/docs/overview)
