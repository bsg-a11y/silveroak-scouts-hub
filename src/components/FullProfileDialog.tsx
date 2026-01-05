import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SecureAvatar } from '@/components/SecureAvatar';
import { 
  CalendarCheck, 
  CalendarX, 
  FileText, 
  Package, 
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  GraduationCap,
  Droplet,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface FullProfileDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProfileData {
  id: string;
  user_id: string;
  uid: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: string | null;
  date_of_birth: string | null;
  email: string | null;
  course_duration: string | null;
  college_name: string | null;
  current_semester: number | null;
  enrollment_number: string | null;
  whatsapp_number: string | null;
  blood_group: string | null;
  profile_photo_url: string | null;
  status: string;
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
}

interface InventoryData {
  id: string;
  quantity: number;
  assigned_at: string;
  returned_at: string | null;
  resource?: { name: string; category: string };
}

export function FullProfileDialog({ userId, open, onOpenChange }: FullProfileDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
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
    if (userId && open) {
      fetchData();
    }
  }, [userId, open]);

  const fetchData = async () => {
    if (!userId) return;
    setIsLoading(true);

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      setProfile(profileData);

      // Fetch attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('id, status, marked_at, activity_id, meeting_id')
        .eq('user_id', userId)
        .order('marked_at', { ascending: false });

      const activityIds = [...new Set(attendanceData?.filter(a => a.activity_id).map(a => a.activity_id) || [])];
      const meetingIds = [...new Set(attendanceData?.filter(a => a.meeting_id).map(a => a.meeting_id) || [])];

      const [activitiesResult, meetingsResult] = await Promise.all([
        activityIds.length > 0 ? supabase.from('activities').select('id, name, activity_date').in('id', activityIds) : { data: [] },
        meetingIds.length > 0 ? supabase.from('meetings').select('id, title, meeting_date').in('id', meetingIds) : { data: [] },
      ]);

      const activityMap = new Map<string, { id: string; name: string; activity_date: string }>(
        (activitiesResult.data || []).map(a => [a.id, a] as [string, { id: string; name: string; activity_date: string }])
      );
      const meetingMap = new Map<string, { id: string; title: string; meeting_date: string }>(
        (meetingsResult.data || []).map(m => [m.id, m] as [string, { id: string; title: string; meeting_date: string }])
      );

      const enrichedAttendance: AttendanceData[] = (attendanceData || []).map(a => ({
        id: a.id,
        status: a.status,
        marked_at: a.marked_at,
        activity: a.activity_id ? activityMap.get(a.activity_id) : undefined,
        meeting: a.meeting_id ? meetingMap.get(a.meeting_id) : undefined,
      }));

      setAttendance(enrichedAttendance);

      const activityRecords = enrichedAttendance.filter(a => a.activity);
      const meetingRecords = enrichedAttendance.filter(a => a.meeting);
      
      setStats({
        activityPresent: activityRecords.filter(a => a.status === 'present').length,
        activityTotal: activityRecords.length,
        meetingPresent: meetingRecords.filter(a => a.status === 'present').length,
        meetingTotal: meetingRecords.length,
      });

      // Fetch leaves
      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setLeaves(leaveData || []);

      // Fetch inventory
      const { data: inventoryData } = await supabase
        .from('resource_assignments')
        .select('id, quantity, assigned_at, returned_at, resource_id')
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false });

      const resourceIds = [...new Set(inventoryData?.map(i => i.resource_id) || [])];
      const { data: resourcesData } = resourceIds.length > 0 
        ? await supabase.from('resources').select('id, name, category').in('id', resourceIds)
        : { data: [] };

      const resourceMap = new Map<string, { id: string; name: string; category: string }>(
        (resourcesData || []).map(r => [r.id, r] as [string, { id: string; name: string; category: string }])
      );

      const inventoryWithResources: InventoryData[] = (inventoryData || []).map(i => ({
        id: i.id,
        quantity: i.quantity,
        assigned_at: i.assigned_at,
        returned_at: i.returned_at,
        resource: resourceMap.get(i.resource_id),
      }));
      
      setInventory(inventoryWithResources);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId) return null;

  const fullName = profile ? `${profile.first_name} ${profile.middle_name || ''} ${profile.last_name}`.trim() : '';
  const overallPercentage = (stats.activityTotal + stats.meetingTotal) > 0
    ? Math.round(((stats.activityPresent + stats.meetingPresent) / (stats.activityTotal + stats.meetingTotal)) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Member Profile</DialogTitle>
          <DialogDescription>Complete profile and activity history</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <>
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-muted/30 rounded-lg">
              <SecureAvatar
                src={profile.profile_photo_url}
                fallback={`${profile.first_name[0]}${profile.last_name[0]}`}
                className="h-24 w-24"
                fallbackClassName="text-2xl"
              />
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold">{fullName}</h2>
                <p className="text-sm text-muted-foreground font-mono">{profile.uid}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                  <Badge variant={profile.status === 'active' ? 'success' : 'inactive'}>
                    {profile.status}
                  </Badge>
                  {profile.blood_group && (
                    <Badge variant="secondary">
                      <Droplet className="h-3 w-3 mr-1" />
                      {profile.blood_group}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-3xl font-bold text-primary">{overallPercentage}%</p>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </div>
            </div>

            {/* Contact & Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              {profile.whatsapp_number && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.whatsapp_number}</span>
                </div>
              )}
              {profile.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.email}</span>
                </div>
              )}
              {profile.college_name && (
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.college_name}</span>
                </div>
              )}
              {profile.current_semester && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Semester {profile.current_semester}</span>
                </div>
              )}
              {profile.enrollment_number && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.enrollment_number}</span>
                </div>
              )}
              {profile.date_of_birth && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(profile.date_of_birth), 'PPP')}</span>
                </div>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="attendance" className="space-y-4">
              <TabsList className="w-full">
                <TabsTrigger value="attendance" className="flex-1">Attendance</TabsTrigger>
                <TabsTrigger value="leaves" className="flex-1">Leaves</TabsTrigger>
                <TabsTrigger value="inventory" className="flex-1">Inventory</TabsTrigger>
              </TabsList>

              <TabsContent value="attendance" className="space-y-3">
                {attendance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No attendance records</p>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
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
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {leaves.map((leave) => (
                      <div 
                        key={leave.id}
                        className="p-3 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            {format(new Date(leave.from_date), 'MMM d')} - {format(new Date(leave.to_date), 'MMM d, yyyy')}
                          </span>
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
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
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
        ) : (
          <p className="text-center text-muted-foreground py-8">Profile not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
