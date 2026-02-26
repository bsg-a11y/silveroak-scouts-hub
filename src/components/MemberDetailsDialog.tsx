import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CalendarCheck, CalendarX, FileText, Package, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface MemberDetailsDialogProps {
  member: {
    id: string;
    user_id: string;
    uid: string;
    first_name: string;
    last_name: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AttendanceData {
  id: string;
  status: string;
  marked_at: string;
  activity?: { name: string; activity_date: string };
  meeting?: { title: string; meeting_date: string };
}

interface LeaveData {
  id: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: string;
  created_at: string;
}

interface InventoryData {
  id: string;
  quantity: number;
  assigned_at: string;
  returned_at: string | null;
  resource?: { name: string; category: string };
}

export function MemberDetailsDialog({ member, open, onOpenChange }: MemberDetailsDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [leaves, setLeaves] = useState<LeaveData[]>([]);
  const [inventory, setInventory] = useState<InventoryData[]>([]);
  const [stats, setStats] = useState({
    activityPresent: 0,
    activityTotal: 0,
    meetingPresent: 0,
    meetingTotal: 0,
  });

  useEffect(() => {
    if (member && open) {
      fetchMemberData();
    }
  }, [member, open]);

  const fetchMemberData = async () => {
    if (!member) return;
    setIsLoading(true);

    try {
      // Fetch attendance records
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('id, status, marked_at, activity_id, meeting_id')
        .eq('user_id', member.user_id)
        .order('marked_at', { ascending: false });

      // Fetch activity and meeting details
      const activityIds = [...new Set(attendanceData?.filter(a => a.activity_id).map(a => a.activity_id) || [])];
      const meetingIds = [...new Set(attendanceData?.filter(a => a.meeting_id).map(a => a.meeting_id) || [])];

      const [activitiesResult, meetingsResult] = await Promise.all([
        activityIds.length > 0 ? supabase.from('activities').select('id, name, activity_date').in('id', activityIds) : { data: [] },
        meetingIds.length > 0 ? supabase.from('meetings').select('id, title, meeting_date').in('id', meetingIds) : { data: [] },
      ]);

      const activityMap = new Map<string, { id: string; name: string; activity_date: string }>();
      activitiesResult.data?.forEach(a => activityMap.set(a.id, a));
      
      const meetingMap = new Map<string, { id: string; title: string; meeting_date: string }>();
      meetingsResult.data?.forEach(m => meetingMap.set(m.id, m));

      const enrichedAttendance: AttendanceData[] = (attendanceData || []).map(a => ({
        id: a.id,
        status: a.status,
        marked_at: a.marked_at,
        activity: a.activity_id ? activityMap.get(a.activity_id) : undefined,
        meeting: a.meeting_id ? meetingMap.get(a.meeting_id) : undefined,
      }));

      setAttendance(enrichedAttendance);

      // Fetch total registered activities
      const { count: totalRegistered } = await supabase
        .from('activity_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', member.user_id);

      // Calculate stats - use registrations as total for activities
      const activityRecords = enrichedAttendance.filter(a => a.activity);
      const meetingRecords = enrichedAttendance.filter(a => a.meeting);
      
      setStats({
        activityPresent: activityRecords.filter(a => a.status === 'present').length,
        activityTotal: totalRegistered || activityRecords.length,
        meetingPresent: meetingRecords.filter(a => a.status === 'present').length,
        meetingTotal: meetingRecords.length,
      });

      // Fetch leave requests
      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', member.user_id)
        .order('created_at', { ascending: false });

      setLeaves(leaveData || []);

      // Fetch inventory assignments
      const { data: inventoryData } = await supabase
        .from('resource_assignments')
        .select('id, quantity, assigned_at, returned_at, resource_id')
        .eq('user_id', member.user_id)
        .order('assigned_at', { ascending: false });

      // Fetch resource details
      const resourceIds = [...new Set(inventoryData?.map(i => i.resource_id) || [])];
      const { data: resourcesData } = resourceIds.length > 0 
        ? await supabase.from('resources').select('id, name, category').in('id', resourceIds)
        : { data: [] };

      const resourceMap = new Map<string, { id: string; name: string; category: string }>();
      resourcesData?.forEach(r => resourceMap.set(r.id, r));

      setInventory((inventoryData || []).map(i => ({
        id: i.id,
        quantity: i.quantity,
        assigned_at: i.assigned_at,
        returned_at: i.returned_at,
        resource: resourceMap.get(i.resource_id),
      })));

    } catch (error) {
      console.error('Error fetching member data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!member) return null;

  const activityPercentage = stats.activityTotal > 0 
    ? Math.round((stats.activityPresent / stats.activityTotal) * 100) 
    : 0;
  const meetingPercentage = stats.meetingTotal > 0 
    ? Math.round((stats.meetingPresent / stats.meetingTotal) * 100) 
    : 0;
  const overallPercentage = (stats.activityTotal + stats.meetingTotal) > 0
    ? Math.round(((stats.activityPresent + stats.meetingPresent) / (stats.activityTotal + stats.meetingTotal)) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Member Details</DialogTitle>
          <DialogDescription>
            {member.first_name} {member.last_name} ({member.uid})
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{overallPercentage}%</p>
                  <p className="text-sm text-muted-foreground">Overall Attendance</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-bsg-green">{activityPercentage}%</p>
                  <p className="text-sm text-muted-foreground">Activity ({stats.activityPresent}/{stats.activityTotal})</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-accent">{meetingPercentage}%</p>
                  <p className="text-sm text-muted-foreground">Meeting ({stats.meetingPresent}/{stats.meetingTotal})</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="attendance" className="space-y-4">
              <TabsList className="w-full">
                <TabsTrigger value="attendance" className="flex-1">Attendance</TabsTrigger>
                <TabsTrigger value="leaves" className="flex-1">Leave History</TabsTrigger>
                <TabsTrigger value="inventory" className="flex-1">Inventory</TabsTrigger>
              </TabsList>

              <TabsContent value="attendance" className="space-y-3">
                {attendance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No attendance records</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {attendance.map((record) => (
                      <div 
                        key={record.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          {record.status === 'present' ? (
                            <CalendarCheck className="h-5 w-5 text-green-500" />
                          ) : (
                            <CalendarX className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium">
                              {record.activity?.name || record.meeting?.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(record.activity?.activity_date || record.meeting?.meeting_date || record.marked_at), 'MMM d, yyyy')}
                              {' • '}
                              {record.activity ? 'Activity' : 'Meeting'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={record.status === 'present' ? 'success' : 'danger'}>
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="leaves" className="space-y-3">
                {leaves.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No leave requests</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {leaves.map((leave) => (
                      <div 
                        key={leave.id}
                        className="p-3 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(new Date(leave.from_date), 'MMM d')} - {format(new Date(leave.to_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <Badge variant={
                            leave.status === 'approved' ? 'success' : 
                            leave.status === 'rejected' ? 'danger' : 'warning'
                          }>
                            {leave.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{leave.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="inventory" className="space-y-3">
                {inventory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No inventory assignments</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {inventory.map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{item.resource?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.resource?.category} • Qty: {item.quantity}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Assigned: {format(new Date(item.assigned_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Badge variant={item.returned_at ? 'inactive' : 'success'}>
                          {item.returned_at ? 'Returned' : 'Active'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
