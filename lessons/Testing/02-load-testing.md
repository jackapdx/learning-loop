---
verified: false
contentType: learning-loop
level: senior
status: polished
tags: [testing, load-testing, performance, k6, artillery, stress-testing]
prerequisites: []
---

# Load Testing: หาจุดแตกหักก่อนผู้ใช้หาเจอ (k6, Artillery, wrk)

---

## 🎯 ปฐมนิเทศ (Orient)

"ระบบเรารับ 1,000 req/s ได้สบาย" — แต่คุณรู้ได้อย่างไร? ถ้าคำตอบคือ"ก็ยังไม่เคยพังนี่" แสดงว่าคุณกำลังทดสอบระบบด้วยความหวัง ไม่ใช่ด้วยข้อมูล ผู้ใช้ 10 คนอาจใช้งานได้ดี แต่ผู้ใช้ 10,000 คนพร้อมกันคือคนละโลก — Connection Pool หมด, Database Lock สะสม, GC Pause ถี่จนระบบสะดุด, Memory Leak ที่ซ่อนอยู่โผล่มาตอน Load สูง Load Testing ไม่ใช่แค่"ยิง Request เยอะๆ" แต่มันคือการออกแบบ Experiment ที่มี Hypothesis, Metrics, และ Threshold ที่ชัดเจน — เพื่อหาจุดที่ระบบคุณจะพัง **ก่อน ** ที่ผู้ใช้จริงจะเป็นคนหามันเจอ

---

## 🧪 ลองทำก่อน (Attempt)

> ✍️ ** สถานการณ์:** คุณเป็นเจ้าของระบบ E-commerce ที่จะเปิดตัว Flash Sale พรุ่งนี้เวลา 10:00 น. ทีม Marketing คาดการณ์ Traffic:
> - ผู้ใช้พร้อมกันสูงสุด 50,000 คน
> - เฉลี่ย 5,000 orders/นาที ในช่วง 10 นาทีแรก
> - แต่ละ Order มี 4 API Calls:`POST /cart/add`,`POST /checkout`,`POST /pay`,`GET /order/status`
>
> ** ระบบปัจจุบัน:**
> - 3 Node.js Instances หลัง Load Balancer (L7)
> - PostgreSQL Primary + 2 Read Replicas
> - Redis สำหรับ Session และ Cart Cache
> - Connection Pool: 20 connections ต่อ Instance (รวม 60 ไป DB)
>
> ** คำถาม:**
> 1. คุณจะรู้ได้อย่างไรว่า 3 Instances กับ 60 DB Connections นี้พอสำหรับ 50,000 Concurrent Users?
> 2. ถ้าจะทดสอบ Load Test ** ก่อน ** วันจริง — คุณควรวัด Metrics อะไรบ้างถึงจะรู้ว่า"คอขวด" อยู่ตรงไหน? (CPU? DB Connections? Redis? P99 Latency?)
>
> ** หยุดตรงนี้ก่อน **— (คำใบ้: คำว่า"รับไหว" ต้องมีตัวเลขกำกับ —"P99 Latency < 500ms ที่ 5,000 req/s และ Error Rate < 0.1%")

---

## 💬 ผลตอบรับ (Feedback)

