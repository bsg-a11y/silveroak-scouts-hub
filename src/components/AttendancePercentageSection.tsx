import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, Download, FileText, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Member } from '@/hooks/useMembers';

type MetricType = 'combined' | 'activities' | 'meetings';
type Operator = '>' | '>=' | '<' | '<=' | '=';

interface Row {
  user_id: string;
  uid: string;
  name: string;
  college: string;
  department: string;
  activityPct: number;
  meetingPct: number;
  combinedPct: number;
  activityPresent: number;
  meetingPresent: number;
}

interface Props { members: Member[] }

export function AttendancePercentageSection({ members }: Props) {
  const [metric, setMetric] = useState<MetricType>('combined');
  const [operator, setOperator] = useState<Operator>('>');
  const [threshold, setThreshold] = useState<number>(50);
  const [isLoading, setIsLoading] = useState(true);
  const [totalActivities, setTotalActivities] = useState(0);
  const [totalMeetings, setTotalMeetings] = useState(0);
  const [presence, setPresence] = useState<{ user_id: string; activity_id: string | null; meeting_id: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [{ count: act }, { count: mt }, { data: att }] = await Promise.all([
          supabase.from('activities').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('meetings').select('*', { count: 'exact', head: true }),
          supabase.from('attendance').select('user_id, activity_id, meeting_id, status').eq('status', 'present'),
        ]);
        setTotalActivities(act || 0);
        setTotalMeetings(mt || 0);
        setPresence((att || []).map(r => ({ user_id: r.user_id, activity_id: r.activity_id, meeting_id: r.meeting_id })));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const rows: Row[] = useMemo(() => {
    // Build per-user unique sets
    const map = new Map<string, { acts: Set<string>; meets: Set<string> }>();
    for (const r of presence) {
      if (!map.has(r.user_id)) map.set(r.user_id, { acts: new Set(), meets: new Set() });
      const e = map.get(r.user_id)!;
      if (r.activity_id) e.acts.add(r.activity_id);
      if (r.meeting_id) e.meets.add(r.meeting_id);
    }
    const totalEvents = totalActivities + totalMeetings;
    return members.filter(m => m.status === 'active').map(m => {
      const e = map.get(m.user_id);
      const aP = e?.acts.size || 0;
      const mP = e?.meets.size || 0;
      const aPct = totalActivities > 0 ? Math.round((aP / totalActivities) * 100) : 0;
      const mPct = totalMeetings > 0 ? Math.round((mP / totalMeetings) * 100) : 0;
      const cPct = totalEvents > 0 ? Math.round(((aP + mP) / totalEvents) * 100) : 0;
      return {
        user_id: m.user_id, uid: m.uid,
        name: `${m.first_name} ${m.last_name}`,
        college: m.college_name || '-',
        department: m.academic_department || '-',
        activityPct: aPct, meetingPct: mPct, combinedPct: cPct,
        activityPresent: aP, meetingPresent: mP,
      };
    });
  }, [members, presence, totalActivities, totalMeetings]);

  const matches = useMemo(() => {
    const cmp = (val: number) => {
      switch (operator) {
        case '>': return val > threshold;
        case '>=': return val >= threshold;
        case '<': return val < threshold;
        case '<=': return val <= threshold;
        case '=': return val === threshold;
      }
    };
    return rows.filter(r => {
      const v = metric === 'activities' ? r.activityPct : metric === 'meetings' ? r.meetingPct : r.combinedPct;
      return cmp(v);
    }).sort((a, b) => {
      const av = metric === 'activities' ? a.activityPct : metric === 'meetings' ? a.meetingPct : a.combinedPct;
      const bv = metric === 'activities' ? b.activityPct : metric === 'meetings' ? b.meetingPct : b.combinedPct;
      return bv - av;
    });
  }, [rows, metric, operator, threshold]);

  const filterDescription = `${metric.charAt(0).toUpperCase() + metric.slice(1)} attendance ${operator} ${threshold}%`;

  const exportExcel = () => {
    let html = `<html><body><h2>Attendance Filter Report</h2><p><strong>Filter:</strong> ${filterDescription}</p>
      <table border="1"><thead><tr>
        <th>S.No</th><th>BSG ID</th><th>Name</th><th>College</th><th>Department</th>
        <th>Activities %</th><th>Meetings %</th><th>Combined %</th>
      </tr></thead><tbody>`;
    matches.forEach((r, i) => {
      html += `<tr><td>${i+1}</td><td>${r.uid}</td><td>${r.name}</td><td>${r.college}</td><td>${r.department}</td>
        <td>${r.activityPct}%</td><td>${r.meetingPct}%</td><td>${r.combinedPct}%</td></tr>`;
    });
    html += `</tbody></table><p>Total: ${matches.length} members</p></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance_filter_${Date.now()}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const html = `<!DOCTYPE html><html><head><title>Attendance Filter</title><style>
      body{font-family:Segoe UI,Arial;padding:30px;color:#1a1a1a}
      h1{color:#1a4d2e;margin:0} h2{color:#555;font-weight:normal;margin:6px 0 24px}
      .filter{background:#f0f7f0;padding:12px;border-left:4px solid #1a4d2e;margin-bottom:16px;font-size:14px}
      table{width:100%;border-collapse:collapse}
      th{background:#1a4d2e;color:#fff;padding:8px;text-align:left;font-size:12px}
      td{padding:8px;border-bottom:1px solid #eee;font-size:13px}
      tr:nth-child(even){background:#fafafa}
      .footer{margin-top:24px;text-align:center;color:#999;font-size:11px}
    </style></head><body>
      <h1>The Bharat Scouts &amp; Guides — Silver Oak University</h1>
      <h2>Attendance Filter Report</h2>
      <div class="filter"><strong>Filter:</strong> ${filterDescription} • <strong>Matching:</strong> ${matches.length} members</div>
      <table><thead><tr>
        <th>S.No</th><th>BSG ID</th><th>Name</th><th>College</th><th>Department</th>
        <th>Activities %</th><th>Meetings %</th><th>Combined %</th>
      </tr></thead><tbody>
        ${matches.map((r,i) => `<tr><td>${i+1}</td><td>${r.uid}</td><td>${r.name}</td><td>${r.college}</td><td>${r.department}</td><td>${r.activityPct}%</td><td>${r.meetingPct}%</td><td>${r.combinedPct}%</td></tr>`).join('')}
      </tbody></table>
      <div class="footer">Generated on ${new Date().toLocaleString()} • BSG SOU</div>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2"><Filter className="h-5 w-5" /> Attendance Percentage Filter</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={matches.length === 0}>
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
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Metric</label>
            <Select value={metric} onValueChange={(v) => setMetric(v as MetricType)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="combined">Combined</SelectItem>
                <SelectItem value="activities">Activities</SelectItem>
                <SelectItem value="meetings">Meetings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Operator</label>
            <Select value={operator} onValueChange={(v) => setOperator(v as Operator)}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value=">">&gt;</SelectItem>
                <SelectItem value=">=">&ge;</SelectItem>
                <SelectItem value="<">&lt;</SelectItem>
                <SelectItem value="<=">&le;</SelectItem>
                <SelectItem value="=">=</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Threshold (%)</label>
            <Input type="number" min={0} max={100} value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-[120px]" />
          </div>
          <Badge variant="secondary" className="ml-auto">
            {matches.length} of {rows.length} members
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.No</TableHead><TableHead>BSG ID</TableHead><TableHead>Name</TableHead>
                  <TableHead>College</TableHead><TableHead>Department</TableHead>
                  <TableHead>Activities</TableHead><TableHead>Meetings</TableHead><TableHead>Combined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No members match this filter</TableCell></TableRow>
                ) : matches.map((r, i) => (
                  <TableRow key={r.user_id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{r.uid}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm">{r.college}</TableCell>
                    <TableCell className="text-sm">{r.department}</TableCell>
                    <TableCell><Badge variant="outline">{r.activityPct}%</Badge></TableCell>
                    <TableCell><Badge variant="outline">{r.meetingPct}%</Badge></TableCell>
                    <TableCell><Badge variant={r.combinedPct >= 75 ? 'success' : r.combinedPct >= 50 ? 'secondary' : 'danger'}>{r.combinedPct}%</Badge></TableCell>
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
