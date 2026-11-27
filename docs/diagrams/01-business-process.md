# 01 — Business process (As-Is / To-Be)

productivity-tracking-web (TrackIt) คือเว็บติดตามรายการสื่อหลายประเภท (อนิเมะ มังงะ หนัง หนังสือ เกม ฯลฯ) ส่วนตัว ผู้ใช้ที่ยังไม่ล็อกอินเห็นพื้นที่เดโมที่เก็บใน localStorage ส่วนผู้ล็อกอิน (NextAuth) อ่านเขียนรายการผ่าน `/api/tracking` ซึ่งส่งต่อไปยัง tracking cell หลัง gateway เว็บเองเก็บเฉพาะข้อมูลล็อกอินใน Postgres ผ่าน Prisma และส่ง analytics เฉพาะเมื่อเปิดใช้และผู้ใช้ยินยอม

Last reviewed: 2026-11-28 · commit `a9bd186`

## As-Is (จากโค้ดวันนี้)

```mermaid
flowchart TD
  V["ผู้เยี่ยมชมเปิดหน้าแรก src/app/page.tsx"] --> AUTH{"useSession: ล็อกอินแล้ว?"}
  AUTH -->|ไม่| DEMO["พื้นที่เดโม: DEMO_ITEMS + localStorage ในเบราว์เซอร์ ไม่ส่งขึ้น server"]
  AUTH -->|ล็อกอิน| SIGNIN["NextAuth ผู้ให้บริการที่ตั้งค่า env เท่านั้น: Google GitHub Discord อีเมล, session เก็บใน Postgres ผ่าน Prisma"]
  SIGNIN --> BAPI["fetch /api/tracking GET POST PUT DELETE"]
  BAPI --> GUARD{"มี session? userId ตรงกับ session? write ผ่าน CSRF, JSON, zod strict, ไม่เกิน 16 KB?"}
  GUARD -->|ไม่| REFUSE["ตอบ 401 / 403 / 405 / 413 / 415 / 400"]
  GUARD -->|ผ่าน| FWD["ส่งต่อ /api/internal/tracking พร้อม x-internal-secret, origin จาก config เท่านั้น"]
  FWD -->|ไม่มี secret หรือ origin ไม่ใช่ HTTPS| E503["503 Service unavailable"]
  FWD -->|ต่อไม่ได้หรือ redirect| E502["502 Bad gateway"]
  FWD --> INT["internal route: ตรวจ secret แล้วเรียก trackingCell"]
  INT --> USER["POST เท่านั้น: prisma.user ต้องมีอยู่ ไม่เจอ = 404"]
  USER --> TOKEN["trackingCell ขอ access token: client_credentials + private_key_jwt จาก identity service"]
  TOKEN --> CELL["gateway /v1/users/userId/tracking แล้ว tracking cell productivity-tracking-api (repo อื่น): CRUD รายการ และ activity log"]
  CELL -->|"สำเร็จ"| TRACK["track(): ส่ง event ที่ allow-list ไป PostHog ถ้าเปิดใช้ ล้มเหลวหรือ timeout 2 วินาทีถูกกลืน"]
  CELL -->|"409 ซ้ำ / 404 ไม่ใช่ของตน / 400"| MAP["แปลงเป็นข้อความ error ของเว็บ"]
  CELL -->|"อื่นๆ หรือ timeout 10 วินาที"| E500["500 และ track tracking_write_failed ถ้ายังไม่ commit"]
  V --> BANNER["แบนเนอร์ยินยอม: ก่อนเลือกไม่โหลด SDK ยอมรับแล้ว page view และ identify ฝั่งเบราว์เซอร์"]
  V --> SENTRY["error เท่านั้นส่ง Sentry เมื่อมี DSN, scrubEvent ตัดข้อมูลส่วนบุคคล"]
  KPI["analytics/kpi/*.sql รันมือ อ่านตาราง User และ UserTracking เดิม"] -.-> DB["Postgres ของเว็บ"]
  CI["push/PR เข้า main: CI กลาง + security scan"] --> DEPLOY["Vercel Git deploy แล้ว deploy-smoke ตรวจ /api/health และ /more-projects [ต้องยืนยัน]"]
  DEPLOY --> V
```

Sources: `src/app/page.tsx`, `src/app/api/tracking/route.ts`, `src/app/api/internal/tracking/route.ts`, `src/lib/tracking-cell.ts`, `src/lib/auth.ts`, `src/lib/prisma.ts`, `prisma/schema.prisma`, `src/lib/analytics.ts`, `src/lib/browser-analytics.ts`, `src/components/analytics/analytics-provider.tsx`, `src/lib/sentry.ts`, `analytics/kpi/*.sql`, `scripts/deploy-smoke.sh`, `.github/workflows/deploy-smoke.yml`, `specs/003-tracking-cell/spec.md`, `AUTH.md`

