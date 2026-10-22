# #7 Home page passes the UI quality gate at 375/768/1440

## Document control
- Issue: #7 (bookchaowalit-website/productivity-tracking-web)
- Branch: `autopilot/7-home-page-passes-the-ui-quality-gate-at-`
- Attempt: 1 / 3
- Date: 2026-10-22
- Maker: Claude autopilot

## Definition of Ready
- [x] Requirement: หน้า `/` ผ่าน UI quality gate ที่ 375/768/1440
- [x] Acceptance criteria ทดสอบได้ (ดูหัวข้อถัดไป)
- [x] Data/API impact: ไม่มี (แก้ CSS และ class ของ Tabs เท่านั้น)
- [x] Security/privacy impact: ไม่มี
- [x] Dependencies: #4 (merged แล้ว)

## Requirement & acceptance criteria
- Given `/` ที่ 375, 768, 1440 px, When รัน `ui_review.mjs`, Then 0 blocker และ 0 major
- Given screenshots, When visual reviewer ตรวจทุก slice, Then ผ่านโดยไม่มี blocker/major
- Demo mode, search, filters, status, progress editing ยังทำงาน
- `npm test`, `npm run lint`, `npm run build` ผ่าน

## Design / approach
- ฟอนต์ใน `globals.css` หลายจุดเล็กกว่า 12px (.58rem–.67rem) → ตั้งเป็น `.75rem` (12px) ผ่าน block ท้ายไฟล์
- มือถือ/แท็บเล็ต (<1024px): ปุ่ม, tab, select, input มี `min-height: 44px`; ปุ่ม icon (favorite) `min-width: 44px`
- Header บนมือถือเดิมซ่อนข้อความปุ่มทั้งหมดแล้วแสดง "+" (ทำให้ "Sign in" กลายเป็น "+" ด้วย) → เอา hack ออก แสดงข้อความจริง, ซ่อนบรรทัดย่อยของโลโก้, ให้ row wrap ได้ ป้องกัน overflow
- `TabsList` เดิมเป็น `grid grid-cols-3…` ทำให้ tab บีบ/ตัดบรรทัดและชนกับ `overflow-x: auto` → เปลี่ยนเป็น `flex w-full justify-start` เลื่อนแนวนอนได้ตาม DESIGN.md
- ทางเลือกที่ไม่ใช้: แก้ `button.tsx` ทั้งระบบ (กระทบนอกขอบเขต)

## Impact & risk
- Data/auth: ไม่กระทบ
- Performance: ไม่กระทบ
- Accessibility: ดีขึ้น (ตัวอักษร ≥12px, tap target ≥44px)
- ความเสี่ยง: ไม่พบสคริปต์ `ui_review.mjs` ใน checkout นี้ จึงยังไม่ได้รันการตรวจอัตโนมัติจริง/ถ่ายภาพ — ตรวจโดยอ่านโค้ดเท่านั้น
- Rollback: revert commit (แก้ 2 ไฟล์)

## Implementation notes
- `src/app/globals.css`: ปรับ media query มือถือของ header, เพิ่ม rule ขนาดฟอนต์ขั้นต่ำและ tap target
- `src/app/page.tsx`: `TabsList` เปลี่ยน class จาก grid เป็น flex scrollable

## Test evidence
- `npm test` → 98 pass, 0 fail
- `npm run lint` → ไม่มี warning/error
- `npm run build` → สำเร็จ
- ไม่มี test ใหม่ (การเปลี่ยนแปลงเป็น CSS ล้วน)
- `ui_review.mjs`: ไม่พบในเครื่อง ไม่ได้รัน

## Review evidence
pending

## Visual review
pending

## Definition of Done
- [ ] ui_review.mjs 0 blocker/major (ยังไม่ได้รัน — ไม่มีสคริปต์)
- [ ] Visual reviewer ผ่าน (pending)
- [x] Demo mode/search/filters/status/progress ไม่ถูกแตะ logic
- [x] test / lint / build ผ่าน

## Release / deploy
merged to main ≠ deployed; production deploy ต้องได้รับอนุมัติจากเจ้าของก่อน
