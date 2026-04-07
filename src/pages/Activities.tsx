import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { ActivityForm } from '@/components/ActivityForm';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Calendar,
  MapPin,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Loader2,
  Check,
  X,
  Eye,
  Award,
  Pencil,
  Trash2,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useActivities, RegisteredMember } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';

import { RegisteredMembersList } from '@/components/RegisteredMembersList';
import { ExportMembersList } from '@/components/ExportMembersList';
import { useCertificateRequests } from '@/hooks/useCertificateRequests';
import { getCollegeColor, getCollegeBgColor } from '@/lib/collegeColors';

export default function Activities() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateActivities, setSelectedDateActivities] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [viewRegistrationsDialog, setViewRegistrationsDialog] = useState<string | null>(null);
  const [registeredMembers, setRegisteredMembers] = useState<RegisteredMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const { activities, isLoading, createActivity, updateActivity, deleteActivity, registerForActivity, unregisterFromActivity, fetchRegisteredMembers } = useActivities();
  const { isAdminOrCoordinator, user } = useAuth();
  const { createRequest } = useCertificateRequests();
  const [certRequestDialog, setCertRequestDialog] = useState<{ activityId: string; activityName: string } | null>(null);
  const [certRequestReason, setCertRequestReason] = useState('');
  const [externalCounts, setExternalCounts] = useState<Record<string, number>>({});

  // Fetch external participant counts
  useEffect(() => {
    const fetchExternalCounts = async () => {
      const { data } = await supabase
        .from('external_participants')
        .select('activity_id')
        .not('activity_id', 'is', null)
        .is('pdf_url', null);
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(row => {
          if (row.activity_id) {
            counts[row.activity_id] = (counts[row.activity_id] || 0) + 1;
          }
        });
        setExternalCounts(counts);
      }
    };
    fetchExternalCounts();
  }, [activities]);

  // Fetch registered members when dialog opens
  useEffect(() => {
    if (viewRegistrationsDialog) {
      setIsLoadingMembers(true);
      fetchRegisteredMembers(viewRegistrationsDialog).then((members) => {
        setRegisteredMembers(members);
        setIsLoadingMembers(false);
      });
    } else {
      setRegisteredMembers([]);
    }
  }, [viewRegistrationsDialog]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const paddingDays = Array.from({ length: startDay }, (_, i) => null);

  const getActivitiesForDate = (date: Date) => {
    return activities.filter(
      (activity) => isSameDay(new Date(activity.activity_date), date)
    );
  };

  const upcomingActivities = activities.filter(a => a.status === 'upcoming');
  const completedActivities = activities.filter(a => a.status === 'completed');

  const handleEditActivity = (activity: typeof activities[0], e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingActivity(activity);
    setSelectedDateActivities([]);
    setViewRegistrationsDialog(null);
    setIsEditDialogOpen(true);
  };

  const handleMarkAsDone = async (activityId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await updateActivity(activityId, { status: 'completed' });
  };

  const handleDeleteActivity = async () => {
    if (!deleteActivityId) return;
    await deleteActivity(deleteActivityId);
    setDeleteActivityId(null);
  };

  const handleRegister = async (activityId: string, isRegistered: boolean) => {
    if (isRegistered) {
      await unregisterFromActivity(activityId);
    } else {
      await registerForActivity(activityId);
    }
  };

  const handleCertificateRequest = async () => {
    if (!certRequestDialog || !certRequestReason.trim()) return;
    await createRequest.mutateAsync({
      activity_id: certRequestDialog.activityId,
      reason: certRequestReason,
    });
    setCertRequestDialog(null);
    setCertRequestReason('');
  };

  // Get color for activity based on collaboration college
  const getActivityColor = (activity: typeof activities[0]) => {
    const collabCollege = (activity as any).collaboration_college;
    if (collabCollege) {
      return getCollegeColor(collabCollege);
    }
    return undefined;
  };

  const getActivityBgColor = (activity: typeof activities[0]) => {
    const collabCollege = (activity as any).collaboration_college;
    if (collabCollege) {
      return getCollegeBgColor(collabCollege);
    }
    return undefined;
  };



  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Activities
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage BSG activities and events
            </p>
          </div>
          {isAdminOrCoordinator && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Activity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Schedule New Activity</DialogTitle>
                  <DialogDescription>
                    Create a new activity for BSG members.
                  </DialogDescription>
                </DialogHeader>
                <ActivityForm
                  onSubmit={(data) => createActivity(data)}
                  onCancel={() => setIsAddDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle>Activity Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {paddingDays.map((_, index) => (
                  <div key={`padding-${index}`} className="h-20" />
                ))}
                {daysInMonth.map((day) => {
                  const dayActivities = getActivitiesForDate(day);
                  const hasActivities = dayActivities.length > 0;
                  
                  return (
                    <div
                      key={day.toString()}
                      onClick={() => {
                        setSelectedDate(day);
                        const dayActs = getActivitiesForDate(day);
                        setSelectedDateActivities(dayActs);
                      }}
                      className={cn(
                        "h-20 p-1 border rounded-lg cursor-pointer transition-all duration-200",
                        isToday(day) && "border-primary bg-primary/5",
                        selectedDate && isSameDay(day, selectedDate) && "border-primary ring-2 ring-primary/20",
                        !isToday(day) && !(selectedDate && isSameDay(day, selectedDate)) && "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "text-sm font-medium",
                        isToday(day) && "text-primary"
                      )}>
                        {format(day, 'd')}
                      </div>
                      {hasActivities && (
                        <div className="mt-1 space-y-1">
                          {dayActivities.slice(0, 2).map((activity) => {
                            const bgColor = getActivityBgColor(activity);
                            const textColor = getActivityColor(activity);
                            return (
                              <div
                                key={activity.id}
                                className={cn(
                                  "text-[10px] px-1 py-0.5 rounded truncate",
                                  !bgColor && (activity.status === 'upcoming' 
                                    ? "bg-bsg-green/10 text-bsg-green"
                                    : "bg-muted text-muted-foreground")
                                )}
                                style={bgColor ? { backgroundColor: bgColor, color: textColor } : undefined}
                              >
                                {activity.name}
                              </div>
                            );
                          })}
                          {dayActivities.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{dayActivities.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Activities List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming</CardTitle>
              <CardDescription>{upcomingActivities.length} activities scheduled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : upcomingActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No upcoming activities</p>
              ) : (
                upcomingActivities.slice(0, 3).map((activity) => {
                  const collabCollege = (activity as any).collaboration_college;
                  return (
                    <div
                      key={activity.id}
                      className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                      style={collabCollege ? { borderLeftWidth: 4, borderLeftColor: getCollegeColor(collabCollege) } : undefined}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-foreground">{activity.name}</h4>
                        <div className="flex items-center gap-1">
                          {isAdminOrCoordinator && (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => handleEditActivity(activity, e)} title="Edit">
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-bsg-green" onClick={(e) => handleMarkAsDone(activity.id, e)} title="Mark as Done">
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteActivityId(activity.id)} title="Delete">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          <Badge variant="success">Open</Badge>
                        </div>
                      </div>
                      {collabCollege && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <Building2 className="h-3 w-3" />
                          <span>with {collabCollege}</span>
                        </div>
                      )}
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(activity.activity_date), 'MMM d, yyyy')}
                        </div>
                        {activity.activity_time && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            {activity.activity_time}
                          </div>
                        )}
                        {activity.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5" />
                            {activity.location}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5" />
                          {activity.registered_count || 0}{activity.capacity ? `/${activity.capacity}` : ''} registered
                          {(externalCounts[activity.id] || 0) > 0 && (
                            <span className="text-xs text-purple-600">+ {externalCounts[activity.id]} non-BSG</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {isAdminOrCoordinator && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1"
                            onClick={() => setViewRegistrationsDialog(activity.id)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        )}
                        {user && (
                          <Button 
                            size="sm" 
                            variant={activity.is_registered ? "outline" : "secondary"} 
                            className="flex-1"
                            onClick={() => handleRegister(activity.id, activity.is_registered || false)}
                          >
                            {activity.is_registered ? (
                              <>
                                <X className="h-3 w-3 mr-1" />
                                Unregister
                              </>
                            ) : (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Register
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Details Popup for Selected Date */}
        <Dialog open={selectedDateActivities.length > 0} onOpenChange={(open) => !open && setSelectedDateActivities([])}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Activities on {selectedDate ? format(selectedDate, 'PPP') : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedDateActivities.map((activity) => {
                const collabCollege = (activity as any).collaboration_college;
                return (
                  <div 
                    key={activity.id} 
                    className="p-4 rounded-lg border"
                    style={collabCollege ? { borderLeftWidth: 4, borderLeftColor: getCollegeColor(collabCollege) } : undefined}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{activity.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{activity.description || 'No description'}</p>
                        {collabCollege && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Building2 className="h-3 w-3" />
                            <span>Collaboration with {collabCollege}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {isAdminOrCoordinator && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => handleEditActivity(activity, e)} title="Edit">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {activity.status === 'upcoming' && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-bsg-green" onClick={(e) => handleMarkAsDone(activity.id, e)} title="Mark as Done">
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => { setDeleteActivityId(activity.id); setSelectedDateActivities([]); }} title="Delete">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        <Badge variant={activity.status === 'upcoming' ? 'success' : 'inactive'}>
                          {activity.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                      {activity.activity_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {activity.activity_time}
                        </div>
                      )}
                      {activity.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {activity.location}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {activity.registered_count || 0} registered
                        {(externalCounts[activity.id] || 0) > 0 && (
                          <span className="text-xs text-purple-600 ml-1">+ {externalCounts[activity.id]} non-BSG</span>
                        )}
                      </div>
                    </div>
                    {user && activity.status === 'upcoming' && (
                      <Button 
                        size="sm"
                        className="mt-3 w-full"
                        variant={activity.is_registered ? "outline" : "default"}
                        onClick={() => handleRegister(activity.id, activity.is_registered || false)}
                      >
                        {activity.is_registered ? 'Unregister' : 'Register Now'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Activity Dialog */}
        <Dialog 
          open={isEditDialogOpen} 
          onOpenChange={(open) => { 
            if (!open) { 
              setIsEditDialogOpen(false);
              setEditingActivity(null); 
            } 
          }}
          modal={true}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Activity</DialogTitle>
              <DialogDescription>
                Update the activity details.
              </DialogDescription>
            </DialogHeader>
            {editingActivity && (
              <ActivityForm
                isEdit
                initialData={{
                  name: editingActivity.name,
                  description: editingActivity.description || '',
                  activity_date: editingActivity.activity_date,
                  activity_time: editingActivity.activity_time || '',
                  location: editingActivity.location || '',
                  capacity: editingActivity.capacity || undefined,
                  registration_enabled: editingActivity.registration_enabled,
                  status: editingActivity.status,
                  collaboration_college: (editingActivity as any).collaboration_college || '',
                  collaboration_department: (editingActivity as any).collaboration_department || '',
                }}
                onSubmit={(data) => updateActivity(editingActivity.id, data)}
                onCancel={() => { setIsEditDialogOpen(false); setEditingActivity(null); }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteActivityId} onOpenChange={(open) => !open && setDeleteActivityId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Activity?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the activity and all associated registrations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteActivity} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View Registrations Dialog */}
        <Dialog open={!!viewRegistrationsDialog} onOpenChange={(open) => !open && setViewRegistrationsDialog(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Registered Members</DialogTitle>
                  <DialogDescription>
                    {registeredMembers.length} members registered
                  </DialogDescription>
                </div>
                {registeredMembers.length > 0 && (
                  <ExportMembersList
                    members={registeredMembers}
                    title={activities.find(a => a.id === viewRegistrationsDialog)?.name || 'Activity'}
                    eventName={activities.find(a => a.id === viewRegistrationsDialog)?.name}
                    eventDate={activities.find(a => a.id === viewRegistrationsDialog)?.activity_date}
                    venue={activities.find(a => a.id === viewRegistrationsDialog)?.location || undefined}
                  />
                )}
              </div>
            </DialogHeader>
            <RegisteredMembersList 
              members={registeredMembers} 
              isLoading={isLoadingMembers}
            />
          </DialogContent>
        </Dialog>

        {/* Certificate Request Dialog */}
        <Dialog open={!!certRequestDialog} onOpenChange={(open) => !open && setCertRequestDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Certificate</DialogTitle>
              <DialogDescription>
                Request a certificate for: {certRequestDialog?.activityName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reason for Certificate Request</Label>
                <Textarea
                  value={certRequestReason}
                  onChange={(e) => setCertRequestReason(e.target.value)}
                  placeholder="Explain why you need this certificate..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCertRequestDialog(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCertificateRequest} 
                disabled={!certRequestReason.trim() || createRequest.isPending}
              >
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
          </DialogContent>
        </Dialog>

        {/* Activity List Tabs */}
        <Card>
          <Tabs defaultValue="upcoming">
            <CardHeader className="border-b border-border/50 pb-0">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="upcoming">
                  Upcoming ({upcomingActivities.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completedActivities.length})
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="upcoming" className="mt-0">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : upcomingActivities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No upcoming activities</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingActivities.map((activity) => {
                      const collabCollege = (activity as any).collaboration_college;
                      return (
                        <div
                          key={activity.id}
                          className="p-4 rounded-lg border border-border/50 hover:shadow-card transition-all"
                          style={collabCollege ? { borderLeftWidth: 4, borderLeftColor: getCollegeColor(collabCollege) } : undefined}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-foreground">{activity.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {activity.description || 'No description'}
                              </p>
                              {collabCollege && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Building2 className="h-3 w-3" />
                                  <span>with {collabCollege}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {isAdminOrCoordinator && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditActivity(activity)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteActivityId(activity.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              <Badge variant="success">Upcoming</Badge>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(activity.activity_date), 'MMM d, yyyy')}
                            </div>
                            {activity.activity_time && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                {activity.activity_time}
                              </div>
                            )}
                            {activity.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {activity.location}
                              </div>
                            )}
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-bsg-green rounded-full"
                                  style={{ width: `${((activity.registered_count || 0) / (activity.capacity || 100)) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {activity.registered_count || 0}{activity.capacity ? `/${activity.capacity}` : ''}
                              </span>
                            </div>
                            {user && (
                              <Button 
                                size="sm"
                                variant={activity.is_registered ? "outline" : "default"}
                                onClick={() => handleRegister(activity.id, activity.is_registered || false)}
                              >
                                {activity.is_registered ? 'Unregister' : 'Register'}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="completed" className="mt-0">
                {completedActivities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No completed activities</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {completedActivities.map((activity) => {
                      const collabCollege = (activity as any).collaboration_college;
                      return (
                        <div
                          key={activity.id}
                          className="p-4 rounded-lg border border-border/50 bg-muted/20"
                          style={collabCollege ? { borderLeftWidth: 4, borderLeftColor: getCollegeColor(collabCollege) } : undefined}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-foreground">{activity.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {activity.description || 'No description'}
                              </p>
                              {collabCollege && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Building2 className="h-3 w-3" />
                                  <span>with {collabCollege}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {isAdminOrCoordinator && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditActivity(activity)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteActivityId(activity.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              <Badge variant="inactive">Completed</Badge>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(activity.activity_date), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users className="h-4 w-4" />
                              {activity.registered_count || 0} attended
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isAdminOrCoordinator && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setViewRegistrationsDialog(activity.id)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Members
                              </Button>
                            )}
                            {user && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setCertRequestDialog({ activityId: activity.id, activityName: activity.name })}
                              >
                                <Award className="h-3 w-3 mr-1" />
                                Request Certificate
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}
