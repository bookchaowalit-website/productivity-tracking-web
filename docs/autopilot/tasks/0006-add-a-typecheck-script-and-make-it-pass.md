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
pending

## Visual review
N/A — ไม่มีการเปลี่ยน UI

## Definition of Done
- [x] `package.json` มี `"typecheck": "tsc --noEmit"`
- [x] typecheck ผ่าน (exit 0) โดยไม่ใช้ `any`/`@ts-ignore`
- [x] `npm test`, `npm run lint`, `npm run build` ผ่าน
- [x] ไม่มี dependency เปลี่ยน

## Release / deploy
merge เข้า main ไม่เท่ากับ deploy; การ deploy production ต้องได้รับอนุมัติจากเจ้าของ และ PR นี้แตะ `package.json` จึงต้องรอเจ้าของอนุมัติ
