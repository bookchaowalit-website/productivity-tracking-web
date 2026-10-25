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
pending

## Visual review
N/A — ไม่มีการเปลี่ยน UI

## Definition of Done
- [x] `package.json` มี `"typecheck": "tsc --noEmit"`
- [x] `npm run typecheck` exit 0 โดยไม่ใช้ `any` / `@ts-ignore`
- [x] `npm test`, `npm run lint`, `npm run build` ผ่าน
- [x] ไม่มีการเพิ่ม/อัปเกรด dependency

## Release / deploy
Merge เข้า main = production deploy ผ่าน Vercel Git; loop เปิด PR และเจ้าของอนุมัติด้วย label `autopilot:approved`
