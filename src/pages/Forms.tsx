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
} from 'lucide-react';
import { useCommitteeApplications, COMMITTEE_SKILLS, CreateApplicationData } from '@/hooks/useCommitteeApplications';
import { useCommittee } from '@/hooks/useCommittee';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const APPLICATION_TYPES = [
  { value: 'core', label: 'Core Committee', description: 'Join the foundational team managing day-to-day activities' },
  { value: 'executive', label: 'Executive Committee', description: 'Take leadership roles in managing departments' },
  { value: 'institute_coordinator', label: 'Institute Coordinator', description: 'Represent and coordinate BSG at institute level' },
];

export default function Forms() {
  const { user, profile, isAdminOrCoordinator } = useAuth();
  const { applications, myApplications, isLoading, createApplication, reviewApplication, deleteApplication } = useCommitteeApplications();
  const { departments } = useCommittee();

  const [activeTab, setActiveTab] = useState('apply');
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<typeof applications[0] | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
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
    if (!formData.reason.trim()) {
      return;
    }

    setIsSubmitting(true);
    const result = await createApplication(formData);
    setIsSubmitting(false);

    if (result.success) {
      setIsApplyDialogOpen(false);
      setFormData({
        application_type: 'core',
        interested_department_id: undefined,
        reason: '',
        skill_ratings: {},
      });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'accepted':
        return <Badge className="gap-1 bg-emerald-600 text-white"><CheckCircle className="h-3 w-3" /> Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const currentSkills = COMMITTEE_SKILLS[formData.application_type] || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Committee Application Forms
            </h1>
            <p className="text-muted-foreground mt-1">
              Apply for committee positions or manage applications
            </p>
          </div>
          <Button onClick={() => setIsApplyDialogOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Apply Now
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="apply" className="gap-2">
              <FileText className="h-4 w-4" />
              My Applications
            </TabsTrigger>
            {isAdminOrCoordinator && (
              <TabsTrigger value="manage" className="gap-2">
                <Users className="h-4 w-4" />
                All Applications
              </TabsTrigger>
            )}
          </TabsList>

          {/* My Applications Tab */}
          <TabsContent value="apply" className="space-y-4">
            {/* Application Types Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {APPLICATION_TYPES.map(type => (
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
                      Apply for {type.label}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* My Applications List */}
            <Card>
              <CardHeader>
                <CardTitle>My Applications</CardTitle>
                <CardDescription>Track the status of your submitted applications</CardDescription>
              </CardHeader>
              <CardContent>
                {myApplications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    You haven't submitted any applications yet
                  </p>
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
                          <TableCell className="font-medium capitalize">
                            {app.application_type.replace('_', ' ')}
                          </TableCell>
                          <TableCell>{app.department?.name || '-'}</TableCell>
                          <TableCell>{format(new Date(app.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setSelectedApplication(app);
                                setIsViewDialogOpen(true);
                              }}
                            >
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
          </TabsContent>

          {/* Admin: All Applications Tab */}
          {isAdminOrCoordinator && (
            <TabsContent value="manage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Applications</CardTitle>
                  <CardDescription>Review and manage submitted applications</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : applications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No applications submitted yet
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Applicant</TableHead>
                          <TableHead>UID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applications.map(app => (
                          <TableRow key={app.id}>
                            <TableCell className="font-medium">
                              {app.profile?.first_name} {app.profile?.last_name}
                            </TableCell>
                            <TableCell>{app.profile?.uid}</TableCell>
                            <TableCell className="capitalize">
                              {app.application_type.replace('_', ' ')}
                            </TableCell>
                            <TableCell>{app.department?.name || '-'}</TableCell>
                            <TableCell>{format(new Date(app.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell>{getStatusBadge(app.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setIsViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {app.status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => {
                                      setSelectedApplication(app);
                                      setIsReviewDialogOpen(true);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-destructive"
                                  onClick={() => deleteApplication(app.id)}
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

        {/* Apply Dialog */}
        <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Committee Application Form</DialogTitle>
              <DialogDescription>
                Fill in your details and submit your application
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Auto-filled Member Info */}
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Your Information (Auto-filled)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <p className="font-medium">{profile?.first_name} {profile?.last_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">UID</Label>
                    <p className="font-medium">{profile?.uid}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Application Type */}
              <div className="space-y-2">
                <Label>Committee Type *</Label>
                <Select
                  value={formData.application_type}
                  onValueChange={(v) => setFormData(prev => ({ 
                    ...prev, 
                    application_type: v as any,
                    interested_department_id: undefined 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select committee type" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department Selection */}
              {filteredDepartments.length > 0 && (
                <div className="space-y-2">
                  <Label>Interested Department</Label>
                  <Select
                    value={formData.interested_department_id || '__none__'}
                    onValueChange={(v) => setFormData(prev => ({ 
                      ...prev, 
                      interested_department_id: v === '__none__' ? undefined : v 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No preference</SelectItem>
                      {filteredDepartments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label>Why do you want to join this committee? *</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Describe your motivation, relevant experience, and what you can contribute..."
                  rows={5}
                />
              </div>

              {/* Skill Ratings */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Rate Your Skills (1-5)
                </Label>
                <div className="space-y-4">
                  {currentSkills.map(skill => (
                    <div key={skill} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{skill}</span>
                        <span className="text-sm text-muted-foreground">
                          {formData.skill_ratings[skill] || 3}/5
                        </span>
                      </div>
                      <Slider
                        value={[formData.skill_ratings[skill] || 3]}
                        onValueChange={(v) => setFormData(prev => ({
                          ...prev,
                          skill_ratings: { ...prev.skill_ratings, [skill]: v[0] }
                        }))}
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitApplication} disabled={isSubmitting || !formData.reason.trim()}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Application Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
            </DialogHeader>

            {selectedApplication && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Applicant</Label>
                    <p className="font-medium">
                      {selectedApplication.profile?.first_name} {selectedApplication.profile?.last_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">UID</Label>
                    <p className="font-medium">{selectedApplication.profile?.uid}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Committee Type</Label>
                    <p className="font-medium capitalize">
                      {selectedApplication.application_type.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Department</Label>
                    <p className="font-medium">{selectedApplication.department?.name || 'No preference'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedApplication.status)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Submitted</Label>
                    <p className="font-medium">
                      {format(new Date(selectedApplication.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Reason for Joining</Label>
                  <p className="mt-1 text-sm bg-muted/50 p-3 rounded-lg">
                    {selectedApplication.reason}
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Skill Ratings</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {Object.entries(selectedApplication.skill_ratings as Record<string, number>).map(([skill, rating]) => (
                      <div key={skill} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                        <span className="text-sm">{skill}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i <= rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedApplication.admin_comment && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Admin Comment</Label>
                    <p className="mt-1 text-sm bg-muted/50 p-3 rounded-lg">
                      {selectedApplication.admin_comment}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Application</DialogTitle>
              <DialogDescription>
                Accept or reject this application for {selectedApplication?.profile?.first_name} {selectedApplication?.profile?.last_name}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Label>Comment (optional)</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Add a comment about your decision..."
                rows={3}
              />
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
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button 
                onClick={() => handleReview('accepted')}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
