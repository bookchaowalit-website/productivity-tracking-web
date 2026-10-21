---
title: "Autopilot loop — pilot (productivity-tracking-web)"
status: pilot
created: 2026-10-18
updated: 2026-10-18
owner: bookchaowalit (approver) · Claude autopilot (maker) · Claude reviewer session แยก (checker)
---

# Autopilot loop (pilot)

loop ที่ให้ AI หยิบงานจาก backlog มาทำเอง ทดสอบเอง ให้อีก agent รีวิว ตรวจหน้าเว็บด้วยภาพ
แล้ว merge เข้า `main` เองโดยไม่ต้องมีคนเฝ้า คนจะถูกเรียกเฉพาะตอนที่กติกาบังคับ หรือตอนที่ AI ติดจริงๆ
และทุกการตัดสินใจถูกบันทึกเป็นหลักฐานไว้ใน issue, ledger และ Telegram

pilot นี้ใช้กับ `bookchaowalit-website/productivity-tracking-web` repo เดียวก่อน

## ทำไมเลือก repo นี้

| เกณฑ์ | productivity-tracking-web | ev3-web (ตัวเปรียบเทียบ) |
|---|---|---|
| ความเสี่ยงต่อคนอื่น | showcase tier B ไม่มีผู้ใช้จริงหรือรายได้ (`TRUTH-PASS.md`) | งานลูกค้า ห้ามมี CI/CD และ deploy ต้องอนุมัติ |
| merge = deploy? | **ไม่ใช่** (ไม่มี Git→Vercel) merge แล้ว production ยังไม่เปลี่ยน | – |
| visibility | public → ใช้ GitHub-hosted runner ได้ตาม CI policy | private |
| เครื่องมือตรวจ | มี `npm test` (4 suites), lint, build | มีครบ แต่ใหญ่กว่า (130 commits) |
| ขนาด | เล็ก (26 commits) วัดผลง่าย | ใหญ่ |

## ภาพรวม

```
cron 01:00 / 04:00 ICT (GitHub Actions, ubuntu-latest)
  │
  ├─ preflight: มี issue "Autopilot paused" อยู่ไหม · ใช้โควตาวันนี้ไปเท่าไร (ledger) · main ยังเขียว (npm test) ไหม
  ├─ merge PR ที่คุณใส่ label autopilot:approved ไว้ (merge ใน clone ตามกติกา merge-locally)
  │
  └─ loop สูงสุด 3 งานต่อ run
       หยิบ issue autopilot:todo ที่ priority สูงสุด (P0→P3) และ dependency ปิดแล้ว
       ├─ MAKER (Claude): ทำงาน + เขียน task record docs/autopilot/tasks/NNNN-*.md
       ├─ gate 1: npm test · npm run lint · npm run build
       ├─ gate 2: REVIEWER = Claude session แยก (read-only)
       ├─ gate 3: VISUAL (เฉพาะเมื่อแตะ src/app, src/components หรือ issue มี "UI pages")
       │     ui_review.mjs ถ่ายเต็มหน้าที่ 375/768/1440 ของ main และ branch แล้วเทียบกัน
       │     + Claude visual reviewer เปิดดูทุกภาพเทียบกับ ui-quality-gate.md
       ├─ ไม่ผ่าน → ส่งปัญหากลับให้ maker แก้ (สูงสุด 3 รอบ)
       └─ ผ่าน → merge เข้า main เอง หรือเปิด PR รออนุมัติ (ดู "กติกาการ merge")
  │
  └─ backlog ว่าง → PLANNER (Claude) เสนองานใหม่ ≤5 งานเป็น autopilot:proposed รอคุณอนุมัติ
```

แต่ละบทบาทเป็น agent คนละตัว (maker ≠ checker) ตามหลัก solopreneur-full-process

## Backlog = GitHub Issues

เลือก Issues เพราะอยู่ติดโค้ด เปิดดูบนมือถือได้ อนุมัติด้วยการเปลี่ยน label และ comment ทุกอันเป็นหลักฐานที่มีวันที่