| หากคุณตอบว่า... | การวิเคราะห์ |
|:---|:---|
|"ใช้ Apache Bench ยิงเยอะๆ แล้วดูว่า Error มั้ย" | ⚠️ ** ไม่พอ!**Apache Bench (`ab`) ยิง Request แบบ Sequential จากเครื่องเดียว — มันไม่จำลอง Concurrent Users จริง, ไม่มี Ramp-Up Pattern (Traffic ค่อยๆ เพิ่ม), ไม่มี Custom Assertions, และไม่เก็บ Metrics ระหว่าง Test |
|"ใช้ k6/Artillery เขียน Script, ยิงจาก 1 เครื่อง, วัด P99 Latency" | ⚠️ ** เกือบดี!** แต่การยิงจาก 1 เครื่องหมายความว่า Client-Side อาจเป็นคอขวดก่อนระบบ — คุณต้องรู้ว่าเมื่อไหร่ที่ Load Generator เองเริ่มอิ่มตัว (CPU/Network ของเครื่องที่ยิง) และต้องใช้ Distributed Load Generator สำหรับ 50K Concurrent |
|"ออกแบบ Test Plan: Ramp-Up 0→5,000 VUs ใน 5 นาที → Hold 10 นาที → วัด P50/P90/P99 Latency, Error Rate, Throughput, DB Connection Usage, Redis Hit Rate, CPU/Memory ** พร้อมกัน **— และใช้ Distributed k6 หรือ Artillery จากหลายเครื่อง/หลาย Region" | ✅ ** นี่คือ Load Test ที่มี Hypothesis!** คุณไม่ได้แค่"ยิงแล้วดูว่าพังมั้ย" — คุณออกแบบ Experiment ที่มีเป้าหมายชัดเจน: Confirm ว่าระบบรับ 5,000 req/s โดย P99 < 500ms และคุณวัด Metrics เพียงพอที่จะ pinpoint คอขวดได้ถ้ามันพัง (Latency Spike ที่ DB Query? หรือ Redis? หรือ App Server CPU?) |

**ทำไมการคิดแบบนี้สำคัญ?**Load Test ที่ไม่มี Hypothesis คือการสุ่มยิง Request แล้วหวังว่าจะเจอ Bug — เหมือนหมอที่สุ่มฉีดยาโดยไม่รู้ว่ากำลังรักษาอะไร Load Test ที่ดีเริ่มจากคำถาม:"ที่ 5,000 req/s ตัวไหนจะพังก่อน?" และออกแบบ Experiment เพื่อตอบคำถามนั้น

---

## 📖 คำอธิบาย (Explain)

### Load Testing คืออะไร (และไม่ใช่อะไร)?

**Load Test **= จำลอง Traffic จริงเพื่อวัดประสิทธิภาพระบบภายใต้ Load ที่คาดการณ์
**Stress Test **= เพิ่ม Load เกินกว่าที่คาดการณ์จนระบบพัง เพื่อหา Breaking Point
**Spike Test **= เพิ่ม Load อย่างรวดเร็ว (0 → 10,000 req/s ใน 5 วินาที) เพื่อทดสอบ Auto-Scaling
**Soak Test **= ใช้ Load ปานกลางต่อเนื่อง 12-72 ชั่วโมง เพื่อหา Memory Leak และ Resource Degradation

| Test Type | คำถามที่ตอบ | Duration | Load Pattern |
|---|---|---|---|
|**Load Test **|"ระบบรับ 5,000 req/s ได้มั้ย?" | 10-30 นาที | ค่อยๆ เพิ่ม → Hold |
|**Stress Test **|"ระบบพังที่กี่ req/s?" | จนกว่าพัง | เพิ่มเรื่อยๆ จนพัง |
|**Spike Test **|"Auto-Scaling ทันมั้ย?" | 5-10 นาที | กระโดดทันที |
|**Soak Test **|"Memory Leak มั้ยหลังรัน 24 ชม.?" | 12-72 ชม. | คงที่ ปานกลาง |

### เลือกเครื่องมือ Load Test ตาม Context

