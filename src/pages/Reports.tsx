import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Trash2,
  Loader2,
  Search,
  Download,
  Calendar,
  File,
  X,
} from 'lucide-react';
import { useActivityMedia } from '@/hooks/useActivityMedia';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentPreviewDialog } from '@/components/DocumentPreviewDialog';
import { format } from 'date-fns';

const REPORT_TYPES = [
  { value: 'report', label: 'Activity Report' },
  { value: 'summary', label: 'Summary' },
  { value: 'documentation', label: 'Documentation' },
];

export default function Reports() {
  const { isAdminOrCoordinator } = useAuth();
  const { reports, isLoading, uploadMultipleReports, deleteReport, getReportSignedUrl } = useActivityMedia();
  const { activities } = useActivities();

  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadForm, setUploadForm] = useState({
    activity_id: '',
    title: '',
    report_type: 'report' as 'report' | 'summary' | 'documentation',
  });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<typeof reports[0] | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      if (selectedActivity !== 'all' && report.activity_id !== selectedActivity) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const activityName = getActivityName(report.activity_id).toLowerCase();
        return report.title.toLowerCase().includes(query) || activityName.includes(query);
      }
      return true;
    });
  }, [reports, selectedActivity, searchQuery]);

  const getActivityName = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    return activity?.name || 'Unknown Activity';
  };

  const getActivityDate = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    return activity?.activity_date ? format(new Date(activity.activity_date), 'MMM d, yyyy') : '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !uploadForm.activity_id || !uploadForm.title) return;

    setIsUploading(true);
    const result = await uploadMultipleReports(
      uploadForm.activity_id,
      selectedFiles,
      uploadForm.title,
      uploadForm.report_type
    );
    setIsUploading(false);

    if (result.success) {
      setIsUploadDialogOpen(false);
      setSelectedFiles([]);
      setUploadForm({ activity_id: '', title: '', report_type: 'report' });
    }
  };

  const handleDownload = async (report: typeof reports[0]) => {
    setDownloadingId(report.id);
    const signedUrl = await getReportSignedUrl(report.file_url);
    setDownloadingId(null);

    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  const handlePreview = async (report: typeof reports[0]) => {
    setPreviewReport(report);
    const signedUrl = await getReportSignedUrl(report.file_url);
    setPreviewUrl(signedUrl);
  };

  const getFileIcon = (fileType: string | null) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'docx':
      case 'doc':
        return <File className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Get completed activities for upload
  const completedActivities = activities.filter(a => a.status === 'completed');

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Activity Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              View and download activity reports and documentation
            </p>
          </div>
          {isAdminOrCoordinator && (
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Reports
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedActivity} onValueChange={setSelectedActivity}>
            <SelectTrigger className="w-full sm:w-[250px]">
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
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>
              {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No reports found</p>
                {isAdminOrCoordinator && (
                  <Button variant="outline" className="mt-4" onClick={() => setIsUploadDialogOpen(true)}>
                    Upload First Report
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map(report => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(report.file_type)}
                          <span className="font-medium">{report.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getActivityName(report.activity_id)}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {getActivityDate(report.activity_id)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {report.report_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(report.created_at), 'MMM d, yyyy')}
                      </TableCell>
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
                            onClick={() => handleDownload(report)}
                            disabled={downloadingId === report.id}
                          >
                            {downloadingId === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          {isAdminOrCoordinator && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
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

        {/* Upload Dialog - Multiple Files */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Reports</DialogTitle>
              <DialogDescription>
                Upload multiple report documents for an activity
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
                    {completedActivities.map(activity => (
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
                  placeholder="e.g., Blood Donation Camp Report"
                />
                {selectedFiles.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Title will be numbered for multiple files
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Report Type *</Label>
                <Select
                  value={uploadForm.report_type}
                  onValueChange={(v) => setUploadForm(prev => ({ ...prev, report_type: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Files * (Select multiple)</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  multiple
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  Accepted formats: PDF, DOC, DOCX
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files ({selectedFiles.length})</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {getFileIcon(file.name.split('.').pop() || null)}
                          <span className="text-sm truncate">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={isUploading || selectedFiles.length === 0 || !uploadForm.activity_id || !uploadForm.title}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