ข้อเท็จจริงเพิ่มเติมจากโค้ด: `src/app/api/mcp/route.ts` เป็นโครง MCP ที่ `tools/call` ตอบข้อความ placeholder ("Implement your tracking logic here") ไม่ได้เรียกข้อมูลจริง

## To-Be (OUTCOME-REVIEW-001 และ SPEC-003)

```mermaid
flowchart TD
  V["ผู้เยี่ยมชมเปิดหน้าแรก src/app/page.tsx"] --> AUTH{"useSession: ล็อกอินแล้ว?"}
  AUTH -->|ไม่| DEMO["พื้นที่เดโม: DEMO_ITEMS + localStorage"]
  AUTH -->|ล็อกอิน| SIGNIN["NextAuth (คงไว้ตาม SPEC-003 Q2) + Postgres ผ่าน Prisma"]
  SIGNIN --> BAPI["fetch /api/tracking"]
  BAPI --> GUARD["ตรวจ session, CSRF, schema"]
  GUARD --> FWD["ส่งต่อ /api/internal/tracking"]
  FWD --> TOKEN["access token จาก identity service"]
  TOKEN --> CELL["gateway แล้ว tracking cell productivity-tracking-api"]
  CELL --> TRACK["track(): event ที่ allow-list ไป PostHog"]
  V --> BANNER["แบนเนอร์ยินยอม"]
  V --> COUNT["นับทราฟฟิกแบบไม่ใช้คุกกี้ เพื่อแยก ไม่มีผู้เข้า กับ ไม่ยินยอม (OR-101 ข้อ 3)"]
  KPI["analytics/kpi/*.sql เขียนใหม่ให้อ่าน schema ของ tracking cell (OR-101 ข้อ 1)"] -.-> CELLDB["ฐานข้อมูลของ tracking cell"]
  STOP["หยุด loop KPI หลังรีวิว OR-101 ไม่เปิด OR-102 จนกว่าจะมีผู้ใช้จริง (OR-101 ข้อ 2)"] -.-> KPI
```

Sources: `docs/measurement/OUTCOME-REVIEW-001.md` (Decisions and actions, decided 2026-11-26), `specs/003-tracking-cell/spec.md` (Q2: keep NextAuth)

## Gap

| ID | As-Is → To-Be | Status | Owner | Evidence |
|---|---|---|---|---|
| G1 | KPI SQL อ่านตาราง `UserTracking` เดิมที่ schema Prisma ไม่มีแล้ว → เขียนใหม่ให้อ่าน schema ของ tracking cell | todo | claude | `docs/measurement/OUTCOME-REVIEW-001.md` ข้อ 1 (due 2026-12-05, `outcome-review/OR-101#1`); `analytics/kpi/KPI-O-01-weekly-active-trackers.sql` |
| G2 | แยก ไม่มีผู้เข้า ออกจาก ไม่ยินยอม ไม่ได้ เพราะ analytics ฝั่งเบราว์เซอร์ต้องยินยอมก่อน → มีตัวนับทราฟฟิกแบบไม่ใช้คุกกี้ | todo | owner | `docs/measurement/OUTCOME-REVIEW-001.md` ข้อ 3 (due 2026-12-05, `outcome-review/OR-101#3`) |
| G3 | วัด KPI ต่อด้วย event และ SQL → หยุด loop KPI หลังรีวิวนี้ คง TrackIt เป็นเดโมในพอร์ตโฟลิโอ | todo | owner | `docs/measurement/OUTCOME-REVIEW-001.md` ข้อ 2 (due 2026-11-30, `outcome-review/OR-101#2`) |

## Open questions

- SPEC-003 AC-04 กำหนดให้ tracking cell เปลี่ยน origin lock จาก `report` เป็น `enforce` หลังหนึ่งสัปดาห์ ส่วน Implementation (2026-11-12) บันทึกไว้ว่า `report`: โหมดปัจจุบันของ cell อยู่นอก repo นี้ ยืนยันจากโค้ดไม่ได้ [ต้องยืนยัน]
- `PRODUCT.md` (Status 2026-10-23) ยังบอกว่าไม่ได้ deploy จาก main และ `/api/auth/session` บน production ตอบ 404 ส่วน `docs/measurement/GO-LIVE.md` บันทึก redeploy 2026-10-26: สถานะ production และการล็อกอินจริงยืนยันจากโค้ดไม่ได้ [ต้องยืนยัน]
- `specs/README.md` ยังเขียนว่า SPEC-001 "approved, in progress" แต่ตัว spec ระบุ implemented: เอกสารไม่ตรงกัน
- repo นี้มี autopilot (`.github/workflows/autopilot.yml`, `.autopilot/`) ที่รัน loop งาน/รีวิว/merge ตามเวลา: ไม่อยู่ใน diagram เพราะเป็นกระบวนการพัฒนา ไม่ใช่กระบวนการของผลิตภัณฑ์; ยังเปิดอยู่หรือไม่ [ต้องยืนยัน]
