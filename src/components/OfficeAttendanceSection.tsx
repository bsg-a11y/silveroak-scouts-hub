import { useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, parseISO, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  LogIn, LogOut, Clock, Search, Calendar as CalIcon, Download, FileSpreadsheet, FileText,
  ChevronDown, Loader2, Pencil, Trash2, Lock, Unlock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useOfficeAttendance, useOfficeRules, checkInMember, checkOutMember,
  updateOfficeLog, deleteOfficeLog, formatHours, logMinutes, sumMinutes, OfficeLog,
} from '@/hooks/useOfficeAttendance';
import { OfficeRulesCard } from '@/components/OfficeRulesCard';
import type { Member } from '@/hooks/useMembers';

interface Props { members: Member[] }

type Filters = {
  memberIds: Set<string>;       // empty = all
  college: string;              // 'all'
  department: string;           // 'all'
  role: string;                 // 'all'
  semester: string;             // 'all' | number
  minHours: number;             // 0 = none
};
const emptyFilters = (): Filters => ({
  memberIds: new Set(), college: 'all', department: 'all', role: 'all', semester: 'all', minHours: 0,
});

export function OfficeAttendanceSection({ members }: Props) {
  const activeMembers = useMemo(() => members.filter(m => m.status === 'active'), [members]);
  return (
    <div className="space-y-6">
      <Tabs defaultValue="day" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="day">Daily Log</TabsTrigger>
          <TabsTrigger value="month">Monthly Report</TabsTrigger>
          <TabsTrigger value="export">Export &amp; Filters</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="day"><DailyLogTab members={activeMembers} /></TabsContent>
        <TabsContent value="month"><MonthlyReport members={activeMembers} /></TabsContent>
        <TabsContent value="export"><ExportTab members={activeMembers} /></TabsContent>
        <TabsContent value="rules"><OfficeRulesCard isAdmin={true} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================== Daily log ============================== */
function DailyLogTab({ members }: { members: Member[] }) {
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const { rules } = useOfficeRules();
  const { logs: dayLogs, refetch } = useOfficeAttendance({ fromDate: selectedDate, toDate: selectedDate });

  const [editLog, setEditLog] = useState<OfficeLog | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const logsByUser = useMemo(() => {
    const m = new Map<string, OfficeLog[]>();
    for (const l of dayLogs) {
      const arr = m.get(l.user_id) || [];
      arr.push(l);
      m.set(l.user_id, arr);
    }
    m.forEach(arr => arr.sort((a, b) => a.check_in_at.localeCompare(b.check_in_at)));
    return m;
  }, [dayLogs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return members;
    return members.filter(m =>
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q) ||
      m.uid.toLowerCase().includes(q));
  }, [members, search]);

  const checkWindow = (): { ok: boolean; reason?: string } => {
    if (!rules?.enforce_window) return { ok: true };
    const now = new Date();
    const hm = format(now, 'HH:mm');
    const open = (rules.open_time || '09:00').slice(0, 5);
    const close = (rules.close_time || '18:00').slice(0, 5);
    if (hm < open || hm > close) return { ok: false, reason: `Office closed (allowed ${open}–${close})` };
    return { ok: true };
  };

  const handleCheckIn = async (m: Member) => {
    const w = checkWindow();
    if (!w.ok) { toast({ title: 'Locked', description: w.reason, variant: 'destructive' }); return; }
    setBusy(m.user_id);
    const r = await checkInMember(m.user_id);
    setBusy(null);
    if (!r.success) toast({ title: 'Check-in failed', description: r.error, variant: 'destructive' });
    else { toast({ title: 'Checked in', description: `${m.first_name} ${m.last_name}` }); refetch(); }
  };
  const handleCheckOut = async (m: Member) => {
    setBusy(m.user_id);
    const r = await checkOutMember(m.user_id);
    setBusy(null);
    if (!r.success) toast({ title: 'Check-out failed', description: r.error, variant: 'destructive' });
    else { toast({ title: 'Checked out', description: `${m.first_name} ${m.last_name}` }); refetch(); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const r = await deleteOfficeLog(deleteId);
    if (!r.success) toast({ title: 'Delete failed', description: r.error, variant: 'destructive' });
    else { toast({ title: 'Session deleted' }); refetch(); }
    setDeleteId(null);
  };

  const live = dayLogs.filter(l => !l.check_out_at);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Clock className="h-5 w-5" /> BSG Office — {format(parseISO(selectedDate), 'dd MMM yyyy')}
          <Badge variant={live.length > 0 ? 'success' : 'secondary'} className="ml-2">
            {live.length > 0 ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
            {live.length} live
          </Badge>
          {rules?.enforce_window && (
            <Badge variant="outline" className="ml-1 font-normal">
              Window {rules.open_time?.slice(0,5)}–{rules.close_time?.slice(0,5)} enforced
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-2">
            <CalIcon className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-[180px]" />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or BSG ID…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BSG ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => {
                const userLogs = logsByUser.get(m.user_id) || [];
                const isCheckedIn = userLogs.some(l => !l.check_out_at);
                const totalMin = sumMinutes(userLogs);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.uid}</TableCell>
                    <TableCell className="font-medium">{m.first_name} {m.last_name}</TableCell>
                    <TableCell>
                      {userLogs.length === 0 ? <span className="text-muted-foreground">—</span> :
                        <div className="flex flex-wrap gap-1.5">
                          {userLogs.map(l => (
                            <span key={l.id} className="inline-flex items-center gap-0.5">
                              <Badge variant={l.check_out_at ? 'secondary' : 'success'} className="gap-1">
                                {!l.check_out_at && <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                                {format(parseISO(l.check_in_at), 'HH:mm')} → {l.check_out_at ? format(parseISO(l.check_out_at), 'HH:mm') : 'live'}
                              </Badge>
                              <Button size="icon-sm" variant="ghost" onClick={() => setEditLog(l)} title="Edit">
                                <Pencil />
                              </Button>
                              <Button size="icon-sm" variant="ghost" onClick={() => setDeleteId(l.id)} title="Delete">
                                <Trash2 />
                              </Button>
                            </span>
                          ))}
                        </div>}
                    </TableCell>
                    <TableCell><span className="font-semibold">{formatHours(totalMin)}</span></TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1.5">
                        <Button size="sm" variant="outline" disabled={isCheckedIn || busy === m.user_id} onClick={() => handleCheckIn(m)}>
                          <LogIn className="h-3.5 w-3.5 mr-1" /> In
                        </Button>
                        <Button size="sm" variant="outline" disabled={!isCheckedIn || busy === m.user_id} onClick={() => handleCheckOut(m)}>
                          <LogOut className="h-3.5 w-3.5 mr-1" /> Out
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No members found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <EditLogDialog log={editLog} onClose={() => setEditLog(null)} onSaved={refetch} />
        <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete this session?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This permanently removes the check-in/out record.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ============================== Edit dialog ============================== */
function EditLogDialog({ log, onClose, onSaved }: { log: OfficeLog | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (log) {
      setCheckIn(toLocalInput(log.check_in_at));
      setCheckOut(log.check_out_at ? toLocalInput(log.check_out_at) : '');
      setNotes(log.notes || '');
    }
  }, [log]);

  const save = async () => {
    if (!log) return;
    setSaving(true);
    const r = await updateOfficeLog(log.id, {
      check_in_at: new Date(checkIn).toISOString(),
      check_out_at: checkOut ? new Date(checkOut).toISOString() : null,
      notes: notes || null,
    });
    setSaving(false);
    if (!r.success) { toast({ title: 'Update failed', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'Session updated' });
    onSaved(); onClose();
  };

  return (
    <Dialog open={!!log} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit office session</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Check-in</Label>
            <Input type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div className="space-y-1"><Label>Check-out (leave empty for live)</Label>
            <Input type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
          <div className="space-y-1"><Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !checkIn}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ============================== Monthly report ============================== */
function MonthlyReport({ members }: { members: Member[] }) {
  const now = new Date();
  const [month, setMonth] = useState(format(now, 'yyyy-MM'));
  const [memberFilter, setMemberFilter] = useState<string>('all');

  const fromDate = format(startOfMonth(parseISO(`${month}-01`)), 'yyyy-MM-dd');
  const toDate = format(endOfMonth(parseISO(`${month}-01`)), 'yyyy-MM-dd');

  const { logs, isLoading } = useOfficeAttendance({
    fromDate, toDate, userId: memberFilter !== 'all' ? memberFilter : undefined,
  });

  const memberMap = useMemo(() => new Map(members.map(m => [m.user_id, m])), [members]);
  const grouped = useMemo(() => {
    const m = new Map<string, Map<string, OfficeLog[]>>();
    for (const l of logs) {
      if (!m.has(l.user_id)) m.set(l.user_id, new Map());
      const dm = m.get(l.user_id)!;
      const arr = dm.get(l.log_date) || [];
      arr.push(l); dm.set(l.log_date, arr);
    }
    return m;
  }, [logs]);

  const summary = useMemo(() => {
    const rows: { user_id: string; name: string; uid: string; daysPresent: number; totalMinutes: number }[] = [];
    grouped.forEach((dateMap, uid) => {
      const m = memberMap.get(uid); if (!m) return;
      let totalMin = 0;
      dateMap.forEach(arr => { totalMin += sumMinutes(arr); });
      rows.push({ user_id: uid, name: `${m.first_name} ${m.last_name}`, uid: m.uid, daysPresent: dateMap.size, totalMinutes: totalMin });
    });
    return rows.sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [grouped, memberMap]);

  const monthLabel = format(parseISO(`${month}-01`), 'MMMM yyyy');

  const exportExcel = () => {
    let html = `<html><body><h2>Office Attendance — ${monthLabel}</h2>`;
    if (memberFilter === 'all') {
      html += `<table border="1"><thead><tr><th>S.No</th><th>BSG ID</th><th>Name</th><th>Days</th><th>Total Hours</th></tr></thead><tbody>`;
      summary.forEach((r, i) => { html += `<tr><td>${i+1}</td><td>${r.uid}</td><td>${r.name}</td><td>${r.daysPresent}</td><td>${formatHours(r.totalMinutes)}</td></tr>`; });
      html += `</tbody></table>`;
    } else {
      const m = members.find(x => x.user_id === memberFilter);
      const dateMap = grouped.get(memberFilter) || new Map<string, OfficeLog[]>();
      let totalMin = 0;
      html += `<h3>${m?.first_name} ${m?.last_name} (${m?.uid})</h3>`;
      html += `<table border="1"><thead><tr><th>Date</th><th>Sessions</th><th>Daily Hours</th></tr></thead><tbody>`;
      Array.from(dateMap.entries()).sort().forEach(([d, arr]) => {
        const min = sumMinutes(arr); totalMin += min;
        const sess = arr.map(l => `${format(parseISO(l.check_in_at),'HH:mm')}-${l.check_out_at ? format(parseISO(l.check_out_at),'HH:mm') : 'live'}`).join(', ');
        html += `<tr><td>${format(parseISO(d),'dd MMM yyyy')}</td><td>${sess}</td><td>${formatHours(min)}</td></tr>`;
      });
      html += `</tbody></table><p><strong>Total: ${formatHours(totalMin)}</strong></p>`;
    }
    downloadXls(html, `office_attendance_${month}.xls`);
  };

  const exportPDF = () => {
    let body = '';
    if (memberFilter === 'all') {
      body = `<table><thead><tr><th>S.No</th><th>BSG ID</th><th>Name</th><th>Days</th><th>Total Hours</th></tr></thead><tbody>`
        + summary.map((r, i) => `<tr><td>${i+1}</td><td>${r.uid}</td><td>${r.name}</td><td>${r.daysPresent}</td><td>${formatHours(r.totalMinutes)}</td></tr>`).join('')
        + `</tbody></table>`;
    } else {
      const m = members.find(x => x.user_id === memberFilter);
      const dateMap = grouped.get(memberFilter) || new Map<string, OfficeLog[]>();
      let totalMin = 0;
      const rows = Array.from(dateMap.entries()).sort().map(([d, arr]) => {
        const min = sumMinutes(arr); totalMin += min;
        const sess = arr.map(l => `${format(parseISO(l.check_in_at),'HH:mm')}-${l.check_out_at ? format(parseISO(l.check_out_at),'HH:mm') : 'live'}`).join(', ');
        return `<tr><td>${format(parseISO(d),'dd MMM yyyy')}</td><td>${sess}</td><td>${formatHours(min)}</td></tr>`;
      }).join('');
      body = `<h3>${m?.first_name} ${m?.last_name} (${m?.uid})</h3>`
        + `<table><thead><tr><th>Date</th><th>Sessions</th><th>Daily Hours</th></tr></thead><tbody>${rows}</tbody></table>`
        + `<p style="margin-top:12px;"><strong>Total: ${formatHours(totalMin)}</strong></p>`;
    }
    printPDF(`Office Attendance — ${monthLabel}`, body);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2"><CalIcon className="h-5 w-5" /> Monthly Office Attendance</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export<ChevronDown className="h-3 w-3 ml-1" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportPDF}><FileText className="h-4 w-4 mr-2" />Print / PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[180px]" />
          <Select value={memberFilter} onValueChange={setMemberFilter}>
            <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members (Summary)</SelectItem>
              {members.map(m => (
                <SelectItem key={m.id} value={m.user_id}>{m.uid} — {m.first_name} {m.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> :
          memberFilter === 'all' ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead><TableHead>BSG ID</TableHead><TableHead>Name</TableHead>
                    <TableHead>Days Present</TableHead><TableHead>Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
                    : summary.map((r, i) => (
                      <TableRow key={r.user_id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{r.uid}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.daysPresent}</TableCell>
                        <TableCell className="font-semibold">{formatHours(r.totalMinutes)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <SingleMemberMonth grouped={grouped} userId={memberFilter} />
          )}
      </CardContent>
    </Card>
  );
}

function SingleMemberMonth({ grouped, userId }: { grouped: Map<string, Map<string, OfficeLog[]>>, userId: string }) {
  const dateMap = grouped.get(userId) || new Map<string, OfficeLog[]>();
  const rows = Array.from(dateMap.entries()).sort();
  const totalMin = rows.reduce((s, [, arr]) => s + sumMinutes(arr), 0);
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Sessions</TableHead><TableHead>Daily Hours</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
            : rows.map(([date, arr]) => (
              <TableRow key={date}>
                <TableCell>{format(parseISO(date), 'dd MMM yyyy (EEE)')}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {arr.map(l => (
                      <Badge key={l.id} variant={l.check_out_at ? 'secondary' : 'success'}>
                        {format(parseISO(l.check_in_at),'HH:mm')} → {l.check_out_at ? format(parseISO(l.check_out_at),'HH:mm') : 'live'}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="font-semibold">{formatHours(sumMinutes(arr))}</TableCell>
              </TableRow>
            ))}
          {rows.length > 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-right font-semibold">Total Hours</TableCell>
              <TableCell className="font-bold text-bsg-green">{formatHours(totalMin)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* ============================== Export & Filters ============================== */
function ExportTab({ members }: { members: Member[] }) {
  const [mode, setMode] = useState<'single' | 'range'>('range');
  const today = format(new Date(), 'yyyy-MM-dd');
  const [singleDate, setSingleDate] = useState(today);
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(today);

  const [filters, setFilters] = useState<Filters>(emptyFilters());

  const colleges = useMemo(() => Array.from(new Set(members.map(m => m.college_name).filter(Boolean))) as string[], [members]);
  const departments = useMemo(() => Array.from(new Set(members.map(m => m.academic_department).filter(Boolean))) as string[], [members]);
  const roles = useMemo(() => Array.from(new Set(members.map(m => m.role).filter(Boolean))) as string[], [members]);
  const semesters = useMemo(() => Array.from(new Set(members.map(m => m.current_semester).filter(s => s != null))).sort((a, b) => Number(a) - Number(b)) as number[], [members]);

  const filteredMembers = useMemo(() => members.filter(m => {
    if (filters.memberIds.size > 0 && !filters.memberIds.has(m.user_id)) return false;
    if (filters.college !== 'all' && m.college_name !== filters.college) return false;
    if (filters.department !== 'all' && m.academic_department !== filters.department) return false;
    if (filters.role !== 'all' && m.role !== filters.role) return false;
    if (filters.semester !== 'all' && String(m.current_semester) !== filters.semester) return false;
    return true;
  }), [members, filters]);

  const fromDate = mode === 'single' ? singleDate : from;
  const toDate = mode === 'single' ? singleDate : to;

  const { logs, isLoading } = useOfficeAttendance({ fromDate, toDate });

  // Index logs by user/date
  const userDateLogs = useMemo(() => {
    const m = new Map<string, Map<string, OfficeLog[]>>();
    for (const l of logs) {
      if (!m.has(l.user_id)) m.set(l.user_id, new Map());
      const dm = m.get(l.user_id)!;
      const arr = dm.get(l.log_date) || [];
      arr.push(l); dm.set(l.log_date, arr);
    }
    return m;
  }, [logs]);

  // Build rows: per member per date
  const rows = useMemo(() => {
    const days = mode === 'single'
      ? [singleDate]
      : eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).map(d => format(d, 'yyyy-MM-dd'));

    const out: { uid: string; name: string; college: string; dept: string; date: string; sessions: string; minutes: number }[] = [];
    for (const m of filteredMembers) {
      const dm = userDateLogs.get(m.user_id);
      let memberTotal = 0;
      for (const d of days) {
        const arr = dm?.get(d) || [];
        const min = sumMinutes(arr);
        memberTotal += min;
        if (arr.length === 0 && days.length > 1) continue; // skip empty in range
        out.push({
          uid: m.uid,
          name: `${m.first_name} ${m.last_name}`,
          college: m.college_name || '-',
          dept: m.academic_department || '-',
          date: d,
          sessions: arr.map(l => `${format(parseISO(l.check_in_at), 'HH:mm')}-${l.check_out_at ? format(parseISO(l.check_out_at), 'HH:mm') : 'live'}`).join(', ') || '—',
          minutes: min,
        });
      }
      // apply min hours filter at member level
      if (filters.minHours > 0 && memberTotal / 60 < filters.minHours) {
        // remove all rows for this member
        for (let i = out.length - 1; i >= 0 && out[i].uid === m.uid; i--) out.splice(i, 1);
      }
    }
    return out;
  }, [filteredMembers, userDateLogs, mode, singleDate, from, to, filters.minHours]);

  // Summary per member
  const memberTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.uid, (map.get(r.uid) || 0) + r.minutes);
    return map;
  }, [rows]);

  const filterDescription = () => {
    const parts: string[] = [];
    parts.push(mode === 'single' ? `Date: ${format(parseISO(singleDate), 'dd MMM yyyy')}` : `Range: ${format(parseISO(from), 'dd MMM yyyy')} – ${format(parseISO(to), 'dd MMM yyyy')}`);
    if (filters.memberIds.size) parts.push(`Members: ${filters.memberIds.size} selected`);
    if (filters.college !== 'all') parts.push(`College: ${filters.college}`);
    if (filters.department !== 'all') parts.push(`Dept: ${filters.department}`);
    if (filters.role !== 'all') parts.push(`Role: ${filters.role}`);
    if (filters.semester !== 'all') parts.push(`Sem: ${filters.semester}`);
    if (filters.minHours > 0) parts.push(`Min hours ≥ ${filters.minHours}`);
    return parts.join(' • ');
  };

  const exportExcel = () => {
    let html = `<html><body><h2>Office Attendance Export</h2><p><strong>Filter:</strong> ${filterDescription()}</p>`;
    html += `<table border="1"><thead><tr><th>S.No</th><th>BSG ID</th><th>Name</th><th>College</th><th>Dept</th><th>Date</th><th>Sessions</th><th>Hours</th></tr></thead><tbody>`;
    rows.forEach((r, i) => {
      html += `<tr><td>${i+1}</td><td>${r.uid}</td><td>${r.name}</td><td>${r.college}</td><td>${r.dept}</td><td>${format(parseISO(r.date),'dd MMM yyyy')}</td><td>${r.sessions}</td><td>${formatHours(r.minutes)}</td></tr>`;
    });
    html += `</tbody></table><h3>Summary</h3><table border="1"><thead><tr><th>BSG ID</th><th>Total Hours</th></tr></thead><tbody>`;
    memberTotals.forEach((min, uid) => { html += `<tr><td>${uid}</td><td>${formatHours(min)}</td></tr>`; });
    html += `</tbody></table></body></html>`;
    downloadXls(html, `office_export_${fromDate}_${toDate}.xls`);
  };

  const exportPDF = () => {
    const body = `
      <table><thead><tr><th>S.No</th><th>BSG ID</th><th>Name</th><th>College</th><th>Dept</th><th>Date</th><th>Sessions</th><th>Hours</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td>${i+1}</td><td>${r.uid}</td><td>${r.name}</td><td>${r.college}</td><td>${r.dept}</td><td>${format(parseISO(r.date),'dd MMM yyyy')}</td><td>${r.sessions}</td><td>${formatHours(r.minutes)}</td></tr>`).join('')}
      </tbody></table>
      <h3 style="margin-top:18px;">Per-member totals</h3>
      <table><thead><tr><th>BSG ID</th><th>Total Hours</th></tr></thead><tbody>
      ${Array.from(memberTotals.entries()).map(([u, m]) => `<tr><td>${u}</td><td>${formatHours(m)}</td></tr>`).join('')}
      </tbody></table>`;
    printPDF(`Office Attendance Export`, body, filterDescription());
  };

  const toggleMember = (id: string) => {
    const next = new Set(filters.memberIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFilters({ ...filters, memberIds: next });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2"><Download className="h-5 w-5" /> Office Attendance Export</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={rows.length === 0}>
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
        {/* Date selection */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single date</SelectItem>
                <SelectItem value="range">Date range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === 'single' ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-[180px]" />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[170px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[170px]" />
              </div>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="border rounded-lg p-3 space-y-3">
          <div className="text-sm font-medium">Filters</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">College</Label>
              <Select value={filters.college} onValueChange={(v) => setFilters({ ...filters, college: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All colleges</SelectItem>
                  {colleges.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Department</Label>
              <Select value={filters.department} onValueChange={(v) => setFilters({ ...filters, department: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select value={filters.role} onValueChange={(v) => setFilters({ ...filters, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Semester</Label>
              <Select value={filters.semester} onValueChange={(v) => setFilters({ ...filters, semester: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All semesters</SelectItem>
                  {semesters.map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Min hours in period</Label>
              <Input type="number" min={0} step="0.5" value={filters.minHours}
                onChange={(e) => setFilters({ ...filters, minHours: Math.max(0, Number(e.target.value) || 0) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Specific members</Label>
              <Select value="" onValueChange={toggleMember}>
                <SelectTrigger><SelectValue placeholder={filters.memberIds.size > 0 ? `${filters.memberIds.size} selected` : 'Add member…'} /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {members.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {filters.memberIds.has(m.user_id) ? '✓ ' : ''}{m.uid} — {m.first_name} {m.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.memberIds.size > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setFilters({ ...filters, memberIds: new Set() })}>Clear members</Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{rows.length} rows • {memberTotals.size} members</span>
          <Button variant="ghost" size="sm" onClick={() => setFilters(emptyFilters())}>Reset filters</Button>
        </div>

        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <div className="border rounded-lg overflow-hidden max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BSG ID</TableHead><TableHead>Name</TableHead>
                  <TableHead>Date</TableHead><TableHead>Sessions</TableHead><TableHead>Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No matching records</TableCell></TableRow>
                ) : rows.map((r, i) => (
                  <TableRow key={`${r.uid}-${r.date}-${i}`}>
                    <TableCell className="font-mono text-xs">{r.uid}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{format(parseISO(r.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-xs">{r.sessions}</TableCell>
                    <TableCell className="font-semibold">{formatHours(r.minutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================== shared export helpers ============================== */
function downloadXls(html: string, filename: string) {
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function printPDF(title: string, body: string, filterLine?: string) {
  const html = `<!DOCTYPE html><html><head><title>${title}</title><style>
    body{font-family:Segoe UI,Arial;padding:30px;color:#1a1a1a}
    h1{color:#1a4d2e;margin:0} h2{color:#555;font-weight:normal;margin:4px 0 18px}
    .filter{background:#f0f7f0;padding:10px 12px;border-left:4px solid #1a4d2e;margin-bottom:14px;font-size:12px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{background:#1a4d2e;color:#fff;padding:8px;text-align:left;font-size:12px}
    td{padding:8px;border-bottom:1px solid #eee;font-size:12px}
    tr:nth-child(even){background:#fafafa}
  </style></head><body>
    <h1>The Bharat Scouts &amp; Guides — Silver Oak University</h1>
    <h2>${title}</h2>
    ${filterLine ? `<div class="filter"><strong>Filter:</strong> ${filterLine}</div>` : ''}
    ${body}
  </body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}