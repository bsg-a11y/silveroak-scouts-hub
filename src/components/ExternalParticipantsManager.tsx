import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Trash2, Search, Download, FileSpreadsheet, FileText, Upload, ChevronDown, Eye, Users, Loader2 } from 'lucide-react';
import { useExternalParticipants, ExternalParticipant } from '@/hooks/useExternalParticipants';
import { COLLEGE_DEPARTMENTS } from '@/lib/collegeDepartments';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { DocumentPreviewDialog } from '@/components/DocumentPreviewDialog';

const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const collegeNames = Object.keys(COLLEGE_DEPARTMENTS);

interface Props {
  activityId?: string;
  meetingId?: string;
  eventName?: string;
  eventType: 'activity' | 'meeting';
  memberAttendance?: { name: string; uid: string; status: string }[];
}

export function ExternalParticipantsManager({ activityId, meetingId, eventName, eventType, memberAttendance = [] }: Props) {
  const { participants, isLoading, addParticipant, deleteParticipant, uploadPdf } = useExternalParticipants(activityId, meetingId);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCollege, setFilterCollege] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'members' | 'non-members'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formEnrollment, setFormEnrollment] = useState('');
  const [formCollege, setFormCollege] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formSemester, setFormSemester] = useState('');

  const departments = formCollege ? (COLLEGE_DEPARTMENTS[formCollege] || []) : [];

  const nonPdfParticipants = participants.filter(p => !p.pdf_url);
  const pdfUploads = participants.filter(p => !!p.pdf_url);

  const filteredNonMembers = useMemo(() => {
    let list = nonPdfParticipants;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.enrollment_number && p.enrollment_number.toLowerCase().includes(q))
      );
    }
    if (filterCollege && filterCollege !== 'all') {
      list = list.filter(p => p.college_name === filterCollege);
    }
    return list;
  }, [nonPdfParticipants, searchQuery, filterCollege]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return memberAttendance;
    const q = searchQuery.toLowerCase();
    return memberAttendance.filter(m =>
      m.name.toLowerCase().includes(q) || m.uid.toLowerCase().includes(q)
    );
  }, [memberAttendance, searchQuery]);

  const handleAdd = async () => {
    if (!formName.trim()) return;
    await addParticipant.mutateAsync({
      name: formName,
      enrollment_number: formEnrollment || undefined,
      college_name: formCollege || undefined,
      department: formDepartment || undefined,
      semester: formSemester ? parseInt(formSemester) : undefined,
      activity_id: activityId,
      meeting_id: meetingId,
    });
    setFormName('');
    setFormEnrollment('');
    setFormCollege('');
    setFormDepartment('');
    setFormSemester('');
    setIsAddOpen(false);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    await uploadPdf(file, activityId, meetingId);
    setIsUploading(false);
    e.target.value = '';
  };

  const handlePreviewPdf = async (pdfPath: string, title: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(pdfPath, 3600);
    if (data?.signedUrl) {
      setPreviewUrl(data.signedUrl);
      setPreviewTitle(title);
    }
  };

  // Combined data for export
  const getCombinedData = () => {
    const members = filteredMembers.map(m => ({
      type: 'Member',
      name: m.name,
      id: m.uid,
      college: '-',
      department: '-',
      semester: '-',
      enrollment: '-',
      status: m.status,
    }));
    const nonMembers = filteredNonMembers.map(p => ({
      type: 'Non-Member',
      name: p.name,
      id: '-',
      college: p.college_name || '-',
      department: p.department || '-',
      semester: p.semester?.toString() || '-',
      enrollment: p.enrollment_number || '-',
      status: 'present',
    }));
    if (viewMode === 'members') return members;
    if (viewMode === 'non-members') return nonMembers;
    return [...members, ...nonMembers];
  };

  const exportExcel = () => {
    const data = getCombinedData();
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        <h2>${eventName || 'Event'} - Participant List (${viewMode === 'all' ? 'Combined' : viewMode === 'members' ? 'Members Only' : 'Non-Members Only'})</h2>
        <table border="1">
          <thead><tr>
            <th>S.No</th><th>Type</th><th>Name</th><th>BSG ID / Enrollment</th><th>College</th><th>Department</th><th>Semester</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${data.map((r, i) => `<tr>
              <td>${i + 1}</td><td>${r.type}</td><td>${r.name}</td>
              <td>${r.type === 'Member' ? r.id : r.enrollment}</td>
              <td>${r.college}</td><td>${r.department}</td><td>${r.semester}</td><td>${r.status}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <p><strong>Total:</strong> ${data.length}</p>
      </body></html>
    `;
    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participants_${viewMode}_${Date.now()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const data = getCombinedData();
    const printContent = `
      <!DOCTYPE html><html><head><title>Participant List</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1a4d2e; }
        .header h1 { color: #1a4d2e; font-size: 22px; margin-bottom: 4px; }
        .header h2 { color: #555; font-size: 14px; font-weight: normal; }
        .info { background: #f8faf8; border: 1px solid #e0e8e0; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
        .stats-row { display: flex; gap: 16px; margin-bottom: 20px; }
        .stat-box { flex: 1; text-align: center; padding: 10px; border-radius: 8px; background: #e8f0fe; }
        .stat-box .num { font-size: 24px; font-weight: bold; color: #1a4d2e; }
        .stat-box .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #1a4d2e; color: white; padding: 8px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) { background: #fafafa; }
        .type-member { color: #166534; font-weight: 600; }
        .type-non { color: #9333ea; font-weight: 600; }
        .footer { margin-top: 24px; text-align: center; color: #999; font-size: 10px; border-top: 1px solid #eee; padding-top: 12px; }
        @media print { body { padding: 15px; } }
      </style></head><body>
        <div class="header">
          <h1>The Bharat Scouts & Guides</h1>
          <h2>Silver Oak University — Participant List</h2>
        </div>
        <div class="info">
          <strong>${eventName || 'Event'}</strong> • ${viewMode === 'all' ? 'Combined (Members + Non-Members)' : viewMode === 'members' ? 'Members Only' : 'Non-Members Only'}
          <br/><small>Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</small>
        </div>
        <div class="stats-row">
          <div class="stat-box"><div class="num">${data.length}</div><div class="label">Total</div></div>
          <div class="stat-box"><div class="num">${data.filter(d => d.type === 'Member').length}</div><div class="label">Members</div></div>
          <div class="stat-box"><div class="num">${data.filter(d => d.type === 'Non-Member').length}</div><div class="label">Non-Members</div></div>
        </div>
        <table>
          <thead><tr><th>S.No</th><th>Type</th><th>Name</th><th>BSG ID / Enrollment</th><th>College</th><th>Department</th><th>Sem</th><th>Status</th></tr></thead>
          <tbody>
            ${data.map((r, i) => `<tr>
              <td>${i + 1}</td>
              <td class="${r.type === 'Member' ? 'type-member' : 'type-non'}">${r.type}</td>
              <td>${r.name}</td>
              <td>${r.type === 'Member' ? r.id : r.enrollment}</td>
              <td>${r.college}</td><td>${r.department}</td><td>${r.semester}</td><td>${r.status}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">BSG Silver Oak University Administration Portal</div>
      </body></html>
    `;
    const w = window.open('', '_blank');
    if (w) { w.document.write(printContent); w.document.close(); w.print(); }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              External (Non-Member) Participants
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={isUploading} />
                <Button variant="outline" size="sm" asChild disabled={isUploading}>
                  <span>
                    {isUploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                    Upload PDF
                  </span>
                </Button>
              </label>
              <Button size="sm" onClick={() => setIsAddOpen(true)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Add Participant
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or enrollment..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCollege} onValueChange={setFilterCollege}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filter by college" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Colleges</SelectItem>
                {collegeNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Participants</SelectItem>
                <SelectItem value="members">Members Only</SelectItem>
                <SelectItem value="non-members">Non-Members Only</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" /> Export <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportPDF}>
                  <FileText className="h-4 w-4 mr-2" /> Print / PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* PDF Uploads */}
          {pdfUploads.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Uploaded PDF Lists</p>
              {pdfUploads.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <span className="text-sm">{p.name}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handlePreviewPdf(p.pdf_url!, p.name)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteParticipant.mutate(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>BSG ID / Enrollment</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Sem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewMode !== 'non-members' && filteredMembers.map((m, i) => (
                    <TableRow key={`m-${i}`}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell><Badge variant="success" className="text-xs">Member</Badge></TableCell>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.uid}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'present' ? 'success' : 'danger'}>{m.status}</Badge>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                  {viewMode !== 'members' && filteredNonMembers.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell>{(viewMode !== 'non-members' ? filteredMembers.length : 0) + i + 1}</TableCell>
                      <TableCell><Badge className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-100">Non-Member</Badge></TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.enrollment_number || '-'}</TableCell>
                      <TableCell className="text-xs">{p.college_name || '-'}</TableCell>
                      <TableCell className="text-xs">{p.department || '-'}</TableCell>
                      <TableCell>{p.semester || '-'}</TableCell>
                      <TableCell><Badge variant="success">present</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteParticipant.mutate(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(viewMode === 'all' && filteredMembers.length === 0 && filteredNonMembers.length === 0) ||
                   (viewMode === 'members' && filteredMembers.length === 0) ||
                   (viewMode === 'non-members' && filteredNonMembers.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No participants found
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Participant Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add External Participant</DialogTitle>
            <DialogDescription>Add a non-member participant to this {eventType}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Enrollment Number</Label>
              <Input value={formEnrollment} onChange={e => setFormEnrollment(e.target.value)} placeholder="e.g. 2024SOCE001" />
            </div>
            <div className="space-y-2">
              <Label>College</Label>
              <Select value={formCollege} onValueChange={(v) => { setFormCollege(v); setFormDepartment(''); }}>
                <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
                <SelectContent>
                  {collegeNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {departments.length > 0 && (
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={formDepartment} onValueChange={setFormDepartment}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={formSemester} onValueChange={setFormSemester}>
                <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map(s => <SelectItem key={s} value={s}>Semester {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!formName.trim() || addParticipant.isPending}>
              {addParticipant.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Add Participant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview */}
      <DocumentPreviewDialog
        open={!!previewUrl}
        onOpenChange={(open) => { if (!open) setPreviewUrl(null); }}
        fileUrl={previewUrl || ''}
        title={previewTitle}
      />
    </div>
  );
}
