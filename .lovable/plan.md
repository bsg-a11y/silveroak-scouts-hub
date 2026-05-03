## Plan: Member Compliance Dashboard

A new admin-facing dashboard that aggregates each member's status against all configurable rules (office hours targets, activity attendance %, meeting attendance %), shown as a sortable, filterable, exportable table.

### Scope

Compliance for every active member, evaluated against:
1. **Weekly office hours** (vs `office_rules.weekly_hours_target`)
2. **Monthly office hours** (vs `office_rules.monthly_hours_target`)
3. **Activity attendance %** (vs configurable threshold, default 50%)
4. **Meeting attendance %** (vs configurable threshold, default 50%)
5. **Combined attendance %** (activities + meetings, vs threshold)

Each member gets a per-rule **Met / Below** badge plus an overall **Compliant / Non-Compliant / Partial** status.

### UI / UX

New tab in `src/pages/Attendance.tsx` called **"Member Compliance"** (admin/coordinator only), sitting next to the existing Office Attendance, Reports & Filters, etc.

Layout inside the tab:

```text
┌─ Summary cards (4) ─────────────────────────────────────┐
│ Total Members │ Fully Compliant │ Partial │ Non-Compl. │
└─────────────────────────────────────────────────────────┘

┌─ Filter bar ────────────────────────────────────────────┐
│ Search │ College │ Department │ Role │ Status │ Period │
│ Activity threshold % │ Meeting threshold % │ Reset      │
└─────────────────────────────────────────────────────────┘

┌─ Compliance table ──────────────────────────────────────┐
│ UID │ Name │ Weekly Hrs │ Monthly Hrs │ Act% │ Meet% │  │
│     │      │ [Met/Below]│ [Met/Below] │ ...  │ ...   │ Overall │
└─────────────────────────────────────────────────────────┘

[ Export Excel ]  [ Export PDF ]
```

- Period selector: This week / This month / Custom range
- Click a row -> opens existing `MemberDetailsDialog` for full drill-down
- Sort by any column (default: overall compliance ascending, so problem cases surface first)
- Color-coded overall: green (all met), amber (1-2 missed), red (3+ missed)

### Data Sources (already exist, just aggregate)

| Metric | Source |
|---|---|
| Weekly/monthly office minutes per user | `office_attendance_logs` (filtered by `log_date` range) |
| Targets | `office_rules` (latest row) |
| Activity attendance % | `attendance` table joined with completed `activities` |
| Meeting attendance % | `attendance` joined with `meetings` |
| Member list / filters | `profiles` + `useMembers` hook |

Reuse existing helpers: `sumMinutes`, `formatHours` from `useOfficeAttendance`, and the same activity/meeting attendance math already in `AttendancePercentageSection.tsx`.

### Files to Create / Modify

| File | Change |
|---|---|
| `src/components/MemberComplianceDashboard.tsx` | **New** — main component (filters, table, summary cards, export) |
| `src/hooks/useMemberCompliance.ts` | **New** — hook that fetches office logs + attendance for all active members in a date range and computes per-member compliance |
| `src/pages/Attendance.tsx` | Add new `<TabsTrigger value="compliance">` and `<TabsContent>` rendering the dashboard, admin-only |

### Technical Notes

- Single batched fetch of `office_attendance_logs` for the period, then group-by `user_id` client-side (avoids N queries).
- Activity/meeting attendance fetched once per period and indexed by user.
- Export uses the same `xlsx` + `jspdf` libs already used in `AttendancePercentageSection.tsx` and `OfficeAttendanceSection.tsx`.
- Realtime: subscribe to `office_attendance_logs` so the live status reflects new check-ins/outs without a refresh.
- Strictly admin/coordinator gated via `isAdminOrCoordinator`; member view stays unchanged (their own compliance still shown via existing `OfficeRulesCard`).

### Out of Scope (can be added later if you want)

- Email/notification alerts for non-compliant members
- Historical month-over-month compliance trend charts
- Per-member individual compliance report PDF
