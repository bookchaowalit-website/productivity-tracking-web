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
pending
## Visual review
N/A — เอกสารเท่านั้น
## Definition of Done
- [x] tests line และ Limitations ตรงกับ suites และ `npm test`
- [x] scripts ตรงกับ `package.json`
- [x] ไม่เพิ่ม claim เรื่อง users/revenue/SLA
- [x] แก้เฉพาะ `TRUTH-PASS.md` และ task record
## Release / deploy
merged to main ≠ deployed; production deploy ต้องได้รับอนุมัติจากเจ้าของ