| | k6 (Grafana) | Artillery | wrk/wrk2 | Vegeta |
|---|---|---|---|---|
|**Language **| Go (Script with JS) | Node.js | C | Go |
|**Script Style **| JavaScript (ES6) | YAML + JS Hooks | CLI Flags | CLI + Target File |
|**Ramp-Up **| ✅ Stages | ✅ Phases | ❌ (wrk2 มี constant rate) | ✅`-rate` |
|**Assertions **| ✅`checks` +`thresholds` | ✅`ensure` | ❌ | ❌ |
|**Distributed **| ✅ k6 Cloud / k6-operator | ✅ Artillery Pro / AWS Lambda | ❌ | ❌ |
|**Metrics Output **| ✅ Built-in (JSON, CSV, Prometheus, Cloud) | ✅ JSON + Plugins | ✅ Summary (stdout) | ✅ JSON, CSV, Histogram |
|** เหมาะเมื่อ **| Developer-first, CI/CD integration, ต้องการ Script + Assertions + Metrics ครบ | ทีม Node.js, Test Scenario ซับซ้อน (Multi-Step Flow), YAML อ่านง่าย | Benchmark เร็วๆ, หา Throughput สูงสุด, ไม่มี Assertions ซับซ้อน | HTTP Benchmarking ง่ายๆ, Constant Rate Testing |
|** ไม่เหมาะเมื่อ **| ต้องการ GUI (ไม่มี — ใช้ Grafana Dashboard แทน), ทีมไม่คุ้น JS | Large-Scale Distributed (ต้องใช้ Artillery Pro — มีค่าใช้จ่าย), Protocol อื่นนอกจาก HTTP/WebSocket | Complex Scenario (Multi-Step, Dynamic Data), Assertions, CI/CD Reports | Multi-Protocol (HTTP เท่านั้น), Complex Test Flow |
|**Distributed Cost ** | ✅ Open-source k6-operator (K8s) หรือ k6 Cloud ($$) | ⚠️ Artillery Pro ($$$) หรือ DIY Lambda | ❌ Single Machine | ❌ Single Machine |

### ตัวอย่าง k6 Script สำหรับ Flash Sale

```javascript
// flash-sale-test.js
// ⚠️ ข้อสมมติ: API Endpoints รองรับ Concurrent Write, Redis พร้อม, DB Connection Pool เพียงพอ
// ⚠️ ข้อจำกัด: Script นี้ทดสอบ Checkout Flow — ไม่รวม Payment Gateway จริง (ใช้ Mountebank หรือ Mock)

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom Metrics — วัดสิ่งที่ Golden Signals ต้องการ
const errorRate = new Rate('errors');
const checkoutDuration = new Trend('checkout_duration');
const payDuration = new Trend('pay_duration');

export const options = {
  stages: [
    { duration: '2m', target: 1000 },   // Ramp-Up: 2 นาที → 1,000 VUs
    { duration: '5m', target: 5000 },   // Ramp-Up: 5 นาที → 5,000 VUs
    { duration: '10m', target: 5000 },  // Hold: 10 นาทีที่ 5,000 VUs
    { duration: '2m', target: 0 },      // Ramp-Down
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],   // P99 ต้อง < 500ms — ถ้าเกิน Test Fail
    errors: ['rate<0.01'],              // Error Rate ต้อง < 1%
    'checkout_duration': ['p(95)<300'], // Checkout P95 < 300ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // แต่ละ VU (Virtual User) จำลอง User จริง 1 คน
  group('Browse Products', () => {
    const res = http.get(`${BASE_URL}/api/products?page=1`);
    check(res, { 'products OK': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('Add to Cart', () => {
    const payload = JSON.stringify({ productId: 'prod_123', quantity: 1 });
    const res = http.post(`${BASE_URL}/api/cart/add`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    check(res, { 'cart OK': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('Checkout', () => {
    const res = http.post(`${BASE_URL}/api/checkout`, '{}', {
      headers: { 'Content-Type': 'application/json' },
    });
    checkoutDuration.add(res.timings.duration);
    check(res, { 'checkout OK': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  // ผู้ใช้จริงไม่ได้ยิง Request ตลอดเวลา — มี Think Time
  sleep(Math.random() * 3 + 1); // 1-4 วิ ระหว่างแต่ละรอบ
}
```

> ⚠️ **ข้อจำกัดของ Script:**`sleep()` random กระจาย Request — แต่ใน Flash Sale จริงผู้ใช้จะกดพร้อมกันหมด (Thundering Herd) — Spike Test ควรใช้`scenarios` แบบ`ramping-arrival-rate` แทน`ramping-vus`

---

## 🔬 ขยายความ (Extend)

### การออกแบบ Load Test ที่มี Hypothesis (ไม่ใช่แค่ยิงมั่ว)

