import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useAuth } from '@/contexts/AuthContext';

export default function Leaves() {
  const { leaveRequests, isLoading, createLeaveRequest, updateLeaveStatus } = useLeaveRequests();
  const { isAdminOrCoordinator, user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ from_date: '', to_date: '', reason: '' });

  const myLeaveRequests = leaveRequests.filter(r => r.user_id === user?.id);
  const pendingRequests = leaveRequests.filter(r => r.status === 'pending');
  const processedRequests = leaveRequests.filter(r => r.status !== 'pending');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await createLeaveRequest(formData);
    setFormData({ from_date: '', to_date: '', reason: '' });
    setIsDialogOpen(false);
    setIsSubmitting(false);
  };

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
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Leave Management</h1>
            <p className="text-muted-foreground mt-1">Request and manage leaves</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Request Leave</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request Leave</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" value={formData.from_date} onChange={(e) => setFormData({ ...formData, from_date: e.target.value })} required />
                  <Input type="date" value={formData.to_date} onChange={(e) => setFormData({ ...formData, to_date: e.target.value })} required />
                </div>
                <Textarea placeholder="Reason" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} required />
                <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue={isAdminOrCoordinator ? "pending" : "my-requests"}>
          <TabsList>
            <TabsTrigger value="my-requests">My Requests</TabsTrigger>
            {isAdminOrCoordinator && (
              <>
                <TabsTrigger value="pending">Pending {pendingRequests.length > 0 && <Badge variant="warning" className="ml-2">{pendingRequests.length}</Badge>}</TabsTrigger>
                <TabsTrigger value="processed">Processed</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="my-requests" className="space-y-4 mt-4">
            {myLeaveRequests.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No leave requests yet</CardContent></Card>
            ) : (
              myLeaveRequests.map((r) => (
                <Card key={r.id}><CardContent className="p-4 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4" /><span className="font-medium">{format(new Date(r.from_date), 'MMM d')} - {format(new Date(r.to_date), 'MMM d, yyyy')}</span></div>
                    <p className="text-foreground/80">{r.reason}</p>
                  </div>
                  <Badge variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}>{r.status}</Badge>
                </CardContent></Card>
              ))
            )}
          </TabsContent>

          {isAdminOrCoordinator && (
            <>
              <TabsContent value="pending" className="space-y-4 mt-4">
                {pendingRequests.length === 0 ? (
                  <Card><CardContent className="p-8 text-center text-muted-foreground">No pending requests</CardContent></Card>
                ) : (
                  pendingRequests.map((r) => (
                    <Card key={r.id}><CardContent className="p-4 flex justify-between items-start gap-4">
                      <div>
                        <p className="font-medium">{r.user_name} <code className="px-1.5 py-0.5 rounded bg-muted text-xs">{r.user_uid}</code></p>
                        <p className="text-sm text-muted-foreground">{format(new Date(r.from_date), 'MMM d')} - {format(new Date(r.to_date), 'MMM d')}</p>
                        <p className="text-foreground/80 mt-1">{r.reason}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateLeaveStatus(r.id, 'approved')}><Check className="h-4 w-4 mr-1" />Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => updateLeaveStatus(r.id, 'rejected')}><X className="h-4 w-4 mr-1" />Reject</Button>
                      </div>
                    </CardContent></Card>
                  ))
                )}
              </TabsContent>
              <TabsContent value="processed" className="space-y-4 mt-4">
                {processedRequests.map((r) => (
                  <Card key={r.id} className="opacity-75"><CardContent className="p-4 flex justify-between">
                    <div><p className="font-medium">{r.user_name}</p><p className="text-sm text-muted-foreground">{format(new Date(r.from_date), 'MMM d')} - {format(new Date(r.to_date), 'MMM d')}</p></div>
                    <Badge variant={r.status === 'approved' ? 'success' : 'danger'}>{r.status}</Badge>
                  </CardContent></Card>
                ))}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