| Label | ความหมาย | ใครเปลี่ยน |
|---|---|---|
| `autopilot` | issue นี้อยู่ใน backlog ของ autopilot | คุณ / planner |
| `autopilot:proposed` | planner เสนอมา ยังไม่ได้อนุมัติ | planner |
| `autopilot:todo` | พร้อมให้ทำ | คุณ (อนุมัติ) |
| `autopilot:in-progress` | กำลังทำใน run นี้ | loop |
| `autopilot:needs-human` | ต้องให้คนตอบ หรือมี PR รออนุมัติ | loop |
| `autopilot:blocked` | ทำไม่ผ่าน มีสาเหตุเขียนไว้ใน comment | loop |
| `autopilot:approved` | (ใส่ที่ PR) อนุมัติให้ merge | คุณ |
| `autopilot:paused` | issue ปิดสวิตช์ทั้งระบบ | loop / คุณ |
| `P0`–`P3` | priority (P0 ทำก่อน) | คุณ / planner |
| `risk:low` / `risk:medium` / `risk:high` | ความเสี่ยง (ไม่ใส่ = medium) | คุณ / planner |

รูปแบบ body ของ issue:

```markdown
<ปัญหา / เหตุผล>

Depends on #12            ← (ถ้ามี) รอให้ #12 ปิดก่อน

## Acceptance criteria
- [ ] Given … When … Then …   ← ต้องทดสอบได้ reviewer ถือว่าข้อที่ทำไม่ครบเป็น P1

## UI pages
- `/`                       ← (ถ้ามี) หน้าที่ visual gate ต้องถ่ายและตรวจ
```

## เงื่อนไขหยุด

### ระดับงาน (ต่อ issue)

| เงื่อนไข | ผลลัพธ์ |
|---|---|
| ผ่าน test, lint, build, review และ visual (ถ้ามี) | **เสร็จ** → merge หรือเปิด PR |
| maker ตอบ `needs_human` (ต้องใช้ secret, login, การตัดสินใจเชิง product, คำตอบลูกค้า, บริการเสียเงิน, production) | `needs-human` + คำถามใน issue + Telegram |
| maker ตอบ `cannot_do` | `blocked` |
| ไม่ผ่าน gate ครบ 3 รอบ (`max_attempts_per_task`) | `blocked` + log ปัญหาล่าสุด + push branch ที่ทำค้างไว้ให้คนทำต่อได้ |
| ปัญหารอบนี้ซ้ำกับรอบก่อน (fingerprint เดิม = วนอยู่ที่เดิม) | `blocked` ทันที ไม่ต้องรอครบ 3 รอบ |
| ใช้ประมาณการเกิน $6 ต่องาน | `blocked` |
| maker ไม่ได้แก้ไฟล์อะไรเลย | นับเป็นรอบที่ล้มเหลว |

### ระดับ run

| เงื่อนไข | ผลลัพธ์ |
|---|---|
| ทำครบ 3 งาน หรือไม่มีงานพร้อมทำแล้ว | จบปกติ + สรุปเข้า ledger |
| ใช้เวลาครบ 50 นาที (job timeout 60) | หยุด คืนงานที่ทำค้างเป็น `todo` |
| Claude ติด usage/rate limit | หยุดทันที + Telegram (โควตา subscription เต็ม) |
| ครบเพดานรายวัน (ดูหัวข้อถัดไป) | หยุด + Telegram |
| `npm test` บน main ไม่ผ่านตั้งแต่ก่อนเริ่ม | **pause** ไม่เริ่มงานใหม่บนฐานที่พังอยู่แล้ว |
| งานล้มเหลวติดกัน 3 งาน (circuit breaker) | **pause** |
| gate รันไม่ได้เอง (เช่น browser เปิดไม่ขึ้น) | งานนั้น `blocked` ว่าเป็นปัญหาที่ระบบ ไม่ส่งไปให้ maker แก้ |
| error ที่ไม่คาดคิด | job fail + Telegram + บันทึก ledger |

**Pause** คือ loop เปิด issue ชื่อ "Autopilot paused" (label `autopilot:paused`) ไว้ ทุก run จะเช็กก่อนเริ่มแล้วจบทันทีถ้ามี
แก้สาเหตุเสร็จแล้ว**ปิด issue นั้น** loop ก็จะกลับมาทำงานต่อ ตัวนับงานที่ล้มเหลวติดกันจะเริ่มนับใหม่หลัง pause
คุณกด pause เองได้ด้วยการสร้าง issue ที่มี label นี้ หรือปิดทั้งระบบด้วยการตั้ง repo variable `AUTOPILOT_ENABLED` เป็นค่าอื่นที่ไม่ใช่ `true`

## เพดานโควตา