Load Test ที่ดีมี 4 ขั้นตอน:

**1. ตั้ง Hypothesis **
"ที่ 5,000 req/s, ด้วย 3 Instances และ 60 DB Connections — P99 Latency จะ < 500ms และ Error Rate < 0.1%"

**2. ออกแบบ Experiment **
- กำหนด Load Profile (Ramp-Up, Hold, Spike)
- เลือก Virtual User Type (แต่ละ VU ทำอะไร — Browse, Search, Checkout)
- กำหนด Metrics ที่จะวัด (Golden Signals: Latency, Traffic, Errors, Saturation)
- กำหนด Thresholds (ผ่าน/ไม่ผ่าน)

**3. สังเกตระหว่าง Test **
- ดู Metrics แบบ Real-Time (Grafana Dashboard)
- จดบันทึกเวลาที่ Metrics เริ่มเปลี่ยน —"ที่ 3,200 VUs, P99 Latency เริ่มเกิน 200ms" → นี่คือสัญญาณเตือนแรก
- เช็ค Saturation: DB Connections, Thread Pool, Redis Memory, Network Bandwidth

**4. วิเคราะห์ผล **
- Hypothesis ถูกหรือผิด?
- ถ้าผิด — เพราะอะไร? (DB Lock? Connection Pool? Network?)
- คอขวดอยู่ที่ Layer ไหน? (App → DB → Cache → Network)
- ต้องเปลี่ยนอะไรก่อนเปิดจริง?

### กับดักของ Load Testing ที่วิศวกรมักพลาด

| กับดัก | ทำไมถึงพลาด | วิธีแก้ |
|---|---|---|
|**Client-Side Bottleneck **| Load Generator เครื่องเดียว CPU/Network เต็มก่อนระบบ — คุณวัด Limit ของเครื่องยิง ไม่ใช่ของระบบ | ใช้ Distributed Load Generator (k6-operator, หลายเครื่อง) |
|**Testing ไม่เหมือน Production **| Test กับ Dataset หลักร้อยแถว — แต่ Production มีหลักล้านแถว (Index ทำงานต่างกัน) | ใช้ Production-like Dataset (Anonymized) |
|**Warm-Up ไม่พอ **| JIT Compiler, Connection Pool, Cache ยังไม่ Warm — วัด Cold Start แทน Steady State | Run Warm-Up Phase 5-10 นาทีก่อนเริ่มวัด |
|**Staging != Production **| Staging มี 3 Instances เหมือน Prod — แต่ Prod มี Network Latency ระหว่าง AZ, Shared Resources, Noisy Neighbor | Test บน Production ในช่วง Low Traffic (หรือ Canary Test) |
|** ไม่มี Assertions **| Test"เสร็จ" แต่ Response Body มีแต่ Error Message โดยที่ Status Code ยังเป็น 200 | k6`checks` ตรวจ Response Body + Status Code + Duration |
|** เทสแค่ Happy Path **| User ทำ Browse → Add → Checkout สำเร็จหมด — แต่ของจริงมี Abandoned Cart, Retry, Double Submit | จำลอง User Behavior หลากหลาย: Abandon, Retry, Concurrent Sessions |

### ตารางสรุป: เลือกเครื่องมือยังไง?

| สถานการณ์ | เครื่องมือที่แนะนำ | เพราะอะไร |
|---|---|---|
|**Developer ทีมเล็ก, CI/CD, GitHub Actions **| k6 | เขียน JS, Assertions ในตัว, อ่านง่าย, Open-Source |
|** ทีม Node.js, Complex Multi-Step Flow **| Artillery | YAML Config, JS Hooks สำหรับ Custom Logic, Node.js Ecosystem |
|**Benchmark HTTP เร็วๆ, หา Max Throughput **| wrk2 | เร็วมาก (C), Constant Rate, CLI ง่าย |
|** ทีม DevOps/QA องค์กรใหญ่, GUI **| JMeter | GUI-based, Plugins เยอะ, Legacy Support |
|**Python Team, Code-Based Test **| Locust | Python Script, Web UI, Distributed Built-in |

