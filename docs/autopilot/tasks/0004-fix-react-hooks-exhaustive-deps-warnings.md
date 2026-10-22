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
pending

## Visual review
pending

## Definition of Done
- [x] lint ไม่มี warning exhaustive-deps ใน `src/app/page.tsx`
- [x] demo mode: effect โหลดครั้งเดียวต่อการเปลี่ยน session, filter/search คำนวณด้วย `useMemo` จาก state เดิม (ยังไม่ได้เปิดดูใน browser)
- [x] `npm test` และ `npm run build` ผ่าน
- [x] ไม่มี `eslint-disable`

## Release / deploy
Merge เข้า main ไม่เท่ากับ deploy; production deploy ต้องได้รับอนุมัติจากเจ้าของ
