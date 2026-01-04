import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Award, Trash2, Search, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useCertificates } from '@/hooks/useCertificates';
import { useCertificateRequests } from '@/hooks/useCertificateRequests';
import { useMembers } from '@/hooks/useMembers';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { SecureDownloadButton } from '@/components/SecureDownloadButton';

export default function Certificates() {
  const { certificates, isLoading, createCertificate, deleteCertificate } = useCertificates();
  const { requests, isLoading: requestsLoading, createRequest, updateRequest } = useCertificateRequests();
  const { members } = useMembers();
  const { activities } = useActivities();
  const { isAdminOrCoordinator, user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewDialog, setReviewDialog] = useState<{ id: string; status: string } | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    event_name: '',
    user_id: '',
    issue_date: '',
    certificate_url: '',
  });
  const [requestData, setRequestData] = useState({
    activity_id: '',
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCertificate.mutateAsync(formData);
    setFormData({ name: '', event_name: '', user_id: '', issue_date: '', certificate_url: '' });
    setIsDialogOpen(false);
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestData.activity_id || !requestData.reason.trim()) return;
    await createRequest.mutateAsync(requestData);
    setRequestData({ activity_id: '', reason: '' });
    setIsRequestDialogOpen(false);
  };

  const handleReview = async () => {
    if (!reviewDialog) return;
    await updateRequest.mutateAsync({
      id: reviewDialog.id,
      status: reviewDialog.status,
      admin_comment: adminComment,
    });
    setReviewDialog(null);
    setAdminComment('');
  };

  const filteredCertificates = certificates.filter(cert =>
    cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.profile?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.profile?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.profile?.uid?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter to show only user's own certificates if not admin
  const displayCertificates = isAdminOrCoordinator 
    ? filteredCertificates 
    : filteredCertificates.filter(c => c.user_id === user?.id);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');
  const myRequests = requests.filter(r => r.user_id === user?.id);

  // Get completed activities for certificate request
  const completedActivities = activities.filter(a => a.status === 'completed');

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Certificates</h1>
            <p className="text-muted-foreground mt-1">Manage member certificates and achievements</p>
          </div>
          <div className="flex gap-2">
            {/* Request Certificate Button for non-admins */}
            {!isAdminOrCoordinator && (
              <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Request Certificate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Certificate</DialogTitle>
                    <DialogDescription>
                      Request a certificate for a completed activity
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleRequestSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Activity</Label>
                      <Select
                        value={requestData.activity_id}
                        onValueChange={(v) => setRequestData({ ...requestData, activity_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an activity" />
                        </SelectTrigger>
                        <SelectContent>
                          {completedActivities.map((activity) => (
                            <SelectItem key={activity.id} value={activity.id}>
                              {activity.name} - {format(new Date(activity.activity_date), 'MMM d, yyyy')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Reason for Request</Label>
                      <Textarea
                        value={requestData.reason}
                        onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
                        placeholder="Explain why you need this certificate..."
                        rows={3}
                        required
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setIsRequestDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createRequest.isPending || !requestData.activity_id}>
                        {createRequest.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Request'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {/* Issue Certificate Button for admins */}
            {isAdminOrCoordinator && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Issue Certificate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Issue New Certificate</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                      placeholder="Certificate Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                    <Input
                      placeholder="Event Name"
                      value={formData.event_name}
                      onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                      required
                    />
                    <Select
                      value={formData.user_id}
                      onValueChange={(v) => setFormData({ ...formData, user_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.user_id}>
                            {m.first_name} {m.last_name} ({m.uid})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                      required
                    />
                    <Input
                      placeholder="Certificate URL (optional)"
                      value={formData.certificate_url}
                      onChange={(e) => setFormData({ ...formData, certificate_url: e.target.value })}
                    />
                    <Button type="submit" className="w-full" disabled={createCertificate.isPending}>
                      {createCertificate.isPending ? 'Issuing...' : 'Issue Certificate'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search certificates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs for Certificates and Requests */}
        <Tabs defaultValue="certificates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="certificates">
              {isAdminOrCoordinator ? `Certificates (${certificates.length})` : `My Certificates (${displayCertificates.length})`}
            </TabsTrigger>
            {isAdminOrCoordinator ? (
              <TabsTrigger value="requests">
                Requests ({pendingRequests.length} pending)
              </TabsTrigger>
            ) : (
              <TabsTrigger value="my-requests">
                My Requests ({myRequests.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="certificates">
            {/* Certificates Grid */}
            {displayCertificates.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {searchQuery ? 'No certificates found matching your search' : 'No certificates issued yet'}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayCertificates.map((cert, index) => (
                  <Card 
                    key={cert.id} 
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-accent/10">
                          <Award className="h-6 w-6 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{cert.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{cert.event_name}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm">
                              <span className="text-muted-foreground">Issued to: </span>
                              <span className="font-medium">
                                {cert.profile?.first_name} {cert.profile?.last_name}
                              </span>
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">UID: </span>
                              <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
                                {cert.profile?.uid}
                              </code>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(cert.issue_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                        {cert.certificate_url && (
                          <SecureDownloadButton
                            url={cert.certificate_url}
                            filename={`${cert.name}.pdf`}
                            className="flex-1"
                          />
                        )}
                        {isAdminOrCoordinator && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => deleteCertificate.mutate(cert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Admin Requests Tab */}
          {isAdminOrCoordinator && (
            <TabsContent value="requests" className="space-y-4">
              {/* Pending Requests */}
              <h3 className="font-semibold text-foreground">Pending Requests</h3>
              {pendingRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No pending certificate requests
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {pendingRequests.map((req) => (
                    <Card key={req.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">
                                {req.profile?.first_name} {req.profile?.last_name}
                              </h4>
                              <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
                                {req.profile?.uid}
                              </code>
                              <Badge variant="warning">Pending</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Activity: {req.activity?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Reason: {req.reason}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Requested: {format(new Date(req.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => setReviewDialog({ id: req.id, status: 'approved' })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => setReviewDialog({ id: req.id, status: 'rejected' })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Processed Requests */}
              {processedRequests.length > 0 && (
                <>
                  <h3 className="font-semibold text-foreground mt-6">Processed Requests</h3>
                  <div className="grid gap-4">
                    {processedRequests.slice(0, 10).map((req) => (
                      <Card key={req.id} className="bg-muted/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">
                                  {req.profile?.first_name} {req.profile?.last_name}
                                </span>
                                <Badge variant={req.status === 'approved' ? 'success' : 'danger'}>
                                  {req.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {req.activity?.name}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          )}

          {/* Non-admin My Requests Tab */}
          {!isAdminOrCoordinator && (
            <TabsContent value="my-requests" className="space-y-4">
              {myRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>You haven't submitted any certificate requests yet.</p>
                    <Button variant="link" onClick={() => setIsRequestDialogOpen(true)}>
                      Request your first certificate
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {myRequests.map((req) => (
                    <Card key={req.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Award className="h-5 w-5 text-primary" />
                              <h4 className="font-medium">{req.activity?.name}</h4>
                              <Badge variant={
                                req.status === 'approved' ? 'success' : 
                                req.status === 'rejected' ? 'danger' : 'warning'
                              }>
                                {req.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Reason: {req.reason}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Requested: {format(new Date(req.created_at), 'MMM d, yyyy')}
                            </p>
                            {req.admin_comment && (
                              <div className="mt-2 p-2 bg-muted rounded-lg">
                                <p className="text-sm font-medium">Admin Response:</p>
                                <p className="text-sm text-muted-foreground">{req.admin_comment}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={!!reviewDialog} onOpenChange={(open) => !open && setReviewDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewDialog?.status === 'approved' ? 'Approve' : 'Reject'} Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="Add a comment (optional)..."
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialog(null)}>
                Cancel
              </Button>
              <Button
                variant={reviewDialog?.status === 'approved' ? 'default' : 'destructive'}
                onClick={handleReview}
                disabled={updateRequest.isPending}
              >
                {updateRequest.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  reviewDialog?.status === 'approved' ? 'Approve' : 'Reject'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