---

## ✅ จุดตรวจสอบ (Checkpoint)

> **Quick Check:**
> 1. คุณใช้ Load Test กับระบบที่ P99 Latency = 50ms ที่ 1,000 VUs แต่เมื่อเพิ่มเป็น 5,000 VUs P99 กลายเป็น 3,000ms — แต่ CPU ทุกตัวยังอยู่ที่ 30% —"คอขวด" น่าจะอยู่ที่ไหน?
> 2. ทำไมการยิง Load Test จากเครื่องเดียวถึงให้ผลที่ไม่น่าเชื่อถือเมื่อ Target เป็น 50,000 Concurrent Users?
> 3.`thresholds` ใน k6 ต่างจาก`checks` อย่างไร? และทำไมคุณถึงต้องมีทั้งสองอย่าง?

<details>
<summary>🎯 ดูเฉลย (คลิกเพื่อเปิด)</summary>

1.**Connection Pool หรือ External Dependency คือคอขวด **— CPU ที่ 30% แปลว่า App ไม่ได้ทำงานหนัก แต่กำลัง"รอ" — อาจเป็น DB Connection Pool เต็ม (60 Connections ใช้หมด — Request ใหม่ต้องรอ Connection ว่าง), Redis Blocking, หรือ Network I/O Wait ให้ดู Saturation Metrics: DB Active Connections, Thread Pool Queue Length, Redis Latency

2.**Client-Side คือคอขวดตัวใหม่ **— 1 เครื่องมี Limit ที่ CPU, Network Bandwidth, File Descriptors, Ephemeral Ports (Linux default ~28K ports) — 50K Concurrent Connections จาก 1 เครื่องแทบเป็นไปไม่ได้ คุณจะวัด Limit ของ Load Generator ไม่ใช่ของระบบ การใช้ Distributed Load Generator (หลายเครื่อง, k6-operator) แก้ปัญหานี้

3.**`checks` = Assertions ต่อ Request **(เช่น"status คือ 200") — ถ้า Fail มันไม่หยุด Test **`thresholds` = Pass/Fail Criteria ของ Test **(เช่น"Error Rate ต้อง < 1%") — ถ้าเกิน Test จะ Fail (Exit Code ไม่ใช่ 0) ทำให้ CI/CD Pipeline หยุด Deploy ได้ ต้องมีทั้งคู่:`checks` บอกว่าเกิดอะไรขึ้น,`thresholds` บอกว่าทั้ง Test ผ่านหรือไม่ผ่าน

</details>

---

## 🤔 สะท้อนคิด (Reflect)

> 💭 ครั้งสุดท้ายที่ระบบคุณมีปัญหาเรื่อง Performance — คุณรู้ก่อนหรือหลังผู้ใช้รู้? ถ้าคุณมี Load Test ตอนนี้ มันตอบคำถามอะไรได้บ้าง?"ระบบรับได้กี่ req/s?" หรือ"ที่ 10,000 req/s ตัวไหนจะพังก่อน และพังยังไง?" — ความต่างระหว่างสองคำถามนี้คือความต่างระหว่าง"มีความหวัง" กับ"มีข้อมูล"

---

## 📚 หัวข้อที่เกี่ยวข้อง (Related Topics)

- [[01-api-testing-mountebank|API Testing with Mountebank: จำลอง Dependency ก่อน Load Test]]
- [[../Observability/01-monitoring-levels|Monitoring Levels: Golden Signals, RED, USE — Metrics ที่ต้องวัดระหว่าง Load Test]]
- [[../Networking/01-load-balancing-l4-l7|Load Balancing (L4 vs L7): เมื่อ Load Balancer กลายเป็นคอขวด]]
- [[../Distributed/01-self-recovery|Self-Recovery: Auto-Scaling และ Circuit Breaker เมื่อ Load Test เจอจุดพัง]]
- [k6 Documentation](https://grafana.com/docs/k6/latest/)
- [Artillery Documentation](https://www.artillery.io/docs)
