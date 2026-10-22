# #6 Add a typecheck script and make it pass

## Document control
- Issue: bookchaowalit-website/productivity-tracking-web#6
- Branch: `autopilot/6-add-a-typecheck-script-and-make-it-pass`
- Attempt: 1 จาก 3
- Date: 2026-10-22
- Maker: Claude autopilot

## Definition of Ready
- [x] Requirement: เพิ่ม script `typecheck` ใน `package.json`
- [x] Acceptance criteria ทดสอบได้ (ดูหัวข้อถัดไป)
- [x] Data/API impact: ไม่มี
- [x] Security/privacy impact: ไม่มี
- [x] Dependencies: ไม่เพิ่ม ไม่อัปเกรด

## Requirement & acceptance criteria
- Given `package.json`, When อ่าน, Then มี `"typecheck": "tsc --noEmit"`
- Given repo, When รัน `npm run typecheck`, Then exit 0 (แก้ type error จริง ไม่ใช้ `any` หรือ `@ts-ignore`)
- `npm test`, `npm run lint`, `npm run build` ยังผ่าน
- ไม่เพิ่มหรืออัปเกรด dependency

## Design / approach
เพิ่ม script `"typecheck": "tsc --noEmit"` ต่อจาก `lint` เท่านั้น `tsc --noEmit` ผ่านอยู่แล้วโดยไม่มี type error จึงไม่ต้องแก้โค้ดใน `src/`
ทางเลือกที่ไม่ใช้: เพิ่ม flag อื่นหรือแก้ `tsconfig.json` — ไม่จำเป็น

## Impact & risk
- Data: ไม่มี
- Auth: ไม่มี
- Performance: ไม่กระทบ runtime (เป็น dev script)
- Accessibility: ไม่เกี่ยวข้อง
- Rollback: ลบบรรทัด `typecheck` ออกจาก `package.json`

## Implementation notes
- `package.json`: เพิ่ม script `typecheck`
- `docs/autopilot/tasks/0006-add-a-typecheck-script-and-make-it-pass.md`: เอกสารนี้

## Test evidence
- `npx tsc --noEmit` → exit 0, ไม่มี output (เทียบเท่า `npm run typecheck`; sandbox ไม่อนุญาตให้รันผ่าน `npm run` โดยตรง)
- `npm test` → 98 pass, 0 fail
- `npm run lint` → No ESLint warnings or errors
- `npm run build` → สำเร็จ
- ไม่มี test ใหม่/แก้ไข

## Review evidence

- **test**: ผ่าน
  ...
  # Subtest: a chunked body over the limit is cut off without buffering it all
  ok 96 - a chunked body over the limit is cut off without buffering it all
    ---
    duration_ms: 1.771906
    ...
  # Subtest: the UI sends the user id its view shows on every write
  ok 97 - the UI sends the user id its view shows on every write
    ---
    duration_ms: 0.919005
    ...
  # Subtest: an explicit null clears a field and an omitted field is kept
  ok 98 - an explicit null clears a field and an omitted field is kept
    ---
    duration_ms: 1.160535
    ...
  1..98
  # tests 98
  # suites 0
  # pass 98
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
  # duration_ms 1675.982247
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
  approve; 0 finding(s)
- Run: https://github.com/bookchaowalit-website/productivity-tracking-web/actions/runs/39855668555 · 2026-10-23 04:17 ICT

## Visual review

N/A — งานนี้ไม่ได้แตะไฟล์ UI และ issue ไม่ได้ระบุ UI pages (loop ตรวจจาก diff)

## Definition of Done
- [x] `package.json` มี `"typecheck": "tsc --noEmit"`
- [x] typecheck ผ่าน (exit 0) โดยไม่ใช้ `any`/`@ts-ignore`
- [x] `npm test`, `npm run lint`, `npm run build` ผ่าน
- [x] ไม่มี dependency เปลี่ยน

## Release / deploy
merge เข้า main ไม่เท่ากับ deploy; การ deploy production ต้องได้รับอนุมัติจากเจ้าของ และ PR นี้แตะ `package.json` จึงต้องรอเจ้าของอนุมัติ
