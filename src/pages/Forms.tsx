import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
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
  Users,
  Star,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  Plus,
  Settings,
  Edit,
} from 'lucide-react';
import { useCommitteeApplications, COMMITTEE_SKILLS, CreateApplicationData } from '@/hooks/useCommitteeApplications';
import { useCustomForms, FormField } from '@/hooks/useCustomForms';
import { useCommittee } from '@/hooks/useCommittee';
import { useApplicationTypeSettings } from '@/hooks/useApplicationTypeSettings';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

const APPLICATION_TYPES = [
  { value: 'core', label: 'Core Committee', description: 'Join the foundational team managing day-to-day activities' },
  { value: 'executive', label: 'Executive Committee', description: 'Take leadership roles in managing departments' },
  { value: 'institute_coordinator', label: 'Institute Coordinator', description: 'Represent and coordinate BSG at institute level' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'rating', label: 'Rating (1-5)' },
];

export default function Forms() {
  const { user, profile, isAdminOrCoordinator } = useAuth();
  const { applications, myApplications, isLoading: isLoadingApps, createApplication, reviewApplication, deleteApplication } = useCommitteeApplications();
  const { forms, submissions, mySubmissions, isLoading: isLoadingForms, createForm, updateForm, deleteForm, submitForm, reviewSubmission, deleteSubmission } = useCustomForms();
  const { departments } = useCommittee();
  const { members } = useMembers();
  const { settings: appTypeSettings, isLoading: isLoadingSettings, toggleSetting, isTypeActive } = useApplicationTypeSettings();

  const [activeTab, setActiveTab] = useState('apply');
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<typeof applications[0] | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Form state
  const [isCreateFormDialogOpen, setIsCreateFormDialogOpen] = useState(false);
  const [isEditFormDialogOpen, setIsEditFormDialogOpen] = useState(false);
  const [isFillFormDialogOpen, setIsFillFormDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<typeof forms[0] | null>(null);
  const [formResponses, setFormResponses] = useState<Record<string, any>>({});
  const [newFormData, setNewFormData] = useState({
    title: '',
    description: '',
    form_type: 'general',
    fields: [] as FormField[],
    visibility_type: 'everyone',
    assigned_member_ids: [] as string[],
  });
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    form_type: 'general',
    fields: [] as FormField[],
    is_active: true,
    visibility_type: 'everyone',
    assigned_member_ids: [] as string[],
  });
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [newField, setNewField] = useState<Partial<FormField>>({
    label: '',
    type: 'text',
    required: false,
    options: [],
  });
  const [editField, setEditField] = useState<Partial<FormField>>({
    label: '',
    type: 'text',
    required: false,
    options: [],
  });
  const [optionInput, setOptionInput] = useState('');
  const [editOptionInput, setEditOptionInput] = useState('');

  // Committee application form state
  const [formData, setFormData] = useState<CreateApplicationData>({
    application_type: 'core',
    interested_department_id: undefined,
    reason: '',
    skill_ratings: {},
  });

  // Initialize skill ratings when application type changes
  useEffect(() => {
    const skills = COMMITTEE_SKILLS[formData.application_type] || [];
    const newRatings: Record<string, number> = {};
    skills.forEach(skill => {
      newRatings[skill] = formData.skill_ratings[skill] || 3;
    });
    setFormData(prev => ({ ...prev, skill_ratings: newRatings }));
  }, [formData.application_type]);

  // Filter departments based on application type
  const filteredDepartments = useMemo(() => {
    return departments.filter(d => d.committee_type === formData.application_type);
  }, [departments, formData.application_type]);

  const handleSubmitApplication = async () => {
    if (!formData.reason.trim()) return;
    setIsSubmitting(true);
    const result = await createApplication(formData);
    setIsSubmitting(false);
    if (result.success) {
      setIsApplyDialogOpen(false);
      setFormData({ application_type: 'core', interested_department_id: undefined, reason: '', skill_ratings: {} });
    }
  };

  const handleReview = async (status: 'accepted' | 'rejected') => {
    if (!selectedApplication) return;
    setIsSubmitting(true);
    await reviewApplication(selectedApplication.id, status, reviewComment);
    setIsSubmitting(false);
    setIsReviewDialogOpen(false);
    setSelectedApplication(null);
    setReviewComment('');
  };

  // Custom form handlers
  const addField = () => {
    if (!newField.label?.trim()) return;
    const field: FormField = {
      id: `field_${Date.now()}`,
      label: newField.label.trim(),
      type: newField.type as FormField['type'],
      required: newField.required || false,
      options: newField.type === 'select' ? newField.options : undefined,
      placeholder: newField.placeholder,
    };
    setNewFormData(prev => ({ ...prev, fields: [...prev.fields, field] }));
    setNewField({ label: '', type: 'text', required: false, options: [] });
  };

  const removeField = (fieldId: string) => {
    setNewFormData(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== fieldId) }));
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setNewField(prev => ({ ...prev, options: [...(prev.options || []), optionInput.trim()] }));
    setOptionInput('');
  };

  const handleCreateForm = async () => {
    if (!newFormData.title.trim() || newFormData.fields.length === 0) return;
    setIsSubmitting(true);
    const result = await createForm(newFormData);
    setIsSubmitting(false);
    if (result.success) {
      setIsCreateFormDialogOpen(false);
      setNewFormData({ title: '', description: '', form_type: 'general', fields: [], visibility_type: 'everyone', assigned_member_ids: [] });
    }
  };

  // Edit form handlers
  const openEditFormDialog = (form: typeof forms[0]) => {
    setSelectedForm(form);
    setEditFormData({
      title: form.title,
      description: form.description || '',
      form_type: form.form_type,
      fields: [...form.fields],
      is_active: form.is_active,
      visibility_type: form.visibility_type || 'everyone',
      assigned_member_ids: form.assigned_member_ids || [],
    });
    setIsEditFormDialogOpen(true);
  };

  const addEditField = () => {
    if (!editField.label?.trim()) return;
    const field: FormField = {
      id: `field_${Date.now()}`,
      label: editField.label.trim(),
      type: editField.type as FormField['type'],
      required: editField.required || false,
      options: editField.type === 'select' ? editField.options : undefined,
      placeholder: editField.placeholder,
    };
    setEditFormData(prev => ({ ...prev, fields: [...prev.fields, field] }));
    setEditField({ label: '', type: 'text', required: false, options: [] });
  };

  const removeEditField = (fieldId: string) => {
    setEditFormData(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== fieldId) }));
  };

  const addEditOption = () => {
    if (!editOptionInput.trim()) return;
    setEditField(prev => ({ ...prev, options: [...(prev.options || []), editOptionInput.trim()] }));
    setEditOptionInput('');
  };

  const handleUpdateForm = async () => {
    if (!selectedForm || !editFormData.title.trim()) return;
    setIsSubmitting(true);
    const result = await updateForm(selectedForm.id, editFormData);
    setIsSubmitting(false);
    if (result.success) {
      setIsEditFormDialogOpen(false);
      setSelectedForm(null);
    }
  };

  const handleFillForm = async () => {
    if (!selectedForm) return;
    setIsSubmitting(true);
    const result = await submitForm(selectedForm.id, formResponses);
    setIsSubmitting(false);
    if (result.success) {
      setIsFillFormDialogOpen(false);
      setSelectedForm(null);
      setFormResponses({});
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'submitted':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'accepted':
      case 'approved':
        return <Badge className="gap-1 bg-emerald-600 text-white"><CheckCircle className="h-3 w-3" /> Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const currentSkills = COMMITTEE_SKILLS[formData.application_type] || [];
  const activeCustomForms = forms.filter(f => f.is_active);
   const activeApplicationTypes = APPLICATION_TYPES.filter(t => isTypeActive(t.value));
   const isLoading = isLoadingApps || isLoadingForms || isLoadingSettings;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Forms
            </h1>
            <p className="text-muted-foreground mt-1">
              Apply for committees or fill out custom forms
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsApplyDialogOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Committee Application
            </Button>
            {isAdminOrCoordinator && (
              <Button variant="outline" onClick={() => setIsCreateFormDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Form
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="apply" className="gap-2">
              <FileText className="h-4 w-4" />
              Forms
            </TabsTrigger>
            <TabsTrigger value="my-submissions" className="gap-2">
              <Send className="h-4 w-4" />
              My Submissions
            </TabsTrigger>
            {isAdminOrCoordinator && (
              <>
                <TabsTrigger value="manage-forms" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Manage Forms
                </TabsTrigger>
                <TabsTrigger value="all-submissions" className="gap-2">
                  <Users className="h-4 w-4" />
                  All Submissions
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Available Forms Tab */}
          <TabsContent value="apply" className="space-y-6">
            {/* Committee Application Cards */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Committee Applications</h3>
               {activeApplicationTypes.length === 0 ? (
                 <p className="text-center text-muted-foreground py-8">No committee applications available at this time</p>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {activeApplicationTypes.map(type => (
                  <Card key={type.value} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => {
                    setFormData(prev => ({ ...prev, application_type: type.value as any }));
                    setIsApplyDialogOpen(true);
                  }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{type.label}</CardTitle>
                      <CardDescription>{type.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm" className="w-full">
                        Apply Now
                      </Button>
                    </CardContent>
                  </Card>
                   ))}
                 </div>
               )}
            </div>

            {/* Custom Forms */}
            {activeCustomForms.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Other Forms</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activeCustomForms.map(form => (
                    <Card key={form.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => {
                      setSelectedForm(form);
                      setFormResponses({});
                      setIsFillFormDialogOpen(true);
                    }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{form.title}</CardTitle>
                        <CardDescription>{form.description || 'No description'}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground mb-2">{form.fields.length} fields</p>
                        <Button variant="outline" size="sm" className="w-full">
                          Fill Form
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* My Submissions Tab */}
          <TabsContent value="my-submissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Committee Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {myApplications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No committee applications submitted</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myApplications.map(app => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium capitalize">{app.application_type.replace('_', ' ')}</TableCell>
                          <TableCell>{app.department?.name || '-'}</TableCell>
                          <TableCell>{format(new Date(app.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon-sm" onClick={() => { setSelectedApplication(app); setIsViewDialogOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Form Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                {mySubmissions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No form submissions yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Form</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mySubmissions.map(sub => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.form?.title || 'Unknown Form'}</TableCell>
                          <TableCell>{format(new Date(sub.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin: Manage Forms Tab */}
          {isAdminOrCoordinator && (
            <TabsContent value="manage-forms" className="space-y-4">
               {/* Committee Application Types */}
               <Card>
                 <CardHeader>
                   <CardTitle>Committee Application Forms</CardTitle>
                   <CardDescription>Enable or disable committee application types</CardDescription>
                 </CardHeader>
                 <CardContent>
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>Application Type</TableHead>
                         <TableHead>Description</TableHead>
                         <TableHead>Status</TableHead>
                         <TableHead>Actions</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {APPLICATION_TYPES.map(type => {
                         const isActive = isTypeActive(type.value);
                         return (
                           <TableRow key={type.value}>
                             <TableCell className="font-medium">{type.label}</TableCell>
                             <TableCell className="text-muted-foreground">{type.description}</TableCell>
                             <TableCell>
                               <Badge variant={isActive ? 'default' : 'secondary'}>
                                 {isActive ? 'Active' : 'Inactive'}
                               </Badge>
                             </TableCell>
                             <TableCell>
                               <Button
                                 variant="ghost"
                                 size="icon-sm"
                                 onClick={() => toggleSetting(type.value)}
                                 title={isActive ? 'Deactivate' : 'Activate'}
                               >
                                 {isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                               </Button>
                             </TableCell>
                           </TableRow>
                         );
                       })}
                     </TableBody>
                   </Table>
                 </CardContent>
               </Card>
               
               {/* Custom Forms */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Custom Forms</CardTitle>
                      <CardDescription>Create and manage custom forms</CardDescription>
                    </div>
                    <Button onClick={() => setIsCreateFormDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Form
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {forms.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No custom forms created yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Fields</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {forms.map(form => (
                          <TableRow key={form.id}>
                            <TableCell className="font-medium">{form.title}</TableCell>
                            <TableCell>{form.fields.length} fields</TableCell>
                            <TableCell>
                              <Badge variant={form.is_active ? 'default' : 'secondary'}>
                                {form.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(form.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => openEditFormDialog(form)}
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
                                  className="text-destructive"
                                  onClick={() => deleteForm(form.id)}
                                  title="Delete form"
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

          {/* Admin: All Submissions Tab */}
          {isAdminOrCoordinator && (
            <TabsContent value="all-submissions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Committee Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : applications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No applications submitted</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Applicant</TableHead>
                          <TableHead>UID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applications.map(app => (
                          <TableRow key={app.id}>
                            <TableCell className="font-medium">{app.profile?.first_name} {app.profile?.last_name}</TableCell>
                            <TableCell>{app.profile?.uid}</TableCell>
                            <TableCell className="capitalize">{app.application_type.replace('_', ' ')}</TableCell>
                            <TableCell>{app.department?.name || '-'}</TableCell>
                            <TableCell>{getStatusBadge(app.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon-sm" onClick={() => { setSelectedApplication(app); setIsViewDialogOpen(true); }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {app.status === 'pending' && (
                                  <Button variant="ghost" size="icon-sm" onClick={() => { setSelectedApplication(app); setIsReviewDialogOpen(true); }}>
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => deleteApplication(app.id)}>
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

              <Card>
                <CardHeader>
                  <CardTitle>Custom Form Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  {submissions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No form submissions yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Form</TableHead>
                          <TableHead>Submitted By</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map(sub => (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">{sub.form?.title || 'Unknown'}</TableCell>
                            <TableCell>{sub.profile?.first_name} {sub.profile?.last_name}</TableCell>
                            <TableCell>{format(new Date(sub.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell>{getStatusBadge(sub.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {sub.status === 'submitted' && (
                                  <>
                                    <Button variant="ghost" size="icon-sm" onClick={() => reviewSubmission(sub.id, 'approved')}>
                                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon-sm" onClick={() => reviewSubmission(sub.id, 'rejected')}>
                                      <XCircle className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                                <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => deleteSubmission(sub.id)}>
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

        {/* Committee Application Dialog */}
        <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Committee Application Form</DialogTitle>
              <DialogDescription>Fill in your details and submit your application</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Your Information (Auto-filled)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div><Label className="text-xs text-muted-foreground">Name</Label><p className="font-medium">{profile?.first_name} {profile?.last_name}</p></div>
                  <div><Label className="text-xs text-muted-foreground">UID</Label><p className="font-medium">{profile?.uid}</p></div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>Committee Type *</Label>
                <Select value={formData.application_type} onValueChange={(v) => setFormData(prev => ({ ...prev, application_type: v as any, interested_department_id: undefined }))}>
                  <SelectTrigger><SelectValue placeholder="Select committee type" /></SelectTrigger>
                  <SelectContent>
                    {APPLICATION_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {filteredDepartments.length > 0 && (
                <div className="space-y-2">
                  <Label>Interested Department</Label>
                  <Select value={formData.interested_department_id || '__none__'} onValueChange={(v) => setFormData(prev => ({ ...prev, interested_department_id: v === '__none__' ? undefined : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select department (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No preference</SelectItem>
                      {filteredDepartments.map(dept => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Why do you want to join? *</Label>
                <Textarea value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))} placeholder="Describe your motivation..." rows={5} />
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2"><Star className="h-4 w-4" />Rate Your Skills (1-5)</Label>
                {currentSkills.map(skill => (
                  <div key={skill} className="space-y-2">
                    <div className="flex justify-between"><span className="text-sm">{skill}</span><span className="text-sm font-medium">{formData.skill_ratings[skill] || 3}</span></div>
                    <Slider value={[formData.skill_ratings[skill] || 3]} min={1} max={5} step={1} onValueChange={([v]) => setFormData(prev => ({ ...prev, skill_ratings: { ...prev.skill_ratings, [skill]: v } }))} />
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitApplication} disabled={isSubmitting || !formData.reason.trim()}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Application Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><Label className="text-muted-foreground">Type</Label><p className="capitalize font-medium">{selectedApplication.application_type.replace('_', ' ')}</p></div>
                  <div><Label className="text-muted-foreground">Status</Label><div className="mt-1">{getStatusBadge(selectedApplication.status)}</div></div>
                  <div><Label className="text-muted-foreground">Submitted</Label><p>{format(new Date(selectedApplication.created_at), 'MMM d, yyyy')}</p></div>
                  <div><Label className="text-muted-foreground">Department</Label><p>{selectedApplication.department?.name || 'None'}</p></div>
                </div>
                <div><Label className="text-muted-foreground">Reason</Label><p className="mt-1 text-sm whitespace-pre-wrap">{selectedApplication.reason}</p></div>
                {selectedApplication.admin_comment && <div className="p-3 bg-muted rounded-lg"><Label className="text-muted-foreground">Admin Comment</Label><p className="mt-1 text-sm">{selectedApplication.admin_comment}</p></div>}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Review Application</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Comment (optional)</Label><Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Add a comment..." rows={3} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleReview('rejected')} disabled={isSubmitting}><XCircle className="h-4 w-4 mr-2" />Reject</Button>
              <Button onClick={() => handleReview('accepted')} disabled={isSubmitting}><CheckCircle className="h-4 w-4 mr-2" />Accept</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Form Dialog */}
        <Dialog open={isCreateFormDialogOpen} onOpenChange={setIsCreateFormDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Form</DialogTitle>
              <DialogDescription>Build a custom form with various field types</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Form Title *</Label>
                <Input value={newFormData.title} onChange={(e) => setNewFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., Feedback Form" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={newFormData.description} onChange={(e) => setNewFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe the form purpose..." rows={2} />
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <Label>Add Field</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Field Label *</Label>
                    <Input value={newField.label} onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))} placeholder="e.g., Full Name" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Field Type</Label>
                    <Select value={newField.type} onValueChange={(v) => setNewField(prev => ({ ...prev, type: v as FormField['type'], options: [] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {newField.type === 'select' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Options</Label>
                    <div className="flex gap-2">
                      <Input value={optionInput} onChange={(e) => setOptionInput(e.target.value)} placeholder="Add option" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())} />
                      <Button type="button" size="sm" onClick={addOption}>Add</Button>
                    </div>
                    {newField.options && newField.options.length > 0 && (
                      <div className="flex flex-wrap gap-1">{newField.options.map((opt, i) => <Badge key={i} variant="secondary">{opt}</Badge>)}</div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox id="required" checked={newField.required} onCheckedChange={(c) => setNewField(prev => ({ ...prev, required: c === true }))} />
                  <Label htmlFor="required" className="text-sm">Required field</Label>
                </div>
                <Button type="button" size="sm" onClick={addField} disabled={!newField.label?.trim()}><Plus className="h-4 w-4 mr-2" />Add Field</Button>
              </div>

              {newFormData.fields.length > 0 && (
                <div className="space-y-2">
                  <Label>Form Fields ({newFormData.fields.length})</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {newFormData.fields.map((field, idx) => (
                      <div key={field.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{idx + 1}. {field.label}</span>
                          <Badge variant="outline" className="text-xs">{field.type}</Badge>
                          {field.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                        </div>
                        <Button variant="ghost" size="icon-sm" onClick={() => removeField(field.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateFormDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateForm} disabled={isSubmitting || !newFormData.title.trim() || newFormData.fields.length === 0}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}Create Form
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Form Dialog */}
        <Dialog open={isEditFormDialogOpen} onOpenChange={setIsEditFormDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Form</DialogTitle>
              <DialogDescription>Update form details and fields</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Form Title *</Label>
                  <Input value={editFormData.title} onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Form Type</Label>
                  <Select value={editFormData.form_type} onValueChange={(v) => setEditFormData(prev => ({ ...prev, form_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="registration">Registration</SelectItem>
                      <SelectItem value="survey">Survey</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editFormData.description} onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox checked={editFormData.is_active} onCheckedChange={(c) => setEditFormData(prev => ({ ...prev, is_active: c === true }))} />
                <Label>Active (visible to members)</Label>
              </div>

              {/* Existing Fields */}
              <div className="space-y-2">
                <Label>Current Fields ({editFormData.fields.length})</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {editFormData.fields.map((field, index) => (
                    <div key={field.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{field.type}</Badge>
                        <span className="text-sm">{field.label}</span>
                        {field.required && <span className="text-xs text-destructive">*</span>}
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => removeEditField(field.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Field */}
              <div className="border rounded-lg p-4 space-y-3">
                <Label className="text-sm font-medium">Add New Field</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Field label" value={editField.label || ''} onChange={(e) => setEditField(prev => ({ ...prev, label: e.target.value }))} />
                  <Select value={editField.type} onValueChange={(v) => setEditField(prev => ({ ...prev, type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {editField.type === 'select' && (
                  <div className="flex gap-2">
                    <Input placeholder="Add option" value={editOptionInput} onChange={(e) => setEditOptionInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEditOption())} />
                    <Button type="button" variant="outline" size="sm" onClick={addEditOption}>Add</Button>
                  </div>
                )}
                {editField.type === 'select' && editField.options && editField.options.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {editField.options.map((opt, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{opt}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={editField.required} onCheckedChange={(c) => setEditField(prev => ({ ...prev, required: c === true }))} />
                    <Label className="text-sm">Required</Label>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addEditField} disabled={!editField.label?.trim()}>
                    <Plus className="h-3 w-3 mr-1" /> Add Field
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditFormDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateForm} disabled={isSubmitting || !editFormData.title.trim()}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fill Custom Form Dialog */}
        <Dialog open={isFillFormDialogOpen} onOpenChange={setIsFillFormDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedForm?.title}</DialogTitle>
              <DialogDescription>{selectedForm?.description || 'Please fill out the form below'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Card className="bg-muted/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Your Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div><Label className="text-xs text-muted-foreground">Name</Label><p className="font-medium">{profile?.first_name} {profile?.last_name}</p></div>
                  <div><Label className="text-xs text-muted-foreground">UID</Label><p className="font-medium">{profile?.uid}</p></div>
                </CardContent>
              </Card>

              {selectedForm?.fields.map(field => (
                <div key={field.id} className="space-y-2">
                  <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                  {field.type === 'text' && (
                    <Input value={formResponses[field.id] || ''} onChange={(e) => setFormResponses(prev => ({ ...prev, [field.id]: e.target.value }))} placeholder={field.placeholder} />
                  )}
                  {field.type === 'textarea' && (
                    <Textarea value={formResponses[field.id] || ''} onChange={(e) => setFormResponses(prev => ({ ...prev, [field.id]: e.target.value }))} placeholder={field.placeholder} rows={3} />
                  )}
                  {field.type === 'number' && (
                    <Input type="number" value={formResponses[field.id] || ''} onChange={(e) => setFormResponses(prev => ({ ...prev, [field.id]: e.target.value }))} />
                  )}
                  {field.type === 'date' && (
                    <Input type="date" value={formResponses[field.id] || ''} onChange={(e) => setFormResponses(prev => ({ ...prev, [field.id]: e.target.value }))} />
                  )}
                  {field.type === 'select' && field.options && (
                    <Select value={formResponses[field.id] || ''} onValueChange={(v) => setFormResponses(prev => ({ ...prev, [field.id]: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                      <SelectContent>{field.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {field.type === 'checkbox' && (
                    <div className="flex items-center gap-2">
                      <Checkbox checked={formResponses[field.id] || false} onCheckedChange={(c) => setFormResponses(prev => ({ ...prev, [field.id]: c === true }))} />
                      <span className="text-sm">Yes</span>
                    </div>
                  )}
                  {field.type === 'rating' && (
                    <div className="space-y-2">
                      <Slider value={[formResponses[field.id] || 3]} min={1} max={5} step={1} onValueChange={([v]) => setFormResponses(prev => ({ ...prev, [field.id]: v }))} />
                      <div className="flex justify-between text-xs text-muted-foreground"><span>1</span><span>{formResponses[field.id] || 3}</span><span>5</span></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFillFormDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleFillForm} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
