# #5 Refresh TRUTH-PASS.md: test suite now exists
## Document control
- Issue: #5 · Branch: `autopilot/5-refresh-truth-pass-md-test-suite-now-exi` · Attempt: 1 · วันที่: 2026-10-22 · Maker: Claude autopilot
## Definition of Ready
- [x] Requirement ชัดเจน
- [x] Acceptance criteria ทดสอบได้
- [x] ผลกระทบ data/API: ไม่มี (เอกสารเท่านั้น)
- [x] ผลกระทบ security/privacy: ไม่มี
- [x] Dependencies: ไม่มี
## Requirement & acceptance criteria
- Given `TRUTH-PASS.md` When อ่าน Then บรรทัด tests และ Limitations ต้องอธิบายชุด `tests/*.test.cjs` และคำสั่ง `npm test`
- รายการ scripts ต้องตรงกับ `package.json`
- ห้ามเพิ่มข้อความเรื่อง production users, revenue หรือ SLA
- แก้เฉพาะ `TRUTH-PASS.md` และ task record
## Design / approach
อัปเดตบรรทัด Tests signal, Limitations, How to run และ Scripts seen (เพิ่ม `test`) ตามจริง ปัจจุบันมี 6 suites (issue ระบุ 4) จึงเขียนตามที่มีจริง ไม่แตะ claim classes
## Impact & risk
เอกสารเท่านั้น ไม่กระทบ data/auth/performance/accessibility; rollback ด้วย git revert
## Implementation notes
- `TRUTH-PASS.md`: อัปเดตส่วน tests, scripts, limitations
- `docs/autopilot/tasks/0005-refresh-truth-pass-md-test-suite-now-exi.md`: task record นี้
## Test evidence
- `npm test`: 98 tests pass, 0 fail
- `npm run lint`: รันก่อนส่งงาน (เอกสารเท่านั้น ไม่กระทบผล)
- ไม่ได้แตะ `src/` จึงไม่รัน `npm run build`
## Review evidence

- **test**: ผ่าน
  ...
  # Subtest: a chunked body over the limit is cut off without buffering it all
  ok 96 - a chunked body over the limit is cut off without buffering it all
    ---
    duration_ms: 1.234607
    ...
  # Subtest: the UI sends the user id its view shows on every write
  ok 97 - the UI sends the user id its view shows on every write
    ---
    duration_ms: 0.855494
    ...
  # Subtest: an explicit null clears a field and an omitted field is kept
  ok 98 - an explicit null clears a field and an omitted field is kept
    ---
    duration_ms: 1.00508
    ...
  1..98
  # tests 98
  # suites 0
  # pass 98
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
  # duration_ms 1140.92231
- **lint**: ผ่าน
  > book-tracking@0.1.0 lint
  > next lint

  ✔ No ESLint warnings or errors
- **build**: ผ่าน
  Generating static pages (2/6) 
     Generating static pages (4/6) 
   ✓ Generating static pages (6/6)
     Finalizing page optimization ...
     Collecting build traces ...

  Route (app)                              Size     First Load JS
  ┌ ○ /                                    35.5 kB         132 kB
  ├ ○ /_not-found                          873 B          88.2 kB
  ├ ƒ /api/auth/[...nextauth]              0 B                0 B
  ├ ƒ /api/internal/tracking               0 B                0 B
  ├ ƒ /api/mcp                             0 B                0 B
  ├ ƒ /api/tracking                        0 B                0 B
  └ ○ /more-projects                       8.87 kB        96.2 kB
  + First Load JS shared by all            87.3 kB
    ├ chunks/117-2d47c67cb7e25d24.js       31.7 kB
    ├ chunks/fd9d1056-9e191f0896c1d560.js  53.6 kB
    └ other shared chunks (total)          1.95 kB


  ○  (Static)   prerendered as static content
  ƒ  (Dynamic)  server-rendered on demand


   ⚠ Using edge runtime on a page currently disables static generation for that page
- **claude-review**: ผ่าน
  approve; 1 finding(s)
  [P3] TRUTH-PASS.md:26 Hard-coded test count (98) will go stale as tests are added → Optional: drop the count or keep only the dated claim
- Run: https://github.com/bookchaowalit-website/productivity-tracking-web/actions/runs/39874530346 · 2026-10-23 06:56 ICT

## Visual review

N/A — งานนี้ไม่ได้แตะไฟล์ UI และ issue ไม่ได้ระบุ UI pages (loop ตรวจจาก diff)

## Definition of Done
- [x] tests line และ Limitations ตรงกับ suites และ `npm test`
- [x] scripts ตรงกับ `package.json`
- [x] ไม่เพิ่ม claim เรื่อง users/revenue/SLA
- [x] แก้เฉพาะ `TRUTH-PASS.md` และ task record
## Release / deploy
merged to main ≠ deployed; production deploy ต้องได้รับอนุมัติจากเจ้าของ
