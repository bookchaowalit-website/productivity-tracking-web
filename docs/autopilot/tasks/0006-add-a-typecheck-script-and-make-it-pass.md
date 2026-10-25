# #6 Add a typecheck script and make it pass

## Document control
- Issue: #6 (bookchaowalit-website/productivity-tracking-web)
- Branch: `autopilot/6-add-a-typecheck-script-and-make-it-pass`
- Attempt: 1 จาก 3
- วันที่: 2026-10-25
- Maker: Claude autopilot

## Definition of Ready
- [x] Requirement ชัดเจน: เพิ่ม script `typecheck` ใน `package.json` และให้ผ่าน
- [x] Acceptance criteria ทดสอบได้ (`npm run typecheck`, test, lint, build)
- [x] ผลกระทบต่อ data/API: ไม่มี
- [x] ผลกระทบด้าน security/privacy: ไม่มี
- [x] Dependencies: ไม่เพิ่ม/ไม่อัปเกรด package

## Requirement & acceptance criteria
- Given `package.json`, When อ่าน, Then มี `"typecheck": "tsc --noEmit"`
- Given repo, When `npm run typecheck` รัน, Then exit 0 (แก้ type error จริง ไม่ใช้ `any` / `@ts-ignore`)
- `npm test`, `npm run lint`, `npm run build` ยังผ่าน
- ไม่เพิ่มหรืออัปเกรด dependency

## Design / approach
- เพิ่ม script `typecheck` ต่อจาก `lint` ใน `package.json`
- รัน `tsc --noEmit` แล้วพบว่าไม่มี type error อยู่แล้ว จึงไม่ต้องแก้โค้ดใน `src/`
- ทางเลือกที่ไม่ใช้: ผ่อน `tsconfig.json` (ไม่จำเป็นและเปลี่ยนความเข้มงวด)

## Impact & risk
- Data/Auth: ไม่มีผลกระทบ
- Performance/Accessibility: ไม่มีผลกระทบ
- Rollback: revert commit เดียว (บรรทัดเดียวใน `package.json`)

## Implementation notes
- `package.json`: เพิ่ม `"typecheck": "tsc --noEmit"`
- `docs/autopilot/tasks/0006-add-a-typecheck-script-and-make-it-pass.md`: เอกสารนี้

## Test evidence
- `npm run typecheck` → exit 0 ไม่มี error
- `npm test` → pass 138, fail 0
- `npm run lint` → No ESLint warnings or errors
- `npm run build` → สำเร็จ
- ไม่มี test ใหม่ (เพิ่มเฉพาะ script)

## Review evidence

- **test**: ผ่าน
  ...
  # Subtest: a chunked body over the limit is cut off without buffering it all
  ok 130 - a chunked body over the limit is cut off without buffering it all
    ---
    duration_ms: 1.644385
    ...
  # Subtest: the UI sends the user id its view shows on every write
  ok 131 - the UI sends the user id its view shows on every write
    ---
    duration_ms: 0.806728
    ...
  # Subtest: an explicit null clears a field and an omitted field is kept
  ok 132 - an explicit null clears a field and an omitted field is kept
    ---
    duration_ms: 1.134582
    ...
  1..132
  # tests 138
  # suites 3
  # pass 138
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
  # duration_ms 2598.002846
- **lint**: ผ่าน
  > book-tracking@0.1.0 lint
  > next lint

  ✔ No ESLint warnings or errors

  `next lint` is deprecated and will be removed in Next.js 16.
  For new projects, use create-next-app to choose your preferred linter.
  For existing projects, migrate to the ESLint CLI:
  npx @next/codemod@canary next-lint-to-eslint-cli .
- **build**: ผ่าน
  Generating static pages (4/6) 
   ✓ Generating static pages (6/6)
     Finalizing page optimization ...
     Collecting build traces ...

  Route (app)                                 Size  First Load JS
  ┌ ○ /                                    31.6 kB         231 kB
  ├ ○ /_not-found                            999 B         184 kB
  ├ ƒ /api/auth/[...nextauth]                138 B         183 kB
  ├ ƒ /api/health                            138 B         183 kB
  ├ ƒ /api/internal/tracking                 138 B         183 kB
  ├ ƒ /api/mcp                               138 B         183 kB
  ├ ƒ /api/tracking                          138 B         183 kB
  └ ○ /more-projects                       1.72 kB         184 kB
  + First Load JS shared by all             183 kB
    ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
    ├ chunks/688-a2b6e393fc203735.js        125 kB
    └ other shared chunks (total)          3.46 kB


  ○  (Static)   prerendered as static content
  ƒ  (Dynamic)  server-rendered on demand


   ⚠ Using edge runtime on a page currently disables static generation for that page
- **claude-review**: ผ่าน
  approve; 0 finding(s)
- Run: https://github.com/bookchaowalit-website/productivity-tracking-web/actions/runs/40213904149 · 2026-10-25 23:57 ICT

## Visual review

N/A — งานนี้ไม่ได้แตะไฟล์ UI และ issue ไม่ได้ระบุ UI pages (loop ตรวจจาก diff)

## Definition of Done
- [x] `package.json` มี `"typecheck": "tsc --noEmit"`
- [x] `npm run typecheck` exit 0 โดยไม่ใช้ `any` / `@ts-ignore`
- [x] `npm test`, `npm run lint`, `npm run build` ผ่าน
- [x] ไม่มีการเพิ่ม/อัปเกรด dependency

## Release / deploy
Merge เข้า main = production deploy ผ่าน Vercel Git; loop เปิด PR และเจ้าของอนุมัติด้วย label `autopilot:approved`
