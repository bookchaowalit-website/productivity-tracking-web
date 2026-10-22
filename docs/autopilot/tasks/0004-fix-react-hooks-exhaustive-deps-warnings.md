# #4 Fix react-hooks/exhaustive-deps warnings on the home page

## Document control
- Issue: #4 (bookchaowalit-website/productivity-tracking-web)
- Branch: `autopilot/4-fix-react-hooks-exhaustive-deps-warnings`
- Attempt: 1 จาก 3
- วันที่: 2026-10-22
- Maker: Claude autopilot

## Definition of Ready
- [x] Requirement ชัดเจน: แก้ warning `react-hooks/exhaustive-deps` ใน `src/app/page.tsx`
- [x] Acceptance criteria ทดสอบได้ (lint / test / build)
- [x] ผลกระทบต่อ data/API: ไม่มี (ไม่แตะ API, prisma)
- [x] ผลกระทบด้าน security/privacy: ไม่มี (logic การ abort/generation ของ session เดิมไม่เปลี่ยน)
- [x] Dependencies: ไม่มี ไม่เพิ่ม package

## Requirement & acceptance criteria
- Given repo, When `npm run lint` รัน, Then ไม่มี warning `react-hooks/exhaustive-deps` ใน `src/app/page.tsx`
- Given demo mode (ไม่มีฐานข้อมูล), When โหลดหน้าแรก, Then รายการยังแสดง, filter/search ใช้ได้, ไม่มี render loop (ไม่ fetch ซ้ำ)
- Given การเปลี่ยนแปลง, When `npm test` และ `npm run build` รัน, Then ผ่านทั้งคู่
- ห้ามเพิ่ม `eslint-disable`

## Design / approach
- `readDemoItems`, `saveDemoItems`, `activateDemoMode`, `fetchTrackingItems` ห่อด้วย `useCallback` (อ้างอิงเฉพาะ setter, ref และค่าคงที่ จึงใช้ deps เสถียร) และย้าย `fetchTrackingItems` ขึ้นก่อน effect
- effect โหลดข้อมูลมี deps ครบ `[sessionKey, authStatus, activateDemoMode, fetchTrackingItems]` — ทุกตัวเสถียร และ `authStatus` เปลี่ยนพร้อม `sessionKey` อยู่แล้ว จึงไม่ทำให้ fetch ซ้ำ
- `filteredItems` เปลี่ยนจาก state + effect + `filterItems()` เป็น `useMemo` ที่คำนวณจาก `trackingItems` และตัวกรอง ลด render รอบเกินและไม่มี stale data
- ทางเลือกที่ไม่ใช้: `eslint-disable` (ห้าม), ใส่ฟังก์ชันที่ไม่เสถียรใน deps ตรง ๆ (จะ fetch วนซ้ำ)

## Impact & risk
- Data/Auth: ไม่เปลี่ยนพฤติกรรม; logic generation/abort ของ session คงเดิม
- Performance: ดีขึ้นเล็กน้อย (ไม่มี render เพิ่มจาก setFilteredItems)
- Accessibility: ไม่เปลี่ยน
- Rollback: revert commit เดียว (ไฟล์เดียว)

## Implementation notes
- `src/app/page.tsx`: ใช้ `useCallback` กับ helper ของ demo และ `fetchTrackingItems`, แก้ deps ของ effect, เปลี่ยน `filteredItems` เป็น `useMemo`
- `docs/autopilot/tasks/0004-fix-react-hooks-exhaustive-deps-warnings.md`: เอกสารนี้

## Test evidence
- `npm run lint` → No ESLint warnings or errors
- `npm test` → 98 tests, pass 98, fail 0
- `npm run build` → สำเร็จ
- ไม่มี test ใหม่ (เป็น refactor ฝั่ง client component; ไม่มีโครง component test ใน repo)

## Review evidence

- **test**: ผ่าน
  ...
  # Subtest: a chunked body over the limit is cut off without buffering it all
  ok 96 - a chunked body over the limit is cut off without buffering it all
    ---
    duration_ms: 1.194344
    ...
  # Subtest: the UI sends the user id its view shows on every write
  ok 97 - the UI sends the user id its view shows on every write
    ---
    duration_ms: 0.787974
    ...
  # Subtest: an explicit null clears a field and an omitted field is kept
  ok 98 - an explicit null clears a field and an omitted field is kept
    ---
    duration_ms: 1.121678
    ...
  1..98
  # tests 98
  # suites 0
  # pass 98
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
  # duration_ms 1614.464819
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
  ┌ ○ /                                    35.5 kB         133 kB
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
  [P3] docs/autopilot/tasks/0004-fix-react-hooks-exhaustive-deps-warnings.md:0 Demo-mode behaviour (no repeated fetches, filtering works) was not verified in a browser. → Confirm the home page in demo mode during the visual review step.
- Run: https://github.com/bookchaowalit-website/productivity-tracking-web/actions/runs/39708333504 · 2026-10-22 08:58 ICT

## Visual review

- **visual-ai**: ผ่าน — audit {'blocker': 0, 'major': 3, 'minor': 4}; AI verdict pass; checked ['/ @375', '/ @768', '/ @1440']

## Definition of Done
- [x] lint ไม่มี warning exhaustive-deps ใน `src/app/page.tsx`
- [x] demo mode: effect โหลดครั้งเดียวต่อการเปลี่ยน session, filter/search คำนวณด้วย `useMemo` จาก state เดิม (ยังไม่ได้เปิดดูใน browser)
- [x] `npm test` และ `npm run build` ผ่าน
- [x] ไม่มี `eslint-disable`

## Release / deploy
Merge เข้า main ไม่เท่ากับ deploy; production deploy ต้องได้รับอนุมัติจากเจ้าของ
