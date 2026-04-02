import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  Users,
} from 'lucide-react';
import { DragDropUpload } from '@/components/DragDropUpload';
import { DocumentPreviewDialog } from '@/components/DocumentPreviewDialog';
import { useStudentReports } from '@/hooks/useStudentReports';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export default function StudentReports() {
  const { user, isAdminOrCoordinator } = useAuth();
  const { reports, myReports, isLoading, uploadReport, reviewReport, deleteReport, getReportDownloadUrl } = useStudentReports();
  const { activities } = useActivities();

  const [activeTab, setActiveTab] = useState('my-reports');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<typeof reports[0] | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActivity, setFilterActivity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [previewReport, setPreviewReport] = useState<typeof reports[0] | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [uploadForm, setUploadForm] = useState({
    activity_id: '',
    title: '',
    file: null as File | null,
  });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);

  // Get completed activities user has participated in
  const participatedActivities = useMemo(() => {
    return activities.filter(a => a.status === 'completed');
  }, [activities]);

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      if (filterActivity !== 'all' && report.activity_id !== filterActivity) return false;
      if (filterStatus !== 'all' && report.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = report.title.toLowerCase().includes(query);
        const matchesActivity = report.activity?.name.toLowerCase().includes(query);
        const matchesUser = report.profile?.uid.toLowerCase().includes(query) ||
          `${report.profile?.first_name} ${report.profile?.last_name}`.toLowerCase().includes(query);
        if (!matchesTitle && !matchesActivity && !matchesUser) return false;
      }
      return true;
    });
  }, [reports, filterActivity, filterStatus, searchQuery]);

  const handleUpload = async () => {
    if (uploadFiles.length === 0 || !uploadForm.activity_id || !uploadForm.title.trim()) return;

    setIsSubmitting(true);
    const result = await uploadReport(uploadForm.activity_id, uploadFiles[0], uploadForm.title.trim());
    setIsSubmitting(false);

    if (result.success) {
      setIsUploadDialogOpen(false);
      setUploadForm({ activity_id: '', title: '', file: null });
      setUploadFiles([]);
      setUploadPreviews([]);
    }
  };

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedReport) return;
    setIsSubmitting(true);
    await reviewReport(selectedReport.id, status, reviewComment);
    setIsSubmitting(false);
    setIsReviewDialogOpen(false);
    setSelectedReport(null);
    setReviewComment('');
  };

  const handleDownload = async (fileUrl: string, title: string) => {
    const url = await getReportDownloadUrl(fileUrl);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = title;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handlePreview = async (report: typeof reports[0]) => {
    setPreviewReport(report);
    const url = await getReportDownloadUrl(report.file_url);
    setPreviewUrl(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'approved':
        return <Badge className="gap-1 bg-emerald-600 text-white"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Student Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload and manage your activity reports
            </p>
          </div>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Report
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-reports" className="gap-2">
              <FileText className="h-4 w-4" />
              My Reports
            </TabsTrigger>
            {isAdminOrCoordinator && (
              <TabsTrigger value="all-reports" className="gap-2">
                <Users className="h-4 w-4" />
                All Reports
              </TabsTrigger>
            )}
          </TabsList>

          {/* My Reports Tab */}
          <TabsContent value="my-reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Activity Reports</CardTitle>
                <CardDescription>
                  Reports you've submitted for activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No reports uploaded yet</p>
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
                      Upload Your First Report
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myReports.map(report => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.title}</TableCell>
                          <TableCell>{report.activity?.name || 'Unknown'}</TableCell>
                          <TableCell>{format(new Date(report.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{getStatusBadge(report.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handlePreview(report)}
                                title="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDownload(report.file_url, report.title)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {report.status === 'submitted' && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => deleteReport(report.id, report.file_url)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin: All Reports Tab */}
          {isAdminOrCoordinator && (
            <TabsContent value="all-reports" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title, activity, or student..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterActivity} onValueChange={setFilterActivity}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by activity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    {activities.map(activity => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="submitted">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>All Student Reports</CardTitle>
                  <CardDescription>
                    Review and manage student-submitted reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredReports.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No reports found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Activity</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReports.map(report => (
                          <TableRow key={report.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{report.profile?.uid}</p>
                                <p className="text-xs text-muted-foreground">
                                  {report.profile?.first_name} {report.profile?.last_name}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{report.title}</TableCell>
                            <TableCell>{report.activity?.name || 'Unknown'}</TableCell>
                            <TableCell>{format(new Date(report.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell>{getStatusBadge(report.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDownload(report.file_url, report.title)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {report.status === 'submitted' && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => {
                                      setSelectedReport(report);
                                      setIsReviewDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => deleteReport(report.id, report.file_url)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Upload Dialog */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Upload Activity Report</DialogTitle>
              <DialogDescription>
                Submit your report for a completed activity
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Activity *</Label>
                <Select
                  value={uploadForm.activity_id}
                  onValueChange={(v) => setUploadForm(prev => ({ ...prev, activity_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {participatedActivities.map(activity => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.name} - {format(new Date(activity.activity_date), 'MMM d, yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Report Title *</Label>
                <Input
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Tree Plantation Activity Report"
                />
              </div>

              <div className="space-y-2">
                <Label>Report File * (PDF, Word)</Label>
                <DragDropUpload
                  accept=".pdf,.doc,.docx"
                  multiple={false}
                  files={uploadFiles}
                  onFilesChange={setUploadFiles}
                  previews={uploadPreviews}
                  onPreviewsChange={setUploadPreviews}
                  showPreviews={false}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isSubmitting || uploadFiles.length === 0 || !uploadForm.activity_id || !uploadForm.title.trim()}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Upload Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Report</DialogTitle>
              <DialogDescription>
                {selectedReport?.profile?.first_name} {selectedReport?.profile?.last_name} - {selectedReport?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p><strong>Activity:</strong> {selectedReport?.activity?.name}</p>
                <p><strong>Submitted:</strong> {selectedReport && format(new Date(selectedReport.created_at), 'MMM d, yyyy HH:mm')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedReport && handleDownload(selectedReport.file_url, selectedReport.title)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Admin Comment (optional)</Label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Add feedback for the student..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReview('rejected')}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reject
              </Button>
              <Button
                onClick={() => handleReview('approved')}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
