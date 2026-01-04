import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Pencil, 
  Phone,
  Calendar,
  GraduationCap,
  Building,
  Shield,
  Award,
  ClipboardCheck,
  FileText,
  Loader2
} from 'lucide-react';
import { ROLE_LABELS, type UserRole } from '@/types';
import { format } from 'date-fns';

interface FullProfile {
  id: string;
  user_id: string;
  uid: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: string | null;
  date_of_birth: string | null;
  course_duration: string | null;
  college_name: string | null;
  current_semester: number | null;
  enrollment_number: string | null;
  class_coordinator_name: string | null;
  hod_name: string | null;
  principal_name: string | null;
  whatsapp_number: string | null;
  blood_group: string | null;
  profile_photo_url: string | null;
  status: string;
  created_at: string;
}

interface ActivityHistory {
  id: string;
  name: string;
  activity_date: string;
  attended: boolean;
}

interface Certificate {
  id: string;
  name: string;
  event_name: string;
  issue_date: string;
}

interface LeaveHistory {
  id: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: string;
}

export default function Profile() {
  const { user, profile: authProfile, roles } = useAuth();
  const [fullProfile, setFullProfile] = useState<FullProfile | null>(null);
  const [activityHistory, setActivityHistory] = useState<ActivityHistory[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<LeaveHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // Fetch full profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setFullProfile(profileData);
        }

        // Fetch attendance records with activity details
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select(`
            id,
            status,
            activity_id,
            activities (
              name,
              activity_date
            )
          `)
          .eq('user_id', user.id)
          .not('activity_id', 'is', null)
          .order('marked_at', { ascending: false });

        if (attendanceData) {
          const history = attendanceData
            .filter(a => a.activities)
            .map(a => ({
              id: a.id,
              name: (a.activities as any)?.name || 'Unknown Activity',
              activity_date: (a.activities as any)?.activity_date || '',
              attended: a.status === 'present',
            }));
          setActivityHistory(history);
        }

        // Fetch certificates
        const { data: certsData } = await supabase
          .from('certificates')
          .select('*')
          .eq('user_id', user.id)
          .order('issue_date', { ascending: false });

        if (certsData) {
          setCertificates(certsData);
        }

        // Fetch leave requests
        const { data: leavesData } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (leavesData) {
          setLeaveHistory(leavesData);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  if (isLoading || !fullProfile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const fullName = `${fullProfile.first_name} ${fullProfile.middle_name || ''} ${fullProfile.last_name}`.trim();
  const attendancePercentage = activityHistory.length > 0
    ? Math.round((activityHistory.filter(a => a.attended).length / activityHistory.length) * 100)
    : 0;
  const userRole = (roles[0] || 'member') as UserRole;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar & Basic Info */}
              <div className="flex flex-col items-center md:items-start">
                <ProfilePhotoUpload
                  currentPhotoUrl={fullProfile.profile_photo_url}
                  userId={user?.id || ''}
                  fallback={`${fullProfile.first_name[0]}${fullProfile.last_name[0]}`}
                  onPhotoUpdated={(url) => setFullProfile({ ...fullProfile, profile_photo_url: url })}
                />
              </div>

              {/* Profile Details */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold font-display text-foreground">
                      {fullName}
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                      <code className="px-2 py-1 rounded bg-primary/10 text-primary text-sm font-mono font-medium">
                        {fullProfile.uid}
                      </code>
                      <Badge variant={fullProfile.status === 'active' ? 'active' : 'inactive'}>
                        {fullProfile.status === 'active' ? 'Active Member' : 'Inactive'}
                      </Badge>
                      <Badge variant="member">
                        {ROLE_LABELS[userRole]}
                      </Badge>
                    </div>
                  </div>
                  <Button>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">WhatsApp</p>
                      <p className="text-sm font-medium">{fullProfile.whatsapp_number || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date of Birth</p>
                      <p className="text-sm font-medium">
                        {fullProfile.date_of_birth 
                          ? format(new Date(fullProfile.date_of_birth), 'dd MMM yyyy')
                          : 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Blood Group</p>
                      <p className="text-sm font-medium">{fullProfile.blood_group || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <ClipboardCheck className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">{attendancePercentage}%</p>
                  <p className="text-xs text-muted-foreground">Attendance</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">{activityHistory.length}</p>
                  <p className="text-xs text-muted-foreground">Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Award className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">{certificates.length}</p>
                  <p className="text-xs text-muted-foreground">Certificates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">{leaveHistory.length}</p>
                  <p className="text-xs text-muted-foreground">Leaves Taken</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Card>
          <Tabs defaultValue="academic">
            <CardHeader className="border-b border-border/50 pb-0">
              <TabsList>
                <TabsTrigger value="academic">Academic Info</TabsTrigger>
                <TabsTrigger value="activities">Activities</TabsTrigger>
                <TabsTrigger value="certificates">Certificates</TabsTrigger>
                <TabsTrigger value="leaves">Leave History</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-6">
              <TabsContent value="academic" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Academic Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Enrollment Number</span>
                        <span className="font-medium">{fullProfile.enrollment_number || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Current Semester</span>
                        <span className="font-medium">
                          {fullProfile.current_semester ? `Semester ${fullProfile.current_semester}` : 'Not provided'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Course Duration</span>
                        <span className="font-medium">{fullProfile.course_duration || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">College</span>
                        <span className="font-medium">{fullProfile.college_name || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Building className="h-5 w-5 text-primary" />
                      Institute Contacts
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Class Coordinator</span>
                        <span className="font-medium">{fullProfile.class_coordinator_name || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">HOD</span>
                        <span className="font-medium">{fullProfile.hod_name || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Principal</span>
                        <span className="font-medium">{fullProfile.principal_name || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activities" className="mt-0">
                {activityHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No activity history found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityHistory.map((activity) => (
                      <div 
                        key={activity.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border/50"
                      >
                        <div>
                          <p className="font-medium">{activity.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(activity.activity_date), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <Badge variant={activity.attended ? 'success' : 'danger'}>
                          {activity.attended ? 'Present' : 'Absent'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="certificates" className="mt-0">
                {certificates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No certificates earned yet
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {certificates.map((cert) => (
                      <Card key={cert.id} className="border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-accent/10">
                              <Award className="h-5 w-5 text-accent" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{cert.name}</h4>
                              <p className="text-sm text-muted-foreground">{cert.event_name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Issued: {format(new Date(cert.issue_date), 'dd MMM yyyy')}
                              </p>
                            </div>
                            <Button variant="outline" size="sm">
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="leaves" className="mt-0">
                {leaveHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No leave history found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaveHistory.map((leave) => (
                      <div 
                        key={leave.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border/50"
                      >
                        <div>
                          <p className="font-medium">{leave.reason}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(leave.from_date), 'dd MMM yyyy')}
                            {leave.from_date !== leave.to_date && 
                              ` to ${format(new Date(leave.to_date), 'dd MMM yyyy')}`}
                          </p>
                        </div>
                        <Badge variant={
                          leave.status === 'approved' ? 'success' : 
                          leave.status === 'rejected' ? 'danger' : 'warning'
                        }>
                          {leave.status}
                        </Badge>
                      </div>
                    ))}
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
