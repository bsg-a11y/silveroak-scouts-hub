import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogIn, LogOut, Clock, Search, Calendar as CalIcon, Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useOfficeAttendance, checkInMember, checkOutMember, formatHours, logMinutes, sumMinutes, OfficeLog,
} from '@/hooks/useOfficeAttendance';
import type { Member } from '@/hooks/useMembers';

interface Props {
  members: Member[];
}

export function OfficeAttendanceSection({ members }: Props) {
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [hoursDialog, setHoursDialog] = useState<{ open: boolean; member?: Member; logs?: OfficeLog[] }>({ open: false });

  const activeMembers = useMemo(() => members.filter(m => m.status === 'active'), [members]);

  const { logs: dayLogs, refetch } = useOfficeAttendance({
    fromDate: selectedDate,
    toDate: selectedDate,
  });

  const logsByUser = useMemo(() => {
    const m = new Map<string, OfficeLog[]>();
    for (const l of dayLogs) {
      const arr = m.get(l.user_id) || [];
      arr.push(l);
      m.set(l.user_id, arr);
    }
    // Sort each user's sessions ascending by check_in_at
    m.forEach(arr => arr.sort((a, b) => a.check_in_at.localeCompare(b.check_in_at)));
    return m;
  }, [dayLogs]);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return activeMembers;
    return activeMembers.filter(m =>
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q) ||
      m.uid.toLowerCase().includes(q)
    );
  }, [activeMembers, search]);

  const handleCheckIn = async (m: Member) => {
    setBusy(m.user_id);
    const res = await checkInMember(m.user_id);
    setBusy(null);
    if (!res.success) toast({ title: 'Check-in failed', description: res.error, variant: 'destructive' });
    else { toast({ title: 'Checked in', description: `${m.first_name} ${m.last_name}` }); refetch(); }
  };
  const handleCheckOut = async (m: Member) => {
    setBusy(m.user_id);
    const res = await checkOutMember(m.user_id);
    setBusy(null);
    if (!res.success) toast({ title: 'Check-out failed', description: res.error, variant: 'destructive' });
    else { toast({ title: 'Checked out', description: `${m.first_name} ${m.last_name}` }); refetch(); }
  };

  const openHoursDialog = (m: Member) => {
    const l = logsByUser.get(m.user_id) || [];
    setHoursDialog({ open: true, member: m, logs: l });
  };

  const renderSessions = (logs: OfficeLog[]) => {
    if (!logs.length) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {logs.map(l => (
          <Badge key={l.id} variant={l.check_out_at ? 'secondary' : 'success'}>
            {format(parseISO(l.check_in_at), 'HH:mm')} → {l.check_out_at ? format(parseISO(l.check_out_at), 'HH:mm') : 'live'}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="day" className="space-y-4">
        <TabsList>
          <TabsTrigger value="day">Daily Log</TabsTrigger>
          <TabsTrigger value="month">Monthly Report</TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                BSG Office Attendance — {format(parseISO(selectedDate), 'dd MMM yyyy')}
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
                  <Input placeholder="Search by name or BSG ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                    {filteredMembers.map(m => {
                      const userLogs = logsByUser.get(m.user_id) || [];
                      const isCheckedIn = userLogs.some(l => !l.check_out_at);
                      const totalMin = sumMinutes(userLogs);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-xs">{m.uid}</TableCell>
                          <TableCell className="font-medium">{m.first_name} {m.last_name}</TableCell>
                          <TableCell>{renderSessions(userLogs)}</TableCell>
                          <TableCell>
                            <span className="font-semibold">{formatHours(totalMin)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex gap-1.5">
                              <Button size="sm" variant="outline"
                                disabled={isCheckedIn || busy === m.user_id}
                                onClick={() => handleCheckIn(m)}>
                                <LogIn className="h-3.5 w-3.5 mr-1" /> In
                              </Button>
                              <Button size="sm" variant="outline"
                                disabled={!isCheckedIn || busy === m.user_id}
                                onClick={() => handleCheckOut(m)}>
                                <LogOut className="h-3.5 w-3.5 mr-1" /> Out
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openHoursDialog(m)}>
                                <Clock className="h-3.5 w-3.5 mr-1" /> Hours
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredMembers.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No members found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month">
          <MonthlyReport members={activeMembers} />
        </TabsContent>
      </Tabs>

      <Dialog open={hoursDialog.open} onOpenChange={(o) => setHoursDialog(prev => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Hours — {hoursDialog.member?.first_name} {hoursDialog.member?.last_name} • {format(parseISO(selectedDate), 'dd MMM yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(hoursDialog.logs || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions recorded for this day.</p>
            ) : (
              <div className="space-y-2">
                {(hoursDialog.logs || []).map((l, i) => (
                  <div key={l.id} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">
                      Session {i + 1}: {format(parseISO(l.check_in_at), 'HH:mm')} → {l.check_out_at ? format(parseISO(l.check_out_at), 'HH:mm') : 'live'}
                    </span>
                    <Badge variant={l.check_out_at ? 'secondary' : 'success'}>
                      {l.check_out_at ? formatHours(logMinutes(l)) : 'in progress'}
                    </Badge>
                  </div>
                ))}
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="font-semibold">Total Hours</span>
                  <span className="text-lg font-bold text-bsg-green">{formatHours(sumMinutes(hoursDialog.logs || []))}</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----- Monthly Report ----- */
function MonthlyReport({ members }: { members: Member[] }) {
  const now = new Date();
  const [month, setMonth] = useState(format(now, 'yyyy-MM'));
  const [memberFilter, setMemberFilter] = useState<string>('all');

  const fromDate = format(startOfMonth(parseISO(`${month}-01`)), 'yyyy-MM-dd');
  const toDate = format(endOfMonth(parseISO(`${month}-01`)), 'yyyy-MM-dd');

  const { logs, isLoading } = useOfficeAttendance({
    fromDate, toDate,
    userId: memberFilter !== 'all' ? memberFilter : undefined,
  });

  const memberMap = useMemo(() => new Map(members.map(m => [m.user_id, m])), [members]);

  // Group by user -> by date
  const grouped = useMemo(() => {
    const m = new Map<string, Map<string, OfficeLog[]>>();
    for (const l of logs) {
      if (!m.has(l.user_id)) m.set(l.user_id, new Map());
      const dateMap = m.get(l.user_id)!;
      const arr = dateMap.get(l.log_date) || [];
      arr.push(l);
      dateMap.set(l.log_date, arr);
    }
    return m;
  }, [logs]);

  const summary = useMemo(() => {
    const rows: { user_id: string; name: string; uid: string; daysPresent: number; totalMinutes: number }[] = [];
    grouped.forEach((dateMap, uid) => {
      const m = memberMap.get(uid);
      if (!m) return;
      let totalMin = 0;
      dateMap.forEach(arr => { totalMin += sumMinutes(arr); });
      rows.push({
        user_id: uid,
        name: `${m.first_name} ${m.last_name}`,
        uid: m.uid,
        daysPresent: dateMap.size,
        totalMinutes: totalMin,
      });
    });
    return rows.sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [grouped, memberMap]);

  const exportExcel = () => {
    const monthLabel = format(parseISO(`${month}-01`), 'MMMM yyyy');
    let html = `<html><body><h2>Office Attendance — ${monthLabel}</h2>`;
    if (memberFilter === 'all') {
      html += `<table border="1"><thead><tr><th>S.No</th><th>BSG ID</th><th>Name</th><th>Days Present</th><th>Total Hours</th></tr></thead><tbody>`;
      summary.forEach((r, i) => {
        html += `<tr><td>${i+1}</td><td>${r.uid}</td><td>${r.name}</td><td>${r.daysPresent}</td><td>${formatHours(r.totalMinutes)}</td></tr>`;
      });
      html += `</tbody></table>`;
    } else {
      const m = members.find(x => x.user_id === memberFilter);
      const dateMap = grouped.get(memberFilter) || new Map();
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
    html += `</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `office_attendance_${month}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const monthLabel = format(parseISO(`${month}-01`), 'MMMM yyyy');
    let body = '';
    if (memberFilter === 'all') {
      body = `<table><thead><tr><th>S.No</th><th>BSG ID</th><th>Name</th><th>Days</th><th>Total Hours</th></tr></thead><tbody>`
        + summary.map((r, i) => `<tr><td>${i+1}</td><td>${r.uid}</td><td>${r.name}</td><td>${r.daysPresent}</td><td>${formatHours(r.totalMinutes)}</td></tr>`).join('')
        + `</tbody></table>`;
    } else {
      const m = members.find(x => x.user_id === memberFilter);
      const dateMap = grouped.get(memberFilter) || new Map();
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
    const html = `<!DOCTYPE html><html><head><title>Office Attendance</title><style>
      body{font-family:Segoe UI,Arial;padding:30px;color:#1a1a1a}
      h1{color:#1a4d2e;margin:0} h2{color:#555;font-weight:normal;margin:4px 0 24px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th{background:#1a4d2e;color:#fff;padding:8px;text-align:left;font-size:12px}
      td{padding:8px;border-bottom:1px solid #eee;font-size:13px}
      tr:nth-child(even){background:#fafafa}
    </style></head><body>
      <h1>The Bharat Scouts &amp; Guides — Silver Oak University</h1>
      <h2>Office Attendance Report — ${monthLabel}</h2>
      ${body}
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
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

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : memberFilter === 'all' ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.No</TableHead><TableHead>BSG ID</TableHead><TableHead>Name</TableHead>
                  <TableHead>Days Present</TableHead><TableHead>Total Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No data for this month</TableCell></TableRow>
                ) : summary.map((r, i) => (
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
        <TableHeader>
          <TableRow><TableHead>Date</TableHead><TableHead>Sessions</TableHead><TableHead>Daily Hours</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
          ) : rows.map(([date, arr]) => (
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