| เพดาน | ค่า (pilot) | ทำไม |
|---|---|---|
| run ต่อวัน | 2 (cron 01:00, 04:00 ICT) | ไม่ไปแย่งโควตา Claude ช่วงกลางวันที่คุณใช้เอง |
| งานต่อ run | 3 | ให้ 1 run จบใน 50 นาที |
| งานที่ merge ต่อวัน | 6 | คุณยังตามอ่านทันในแต่ละวัน |
| Claude call ต่อวัน | 24 | รวม maker, reviewer, visual และ planner |
| ประมาณการ $ ต่องาน / ต่อวัน | 6 / 30 | `total_cost_usd` จาก Claude CLI ใช้ subscription จึงไม่ได้จ่ายจริง แต่ใช้วัดขนาดการใช้โควตาได้ |
| turn ต่อ call | maker 60 · reviewer 25 · visual 20 | กัน agent วนไม่จบ |
| เวลาต่อ call | 25 นาที | |
| รอบแก้ต่องาน | 3 | |
| diff ที่ merge เองได้ | ≤ 400 บรรทัด | ใหญ่กว่านี้ให้คนดู PR |

ยอดใช้รายวันคิดจาก **ledger issue** ("Autopilot ledger") ที่เก็บ JSON หนึ่ง comment ต่อหนึ่ง run (วัน = วันที่ตามเวลาไทย)
ค่าทั้งหมดอยู่ใน `.autopilot/config.json` → `limits`

## กติกาการ merge

ถ้า**ผ่านทุก gate** และเข้าเงื่อนไขทั้งหมดด้านล่าง loop จะ merge เอง (`git merge --no-ff` ใน clone ของ runner แล้ว push ตามกติกา merge-locally ไม่ใช้ `gh pr merge`):

- risk เป็น `low` หรือ `medium`
- ไม่แตะ protected paths: `prisma/`, `src/app/api/auth/`, `src/lib/auth*`, `package.json`, `package-lock.json`, `.github/`, `.autopilot/`, `next.config.js`, `LICENSE`, `.env*`
- diff ไม่เกิน 400 บรรทัด
- ถ้า main ขยับไปก่อน loop จะรัน test, lint และ build ใหม่บน tree ที่ merge แล้ว

ถ้าไม่เข้าเงื่อนไข loop จะ push branch แล้วเปิด PR พร้อมหลักฐาน ใส่ `needs-human` และแจ้ง Telegram
คุณอนุมัติด้วยการใส่ label `autopilot:approved` ที่ PR แล้ว run ถัดไปจะ merge ให้

**Deploy production ไม่อยู่ใน loop** repo นี้ไม่มี Git→Vercel การ merge จึงไม่เปลี่ยน production
สรุปท้าย run จะบอกว่า main นำหน้า production อยู่ การ deploy ยังต้องให้คุณอนุมัติทุกครั้งตามกติกาเดิม

## Telegram

ส่งผ่าน `book_noti_bot` (Infisical `/telegram` → `TELEGRAM_NOTI_BOT_TOKEN`, `TELEGRAM_NOTI_CHAT_ID`) ใน GitHub ต้องตั้งเป็น secret `TELEGRAM_BOT_TOKEN` และ `TELEGRAM_CHAT_ID`

| Event | ตัวอย่างข้อความ |
|---|---|
| `task_done` | ✅ #4 Fix … merge แล้ว a1b2c3d · 2 รอบ · ~$1.8 |
| `pr_opened` | 🟡 #6 … ผ่านทุก gate แต่ต้องอนุมัติ: แตะ package.json · PR link |
| `needs_human` | 🙋 #9 … ต้องการคน: ต้องใช้ API key ของ X |
| `task_blocked` | ⛔ #7 … วนแก้ปัญหาเดิมซ้ำ (stuck) |
| `proposals` | 📝 backlog ว่าง เสนองานใหม่ 4 งาน (รออนุมัติ) + link |
| `budget_hit` / `rate_limited` | ⚠️ ครบเพดาน Claude 24 ครั้ง/วัน |
| `paused` | ⏸️ หยุด autopilot ชั่วคราว สาเหตุ … |
| `run_error` | 💥 run error … + link ของ run |
| สรุป run | 📊 จบ run: … merge 2/3 งาน · Claude 7 ครั้ง · วันนี้ 7/24 |

สรุป run จะส่งเฉพาะตอนที่มีงานเกิดขึ้น (`notify.run_summary: when_something_happened`) run ที่ว่างจะไม่ส่งอะไร

