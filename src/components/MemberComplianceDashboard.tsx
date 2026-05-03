import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ShieldCheck, Download, FileText, FileSpreadsheet, ChevronDown, Loader2, Users, CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeRules, sumMinutes, formatHours, type OfficeLog } from '@/hooks/useOfficeAttendance';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import type { Member } from '@/hooks/useMembers';

interface Props { members: Member[] }

type Period = 'week' | 'month' | 'custom';
type OverallStatus = 'compliant' | 'partial' | 'non-compliant';

interface ComplianceRow {
  user_id: string;
  uid: string;
  name: string;
  college: string;
  department: string;
  role: string;
  weeklyMin: number;
  monthlyMin: number;
  weeklyMet: boolean;
  monthlyMet: boolean;
  activityPct: number;
  meetingPct: number;
  combinedPct: number;
  activityMet: boolean;
  meetingMet: boolean;
  combinedMet: boolean;
  metCount: number;
  totalRules: number;
  overall: OverallStatus;
}

export function MemberComplianceDashboard({ members }: Props) {
  const { rules } = useOfficeRules();

  // Filters
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OverallStatus>('all');
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [activityThreshold, setActivityThreshold] = useState(50);
  const [meetingThreshold, setMeetingThreshold] = useState(50);

  // Data
  const [isLoading, setIsLoading] = useState(true);
  const [officeLogs, setOfficeLogs] = useState<OfficeLog[]>([]);
  const [weekLogs, setWeekLogs] = useState<OfficeLog[]>([]);
  const [monthLogs, setMonthLogs] = useState<OfficeLog[]>([]);
  const [totalActivities, setTotalActivities] = useState(0);
  const [totalMeetings, setTotalMeetings] = useState(0);
  const [presence, setPresence] = useState<Array<{ user_id: string; activity_id: string | null; meeting_id: string | null }>>([]);

  const now = new Date();
  const weekFrom = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekTo = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthFrom = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthTo = format(endOfMonth(now), 'yyyy-MM-dd');

  const periodFrom = period === 'week' ? weekFrom : period === 'month' ? monthFrom : customFrom;
  const periodTo = period === 'week' ? weekTo : period === 'month' ? monthTo : customTo;

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [actCount, mtCount, attRes, weekRes, monthRes, periodRes] = await Promise.all([
          supabase.from('activities').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('meetings').select('*', { count: 'exact', head: true }),
          supabase.from('attendance').select('user_id, activity_id, meeting_id, status').eq('status', 'present'),
          supabase.from('office_attendance_logs').select('*').gte('log_date', weekFrom).lte('log_date', weekTo),
          supabase.from('office_attendance_logs').select('*').gte('log_date', monthFrom).lte('log_date', monthTo),
          supabase.from('office_attendance_logs').select('*').gte('log_date', periodFrom).lte('log_date', periodTo),
        ]);
        setTotalActivities(actCount.count || 0);
        setTotalMeetings(mtCount.count || 0);
        setPresence((attRes.data || []) as any);
        setWeekLogs((weekRes.data || []) as OfficeLog[]);
        setMonthLogs((monthRes.data || []) as OfficeLog[]);
        setOfficeLogs((periodRes.data || []) as OfficeLog[]);
      } finally {
        setIsLoading(false);
      }
    })();

    // realtime
    const ch = supabase
      .channel('member-compliance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'office_attendance_logs' }, async () => {
        const [w, m, p] = await Promise.all([
          supabase.from('office_attendance_logs').select('*').gte('log_date', weekFrom).lte('log_date', weekTo),
          supabase.from('office_attendance_logs').select('*').gte('log_date', monthFrom).lte('log_date', monthTo),
          supabase.from('office_attendance_logs').select('*').gte('log_date', periodFrom).lte('log_date', periodTo),
        ]);
        setWeekLogs((w.data || []) as OfficeLog[]);
        setMonthLogs((m.data || []) as OfficeLog[]);
        setOfficeLogs((p.data || []) as OfficeLog[]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo]);

  const wkTarget = Number(rules?.weekly_hours_target) || 0;
  const mnTarget = Number(rules?.monthly_hours_target) || 0;

  const rows: ComplianceRow[] = useMemo(() => {
    // group office logs per user
    const weekMap = new Map<string, OfficeLog[]>();
    weekLogs.forEach(l => {
      const a = weekMap.get(l.user_id) || []; a.push(l); weekMap.set(l.user_id, a);
    });
    const monthMap = new Map<string, OfficeLog[]>();
    monthLogs.forEach(l => {
      const a = monthMap.get(l.user_id) || []; a.push(l); monthMap.set(l.user_id, a);
    });
    // attendance presence per user
    const attMap = new Map<string, { acts: Set<string>; meets: Set<string> }>();
    for (const r of presence) {
      if (!attMap.has(r.user_id)) attMap.set(r.user_id, { acts: new Set(), meets: new Set() });
      const e = attMap.get(r.user_id)!;
      if (r.activity_id) e.acts.add(r.activity_id);
      if (r.meeting_id) e.meets.add(r.meeting_id);
    }
    const totalEvents = totalActivities + totalMeetings;

    return members.filter(m => m.status === 'active').map(m => {
      const weekMin = sumMinutes(weekMap.get(m.user_id) || []);
      const monthMin = sumMinutes(monthMap.get(m.user_id) || []);
      const weeklyMet = wkTarget === 0 || weekMin / 60 >= wkTarget;
      const monthlyMet = mnTarget === 0 || monthMin / 60 >= mnTarget;

      const e = attMap.get(m.user_id);
      const aP = e?.acts.size || 0;
      const mP = e?.meets.size || 0;
      const aPct = totalActivities > 0 ? Math.round((aP / totalActivities) * 100) : 0;
      const mPct = totalMeetings > 0 ? Math.round((mP / totalMeetings) * 100) : 0;
      const cPct = totalEvents > 0 ? Math.round(((aP + mP) / totalEvents) * 100) : 0;
      const activityMet = aPct >= activityThreshold;
      const meetingMet = mPct >= meetingThreshold;
      const combinedMet = cPct >= Math.min(activityThreshold, meetingThreshold);

      const checks = [weeklyMet, monthlyMet, activityMet, meetingMet, combinedMet];
      const metCount = checks.filter(Boolean).length;
      const totalRules = checks.length;
      const overall: OverallStatus =
        metCount === totalRules ? 'compliant'
        : metCount >= totalRules - 2 ? 'partial'
        : 'non-compliant';

      return {
        user_id: m.user_id, uid: m.uid,
        name: `${m.first_name} ${m.last_name}`,
        college: m.college_name || '-',
        department: m.academic_department || '-',
        role: m.role || 'member',
        weeklyMin: weekMin, monthlyMin: monthMin, weeklyMet, monthlyMet,
        activityPct: aPct, meetingPct: mPct, combinedPct: cPct,
        activityMet, meetingMet, combinedMet,
        metCount, totalRules, overall,
      };
    });
  }, [members, weekLogs, monthLogs, presence, totalActivities, totalMeetings, wkTarget, mnTarget, activityThreshold, meetingThreshold]);

  const colleges = useMemo(() => Array.from(new Set(rows.map(r => r.college).filter(c => c && c !== '-'))).sort(), [rows]);
  const departments = useMemo(() => Array.from(new Set(rows.map(r => r.department).filter(c => c && c !== '-'))).sort(), [rows]);
  const roles = useMemo(() => Array.from(new Set(rows.map(r => r.role))).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (q && !(r.name.toLowerCase().includes(q) || r.uid.toLowerCase().includes(q))) return false;
      if (collegeFilter !== 'all' && r.college !== collegeFilter) return false;
      if (departmentFilter !== 'all' && r.department !== departmentFilter) return false;
      if (roleFilter !== 'all' && r.role !== roleFilter) return false;
      if (statusFilter !== 'all' && r.overall !== statusFilter) return false;
      return true;
    }).sort((a, b) => a.metCount - b.metCount); // problem cases first
  }, [rows, search, collegeFilter, departmentFilter, roleFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = rows.length;
    const compliant = rows.filter(r => r.overall === 'compliant').length;
    const partial = rows.filter(r => r.overall === 'partial').length;
    const non = rows.filter(r => r.overall === 'non-compliant').length;
    return { total, compliant, partial, non };
  }, [rows]);

  const overallVariant = (s: OverallStatus) =>
    s === 'compliant' ? 'success' : s === 'partial' ? 'warning' : 'danger';
  const overallLabel = (s: OverallStatus) =>
    s === 'compliant' ? 'Compliant' : s === 'partial' ? 'Partial' : 'Non-Compliant';

  const periodLabel = period === 'week' ? `This week (${weekFrom} to ${weekTo})`
    : period === 'month' ? `This month (${monthFrom} to ${monthTo})`
    : `${customFrom} to ${customTo}`;

  const exportExcel = () => {
    const html = `<html><body><h2>Member Compliance Report</h2>
      <p><strong>Period:</strong> ${periodLabel}</p>
      <p><strong>Activity threshold:</strong> ${activityThreshold}% • <strong>Meeting threshold:</strong> ${meetingThreshold}%</p>
      <p><strong>Weekly target:</strong> ${wkTarget} hrs • <strong>Monthly target:</strong> ${mnTarget} hrs</p>
      <table border="1"><thead><tr>
        <th>S.No</th><th>BSG ID</th><th>Name</th><th>College</th><th>Department</th><th>Role</th>
        <th>Weekly Hrs</th><th>Weekly Met</th>
        <th>Monthly Hrs</th><th>Monthly Met</th>
        <th>Activities %</th><th>Activity Met</th>
        <th>Meetings %</th><th>Meeting Met</th>
        <th>Combined %</th><th>Overall</th>
      </tr></thead><tbody>
      ${filtered.map((r, i) => `<tr>
        <td>${i+1}</td><td>${r.uid}</td><td>${r.name}</td><td>${r.college}</td><td>${r.department}</td><td>${r.role}</td>
        <td>${formatHours(r.weeklyMin)}</td><td>${r.weeklyMet ? 'Yes' : 'No'}</td>
        <td>${formatHours(r.monthlyMin)}</td><td>${r.monthlyMet ? 'Yes' : 'No'}</td>
        <td>${r.activityPct}%</td><td>${r.activityMet ? 'Yes' : 'No'}</td>
        <td>${r.meetingPct}%</td><td>${r.meetingMet ? 'Yes' : 'No'}</td>
        <td>${r.combinedPct}%</td><td>${overallLabel(r.overall)}</td>
      </tr>`).join('')}
      </tbody></table>
      <p>Compliant: ${summary.compliant} • Partial: ${summary.partial} • Non-Compliant: ${summary.non}</p>
      </body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `member_compliance_${Date.now()}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const html = `<!DOCTYPE html><html><head><title>Member Compliance</title><style>
      body{font-family:Segoe UI,Arial;padding:30px;color:#1a1a1a}
      h1{color:#1a4d2e;margin:0} h2{color:#555;font-weight:normal;margin:6px 0 24px}
      .info{background:#f0f7f0;padding:12px;border-left:4px solid #1a4d2e;margin-bottom:16px;font-size:13px}
      .summary{display:flex;gap:12px;margin-bottom:16px}
      .box{flex:1;padding:12px;border-radius:6px;text-align:center;font-size:13px}
      .box.t{background:#e8f0fe;color:#1a4d2e} .box.c{background:#e6f7e6;color:#166534}
      .box.p{background:#fff7e0;color:#92400e} .box.n{background:#fde8e8;color:#991b1b}
      .num{font-size:22px;font-weight:bold;display:block}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#1a4d2e;color:#fff;padding:6px;text-align:left}
      td{padding:6px;border-bottom:1px solid #eee}
      tr:nth-child(even){background:#fafafa}
      .ok{color:#166534;font-weight:600} .bad{color:#991b1b;font-weight:600}
      .footer{margin-top:24px;text-align:center;color:#999;font-size:11px}
    </style></head><body>
      <h1>The Bharat Scouts &amp; Guides — Silver Oak University</h1>
      <h2>Member Compliance Report</h2>
      <div class="info">
        <strong>Period:</strong> ${periodLabel}<br/>
        <strong>Targets:</strong> Weekly ${wkTarget}h • Monthly ${mnTarget}h • Activities ≥${activityThreshold}% • Meetings ≥${meetingThreshold}%
      </div>
      <div class="summary">
        <div class="box t"><span class="num">${summary.total}</span>Total</div>
        <div class="box c"><span class="num">${summary.compliant}</span>Compliant</div>
        <div class="box p"><span class="num">${summary.partial}</span>Partial</div>
        <div class="box n"><span class="num">${summary.non}</span>Non-Compliant</div>
      </div>
      <table><thead><tr>
        <th>#</th><th>UID</th><th>Name</th><th>College</th><th>Dept</th>
        <th>Wk Hrs</th><th>Mo Hrs</th><th>Act%</th><th>Meet%</th><th>Comb%</th><th>Overall</th>
      </tr></thead><tbody>
      ${filtered.map((r,i) => `<tr>
        <td>${i+1}</td><td>${r.uid}</td><td>${r.name}</td><td>${r.college}</td><td>${r.department}</td>
        <td class="${r.weeklyMet?'ok':'bad'}">${formatHours(r.weeklyMin)}</td>
        <td class="${r.monthlyMet?'ok':'bad'}">${formatHours(r.monthlyMin)}</td>
        <td class="${r.activityMet?'ok':'bad'}">${r.activityPct}%</td>
        <td class="${r.meetingMet?'ok':'bad'}">${r.meetingPct}%</td>
        <td class="${r.combinedMet?'ok':'bad'}">${r.combinedPct}%</td>
        <td class="${r.overall==='compliant'?'ok':'bad'}">${overallLabel(r.overall)}</td>
      </tr>`).join('')}
      </tbody></table>
      <div class="footer">Generated on ${new Date().toLocaleString()} • BSG SOU</div>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-bsg-blue" />
          <div><div className="text-xs text-muted-foreground">Total Members</div>
          <div className="text-2xl font-bold">{summary.total}</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-bsg-green" />
          <div><div className="text-xs text-muted-foreground">Fully Compliant</div>
          <div className="text-2xl font-bold text-bsg-green">{summary.compliant}</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <div><div className="text-xs text-muted-foreground">Partial</div>
          <div className="text-2xl font-bold text-amber-600">{summary.partial}</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <XCircle className="h-8 w-8 text-red-500" />
          <div><div className="text-xs text-muted-foreground">Non-Compliant</div>
          <div className="text-2xl font-bold text-red-600">{summary.non}</div></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Member Compliance Dashboard</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={filtered.length === 0}>
                  <Download className="h-4 w-4 mr-2" />Export<ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportPDF}><FileText className="h-4 w-4 mr-2" />Print / PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name or UID" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={collegeFilter} onValueChange={setCollegeFilter}>
              <SelectTrigger><SelectValue placeholder="College" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Colleges</SelectItem>
                {colleges.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="non-compliant">Non-Compliant</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger><SelectValue placeholder="Period" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Act ≥</span>
              <Input type="number" min={0} max={100} value={activityThreshold}
                onChange={(e) => setActivityThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Meet ≥</span>
              <Input type="number" min={0} max={100} value={meetingThreshold}
                onChange={(e) => setMeetingThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {rows.length} active members</span>
            <span className="text-xs">Targets: {wkTarget}h/wk • {mnTarget}h/mo</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Weekly Hrs</TableHead>
                    <TableHead>Monthly Hrs</TableHead>
                    <TableHead>Activities</TableHead>
                    <TableHead>Meetings</TableHead>
                    <TableHead>Combined</TableHead>
                    <TableHead>Overall</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No members match these filters</TableCell></TableRow>
                  ) : filtered.map((r) => (
                    <TableRow key={r.user_id}>
                      <TableCell className="font-mono text-xs">{r.uid}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.college}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{formatHours(r.weeklyMin)}</span>
                          <Badge variant={r.weeklyMet ? 'success' : 'danger'} className="text-[10px]">{r.weeklyMet ? 'Met' : 'Below'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{formatHours(r.monthlyMin)}</span>
                          <Badge variant={r.monthlyMet ? 'success' : 'danger'} className="text-[10px]">{r.monthlyMet ? 'Met' : 'Below'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.activityMet ? 'success' : 'outline'}>{r.activityPct}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.meetingMet ? 'success' : 'outline'}>{r.meetingPct}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.combinedMet ? 'success' : 'outline'}>{r.combinedPct}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={overallVariant(r.overall) as any}>
                          {overallLabel(r.overall)} ({r.metCount}/{r.totalRules})
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}