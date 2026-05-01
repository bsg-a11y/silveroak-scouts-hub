## Plan: BSG Office Daily Attendance + Percentage Filter

### A. Daily BSG Office Attendance (Check-in / Check-out)

A new attendance type independent of activities/meetings — members check in and out of the BSG office, can do so multiple times in a day, and total hours are calculated per day and per month.

**New table: `office_attendance_logs`**
- `id` uuid PK
- `user_id` uuid (member)
- `check_in_at` timestamptz
- `check_out_at` timestamptz (nullable — null = currently checked in)
- `log_date` date (generated from check_in_at, for fast day filtering)
- `marked_by` uuid (admin who recorded it, or self)
- `notes` text (optional)
- `created_at`, `updated_at`

**RLS**
- Admin/coordinator: full manage
- Members: SELECT own rows only
- Faculty coordinator: SELECT (read-only)

**Logic**
- Check-in creates a new row with `check_in_at = now()`, `check_out_at = null`.
- Check-out updates the most recent open row for that user where `check_out_at IS NULL`, setting `check_out_at = now()`.
- Multiple check-in/out pairs per day are allowed (each pair = one row).
- Hours per row = `check_out_at - check_in_at` (only counted when checked out).
- Day total = sum of hours across all closed rows for that user on that date.
- Month total = sum across all closed rows in that month.

### B. New Page Section: "Office Attendance" (admin tab in Attendance page)

Add a new tab `Office Attendance` (admin/coordinator only) inside `src/pages/Attendance.tsx` with two views:

**View 1 — Today's Log (default)**
- Date picker (defaults to today)
- Member list (active members) with columns:
  - BSG ID | Name | Today's sessions (e.g. `09:10 → 11:30`, `14:00 → 17:45`) | Status badge (Checked In / Out) | Actions
- Per-row actions: **Check In**, **Check Out** (only one is enabled depending on current state), **Calculate Hours** button → shows total hours for that member for the selected date in a dialog.
- Bulk header buttons: **Calculate All Hours** (shows table of all members' total hours for the date).
- Sessions list is the source of truth — duplicates are intentional (each pair shown).

**View 2 — Monthly Report**
- Month picker (defaults to current month) + member selector (single member or "All members")
- For a single member: date-wise table of `Date | Sessions | Daily Hours`, plus footer with **Total Hours This Month**.
- For "All members": summary table `Member | Days Present | Total Hours This Month`.
- Export buttons (Excel + Print/PDF) reusing the styling from existing `downloadAttendancePDF`.

**Member-side view**
- In the `My Attendance` tab on the same page, add a new card "Office Hours This Month: X hrs" plus a small expandable section listing date-wise daily hours for the current month. Members can see their own data only.

### C. Member Card Sync (Profile + MemberDetailsDialog)

- `src/pages/Profile.tsx` — add an "Office Hours" stat card showing this month's total hours and last 7-day breakdown.
- `src/components/MemberDetailsDialog.tsx` — add an "Office Attendance" tab/section showing month-wise totals so admins can see them when viewing any member.

### D. Percentage-Based Attendance Filter

New tab `Attendance Reports` (admin-only) in `src/pages/Attendance.tsx`:

- Filters:
  - Type: `Activities`, `Meetings`, or `Combined` (default Combined)
  - Operator: `> | >= | < | <= | =` (default `>`)
  - Threshold: numeric input, 0–100 (default 50)
  - Optional: college, department, semester filter (re-using the same filter pattern used elsewhere)
- Computed for each active member:
  - `activity %` = unique present activity records / total completed activities
  - `meeting %` = unique present meeting records / total meetings
  - `combined %` = (present activities + present meetings) / (total activities + total meetings)
- Result table: `S.No | BSG ID | Name | College | Dept | Activities % | Meetings % | Combined % | Status`
- Live count: "Showing X of Y members"
- **Export filtered list**: Excel and PDF buttons using the existing styled PDF/Excel patterns. Exports include the active filter description in the header (e.g. "Members with Combined Attendance > 50%").

### E. Sync points

- New `useOfficeAttendance.ts` hook (queries + mutations + realtime subscription on `office_attendance_logs`).
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE office_attendance_logs` so every dashboard updates live.
- No changes needed to existing activity/meeting attendance logic — this is additive.

### Files to be created / modified

| Type | Path |
|------|------|
| New migration | `supabase/migrations/<ts>_office_attendance.sql` (table, RLS, realtime) |
| New hook | `src/hooks/useOfficeAttendance.ts` |
| New component | `src/components/OfficeAttendanceManager.tsx` (today's log + check in/out + calculate hours) |
| New component | `src/components/OfficeAttendanceMonthlyReport.tsx` |
| New component | `src/components/AttendancePercentageReport.tsx` (percentage filter + export) |
| Modified | `src/pages/Attendance.tsx` (add 2 admin tabs + member-side office hours card) |
| Modified | `src/pages/Profile.tsx` (Office Hours stat card) |
| Modified | `src/components/MemberDetailsDialog.tsx` (office attendance section) |

### Notes

- Hours displayed in `Hh Mm` format (e.g. `2h 35m`); raw decimal hours kept in exports.
- A safety check: if a user is already checked in, the Check-In button is disabled and shows "Already checked in at HH:MM".
- "Calculate Hours" only counts pairs where both check_in and check_out exist; open sessions are flagged in the UI but not counted.
- Percentage filter respects the same dedup logic already used in the member view (one record per activity/meeting, prefer `present`).
