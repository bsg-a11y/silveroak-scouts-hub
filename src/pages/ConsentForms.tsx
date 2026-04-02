import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
  Search,
  Edit,
  Plus,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { DragDropUpload } from '@/components/DragDropUpload';
import { DocumentPreviewDialog } from '@/components/DocumentPreviewDialog';
import { useConsentForms, CONSENT_FORM_TYPES } from '@/hooks/useConsentForms';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export default function ConsentForms() {
  const { isAdminOrCoordinator } = useAuth();
  const { forms, isLoading, uploadForm, updateForm, deleteForm, getDownloadUrl } = useConsentForms();

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<typeof forms[0] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    description: '',
    form_type: 'general',
  });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);

  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    form_type: 'general',
    is_active: true,
  });

  // Filter forms
  const filteredForms = useMemo(() => {
    return forms.filter(form => {
      if (filterType !== 'all' && form.form_type !== filterType) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = form.title.toLowerCase().includes(query);
        const matchesDesc = form.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    });
  }, [forms, filterType, searchQuery]);

  // Group forms by type
  const formsByType = useMemo(() => {
    const grouped: Record<string, typeof forms> = {};
    filteredForms.forEach(form => {
      if (!grouped[form.form_type]) {
        grouped[form.form_type] = [];
      }
      grouped[form.form_type].push(form);
    });
    return grouped;
  }, [filteredForms]);

  const getTypeLabel = (type: string) => {
    return CONSENT_FORM_TYPES.find(t => t.value === type)?.label || type;
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0 || !uploadFormData.title.trim()) return;

    setIsSubmitting(true);
    const result = await uploadForm({
      title: uploadFormData.title.trim(),
      description: uploadFormData.description.trim() || undefined,
      form_type: uploadFormData.form_type,
      file: uploadFiles[0],
    });
    setIsSubmitting(false);

    if (result.success) {
      setIsUploadDialogOpen(false);
      setUploadFormData({ title: '', description: '', form_type: 'general' });
      setUploadFiles([]);
      setUploadPreviews([]);
    }
  };

  const handleEdit = async () => {
    if (!selectedForm) return;
    setIsSubmitting(true);
    await updateForm(selectedForm.id, editFormData);
    setIsSubmitting(false);
    setIsEditDialogOpen(false);
    setSelectedForm(null);
  };

  const handleDownload = async (form: typeof forms[0]) => {
    const url = await getDownloadUrl(form.file_url);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.title}.${form.file_type}`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const openEditDialog = (form: typeof forms[0]) => {
    setSelectedForm(form);
    setEditFormData({
      title: form.title,
      description: form.description || '',
      form_type: form.form_type,
      is_active: form.is_active,
    });
    setIsEditDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Consent Forms
            </h1>
            <p className="text-muted-foreground mt-1">
              Download consent form templates for various activities
            </p>
          </div>
          {isAdminOrCoordinator && (
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Form
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search consent forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CONSENT_FORM_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Forms Display */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : Object.keys(formsByType).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No consent forms available</p>
              {isAdminOrCoordinator && (
                <Button variant="outline" className="mt-4" onClick={() => setIsUploadDialogOpen(true)}>
                  Upload First Form
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(formsByType).map(([type, typeForms]) => (
              <Card key={type}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{getTypeLabel(type)}</CardTitle>
                    <Badge variant="secondary">{typeForms.length} forms</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {typeForms.map(form => (
                      <div
                        key={form.id}
                        className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <h4 className="font-medium line-clamp-1">{form.title}</h4>
                          </div>
                          {!form.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        
                        {form.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {form.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(form.created_at), 'MMM d, yyyy')}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDownload(form)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {isAdminOrCoordinator && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => openEditDialog(form)}
                                  title="Edit form"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => updateForm(form.id, { is_active: !form.is_active })}
                                  title={form.is_active ? 'Deactivate' : 'Activate'}
                                >
                                  {form.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => deleteForm(form.id, form.file_url)}
                                  title="Delete form"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Upload Consent Form</DialogTitle>
              <DialogDescription>
                Add a new consent form template for members to download
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Form Title *</Label>
                <Input
                  value={uploadFormData.title}
                  onChange={(e) => setUploadFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Activity Participation Consent"
                />
              </div>

              <div className="space-y-2">
                <Label>Form Type *</Label>
                <Select
                  value={uploadFormData.form_type}
                  onValueChange={(v) => setUploadFormData(prev => ({ ...prev, form_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSENT_FORM_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={uploadFormData.description}
                  onChange={(e) => setUploadFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this consent form..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Form File * (PDF, Word)</Label>
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
                disabled={isSubmitting || uploadFiles.length === 0 || !uploadFormData.title.trim()}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Upload Form
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Consent Form</DialogTitle>
              <DialogDescription>
                Update form details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Form Title *</Label>
                <Input
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Form Type *</Label>
                <Select
                  value={editFormData.form_type}
                  onValueChange={(v) => setEditFormData(prev => ({ ...prev, form_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSENT_FORM_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={editFormData.is_active}
                  onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={isSubmitting || !editFormData.title.trim()}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
