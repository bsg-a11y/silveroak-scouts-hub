

## Plan: Semester Auto-Update, Attendance Sync Verification, and Bulk Member Selection

### A. Auto-Update Semesters on Jan 1 and July 1

Create a scheduled edge function that increments `current_semester` by 1 for all active member profiles. This will be triggered via a `pg_cron` job on January 1st and July 1st (note: June has 30 days, so using July 1st instead of June 31st which doesn't exist).

**Steps:**
1. Create `supabase/functions/update-semesters/index.ts` edge function that:
   - Uses service role to update all profiles where `current_semester IS NOT NULL` and `status = 'active'`
   - Increments `current_semester` by 1
   - Caps at a reasonable max (e.g., 10 for degree, 6 for diploma based on `course_duration`)
   - Returns count of updated records

2. Set up two `pg_cron` scheduled jobs (via insert tool):
   - `0 0 1 1 *` (January 1st midnight)
   - `0 0 1 7 *` (July 1st midnight)
   - Both call the edge function via `net.http_post`

3. Enable `pg_cron` and `pg_net` extensions via migration.

### B. Verify Attendance Sync Across Dashboards

Review and fix attendance calculation consistency across:
- **Dashboard.tsx** (`useDashboardStats`) — overall stats
- **Profile.tsx** — member's own attendance (completed activities attended / total completed)
- **Attendance.tsx** — member view progress bars
- **MemberDetailsDialog.tsx** — admin viewing a member's details
- **FacultyDashboard.tsx** — faculty view

Ensure all use the same formula: `attended (present) / total completed activities` and `attended / total meetings`. Fix any inconsistencies found (the dashboard stats hook currently has a confusing calculation mixing record counts with member-weighted denominators).

### C. Add Bulk Member Selection for Forms

Add "Select All" / "Deselect All" buttons to the member picker in both the Create Form and Edit Form dialogs. Also add "Select All Filtered" when a search is active.

**Changes to `src/pages/Forms.tsx`:**
- Add "Select All" and "Deselect All" buttons above the member list in both create and edit form dialogs
- When search is active, "Select All" selects only filtered members
- Show selected count clearly

### Technical Details

| Task | Files Changed |
|------|--------------|
| Semester cron | New: `supabase/functions/update-semesters/index.ts`, migration for pg_cron/pg_net, cron job SQL insert |
| Attendance sync | `src/hooks/useDashboardStats.ts`, possibly `src/components/MemberDetailsDialog.tsx`, `src/pages/FacultyDashboard.tsx` |
| Bulk member selection | `src/pages/Forms.tsx` |