หมายเหตุ: `TELEGRAM_INFRA_BOT_TOKEN` ใน Infisical ตอบ 401 (token ใช้ไม่ได้แล้ว) เมื่อ 2026-10-18 ถ้ามีระบบอื่นใช้ token นี้อยู่ ระบบนั้นจะไม่ได้รับการแจ้งเตือนด้วย

## หลักฐาน (evidence trail)

| ที่ไหน | มีอะไร |
|---|---|
| `docs/autopilot/tasks/NNNN-*.md` | task record ต่องานที่ maker เขียน มีหัวข้อครบตาม DoR/DoD: requirement, design, impact & risk, test evidence, review, visual, release (ไม่เกี่ยวให้เขียน N/A พร้อมเหตุผล) |
| comment ใน issue | ผลแต่ละ gate, จำนวนรอบ, ค่าใช้จ่ายประมาณการ, link ของ run, สาเหตุที่หยุด |
| commit / PR | `autopilot(#N): …` และ merge commit `Closes #N` |
| ledger issue | JSON ต่อ run: calls, $, นาที, ผลของทุกงาน, สาเหตุที่จบ |
| GitHub Actions log | log เต็มของ run |

## การตั้งค่าครั้งแรก (ต้องให้คุณทำ)

1. สร้าง token ของ Claude สำหรับ CI (ต้อง login ผ่าน browser) แล้วเก็บไว้ใน Infisical และ GitHub:
   ```bash
   claude setup-token
   ```
   นำค่าที่ได้ไปตั้งเป็น secret `CLAUDE_CODE_OAUTH_TOKEN` ของ repo
2. Telegram secrets จาก Infisical (ค่าจะไม่ถูกแสดงออกมา):
   ```bash
   infisical run --projectId "$INFISICAL_PROJECT_ID" --env dev --path /telegram --silent -- sh -c 'gh secret set TELEGRAM_BOT_TOKEN -R bookchaowalit-website/productivity-tracking-web --body "$TELEGRAM_NOTI_BOT_TOKEN" && gh secret set TELEGRAM_CHAT_ID -R bookchaowalit-website/productivity-tracking-web --body "$TELEGRAM_NOTI_CHAT_ID"'
   ```
3. ทดสอบด้วย Actions → autopilot → Run workflow → `mode: dry-run`
4. ลองรันจริงงานเดียว: `mode: real`, `max_tasks: 1`
5. เปิดรอบอัตโนมัติ:
   ```bash
   gh variable set AUTOPILOT_ENABLED -R bookchaowalit-website/productivity-tracking-web --body true
   ```

## รันในเครื่อง (ใช้ทดสอบเท่านั้น ไม่ใช่ที่รันจริง)

```bash
python3 .autopilot/autopilot.py --dry-run
```

`--sandbox` รัน agent และ gate จริงบน branch ปัจจุบัน แต่ไม่ push ไม่เขียน GitHub ไม่ merge และ Telegram จะมี tag `[sandbox]`
บนเครื่อง WSL นี้ต้อง `source ~/ai-stack/ui-test-env.sh` ก่อน (Chromium ต้องใช้ lib ใน libroot ถ้าไม่ source browser จะเปิดไม่ขึ้น) แล้วตั้ง `AUTOPILOT_SKILLS_DIR="$UI_SKILLS"`

## ไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `.autopilot/autopilot.py` | engine (Python stdlib + `gh`, `git`, `claude`) · reviewer เป็น Claude session แยกที่ใช้ tool แบบ read-only |
| `.autopilot/config.json` | เพดาน, gate, protected paths, label, การแจ้งเตือน |
| `.autopilot/prompts/{maker,reviewer,visual,planner}.md` | prompt ของแต่ละ agent |
| `.github/workflows/autopilot.yml` | cron + manual run (action pin ด้วย SHA) |

## สิ่งที่ยังไม่ทำใน pilot (ขยายหลังจากวัดผล 1–2 สัปดาห์)

- ย้าย engine ไปเป็น reusable workflow กลาง (แบบ platform-ci-workflows) เพื่อใช้กับ repo อื่น
- repo private: รันบน Railway self-hosted runner ตาม CI policy
- auto-deploy preview (ไม่ใช่ production) ของแต่ละงานแล้วให้ visual gate ตรวจบน URL จริง
- digest รายวันใน Telegram แทนการแจ้งทีละ event
- ตัวชี้วัดของ pilot: % งานที่ merge โดยไม่ต้องมีคน, จำนวนรอบเฉลี่ยต่องาน, จำนวนครั้งที่ pause, bug ที่หลุดหลัง merge
