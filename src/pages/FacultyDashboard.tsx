import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SecureAvatar } from '@/components/SecureAvatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Calendar, Users, Loader2, CalendarCheck, CalendarX, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useColleges } from '@/hooks/useColleges';
import { format } from 'date-fns';

interface ActivityWithRegistrations {
  id: string;
  name: string;
  activity_date: string;
  status: string;
  registrations: {
    user_id: string;
    registered_at: string;
    profile: {
      first_name: string;
      last_name: string;
      college_name: string | null;
      enrollment_number: string | null;
      whatsapp_number: string | null;
      profile_photo_url: string | null;
      email: string | null;
    };
  }[];
}

interface MeetingWithAttendance {
  id: string;
  title: string;
  meeting_date: string;
}

interface AttendanceRecord {
  user_id: string;
  status: string;
  activity_id: string | null;
  meeting_id: string | null;
  profile?: {
    first_name: string;
    last_name: string;
    college_name: string | null;
    uid: string;
  };
}

export default function FacultyDashboard() {
  const { profile } = useAuth();
  const { colleges } = useColleges();
  const [activities, setActivities] = useState<ActivityWithRegistrations[]>([]);
  const [meetings, setMeetings] = useState<MeetingWithAttendance[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [collegeFilter, setCollegeFilter] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [activeTab, setActiveTab] = useState('registrations');

  // Get faculty's assigned college
  const facultyCollegeId = profile?.faculty_college_id;
  const facultyCollege = colleges.find(c => c.id === facultyCollegeId);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all activities with registrations
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('id, name, activity_date, status')
        .order('activity_date', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Fetch registrations for each activity
      const activitiesWithRegs = await Promise.all(
        (activitiesData || []).map(async (activity) => {
          const { data: regs, error: regsError } = await supabase
            .from('activity_registrations')
            .select('user_id, registered_at')
            .eq('activity_id', activity.id);

          if (regsError) throw regsError;

          // Fetch profiles for registrations
          const userIds = regs?.map(r => r.user_id) || [];
          let profiles: any[] = [];
          
          if (userIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('user_id, first_name, last_name, college_name, enrollment_number, whatsapp_number, profile_photo_url, email')
              .in('user_id', userIds);
            profiles = profilesData || [];
          }

          const registrations = (regs || []).map(r => ({
            ...r,
            profile: profiles.find(p => p.user_id === r.user_id) || {
              first_name: 'Unknown',
              last_name: '',
              college_name: null,
              enrollment_number: null,
              whatsapp_number: null,
              profile_photo_url: null,
              email: null,
            },
          }));

          return {
            ...activity,
            registrations,
          };
        })
      );

      setActivities(activitiesWithRegs);
      if (activitiesWithRegs.length > 0) {
        setSelectedActivity(activitiesWithRegs[0].id);
      }

      // Fetch meetings
      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('id, title, meeting_date')
        .order('meeting_date', { ascending: false });
      
      setMeetings(meetingsData || []);

      // Fetch all attendance records
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('user_id, status, activity_id, meeting_id');

      // Fetch profiles for attendance
      const attendanceUserIds = [...new Set(attendanceData?.map(a => a.user_id) || [])];
      let attendanceProfiles: any[] = [];
      if (attendanceUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, college_name, uid')
          .in('user_id', attendanceUserIds);
        attendanceProfiles = profilesData || [];
      }

      const attendanceWithProfiles = (attendanceData || []).map(a => ({
        ...a,
        profile: attendanceProfiles.find(p => p.user_id === a.user_id),
      }));

      setAttendance(attendanceWithProfiles);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedActivityData = activities.find(a => a.id === selectedActivity);

  // Filter registrations based on search and college filter
  const filteredRegistrations = selectedActivityData?.registrations.filter(reg => {
    const matchesSearch = 
      reg.profile.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.profile.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (reg.profile.enrollment_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCollege = 
      collegeFilter === 'all' || 
      reg.profile.college_name === colleges.find(c => c.id === collegeFilter)?.name;

    return matchesSearch && matchesCollege;
  }) || [];

  // Calculate attendance stats
  const calculateAttendanceStats = () => {
    const activityAttendance = attendance.filter(a => a.activity_id);
    const meetingAttendance = attendance.filter(a => a.meeting_id);
    
    const activityPresent = activityAttendance.filter(a => a.status === 'present').length;
    const meetingPresent = meetingAttendance.filter(a => a.status === 'present').length;
    
    const activityTotal = activityAttendance.length;
    const meetingTotal = meetingAttendance.length;
    const overallTotal = activityTotal + meetingTotal;
    const overallPresent = activityPresent + meetingPresent;
    
    return {
      activityPresent,
      activityTotal,
      meetingPresent,
      meetingTotal,
      overallPresent,
      overallTotal,
      activityPercentage: activityTotal > 0 ? Math.round((activityPresent / activityTotal) * 100) : 0,
      meetingPercentage: meetingTotal > 0 ? Math.round((meetingPresent / meetingTotal) * 100) : 0,
      overallPercentage: overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0,
    };
  };

  const stats = calculateAttendanceStats();

  // Stats
  const totalRegistrations = selectedActivityData?.registrations.length || 0;
  const collegeWiseCount = colleges.reduce((acc, college) => {
    const count = selectedActivityData?.registrations.filter(
      r => r.profile.college_name === college.name
    ).length || 0;
    if (count > 0) acc[college.name] = count;
    return acc;
  }, {} as Record<string, number>);

  // Get activity-wise attendance
  const getActivityWiseAttendance = () => {
    return activities.map(activity => {
      const activityAtt = attendance.filter(a => a.activity_id === activity.id);
      const present = activityAtt.filter(a => a.status === 'present').length;
      const total = activityAtt.length;
      return {
        id: activity.id,
        name: activity.name,
        date: activity.activity_date,
        present,
        total,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    }).filter(a => a.total > 0);
  };

  // Get meeting-wise attendance
  const getMeetingWiseAttendance = () => {
    return meetings.map(meeting => {
      const meetingAtt = attendance.filter(a => a.meeting_id === meeting.id);
      const present = meetingAtt.filter(a => a.status === 'present').length;
      const total = meetingAtt.length;
      return {
        id: meeting.id,
        title: meeting.title,
        date: meeting.meeting_date,
        present,
        total,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    }).filter(m => m.total > 0);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
            Faculty Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            View activity registrations & attendance {facultyCollege ? `for ${facultyCollege.name}` : ''}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Activities</p>
                  <p className="text-2xl font-bold font-display">{activities.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-bsg-green/10 rounded-lg">
                  <CalendarCheck className="h-5 w-5 text-bsg-green" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Activity Attendance</p>
                  <p className="text-2xl font-bold font-display">{stats.activityPercentage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <UserCheck className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Meeting Attendance</p>
                  <p className="text-2xl font-bold font-display">{stats.meetingPercentage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overall Attendance</p>
                  <p className="text-2xl font-bold font-display">{stats.overallPercentage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="registrations">Registrations</TabsTrigger>
            <TabsTrigger value="activity-attendance">Activity Attendance</TabsTrigger>
            <TabsTrigger value="meeting-attendance">Meeting Attendance</TabsTrigger>
          </TabsList>

          {/* Registrations Tab */}
          <TabsContent value="registrations" className="space-y-4">
            <Tabs value={selectedActivity} onValueChange={setSelectedActivity}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <TabsList className="w-auto overflow-x-auto">
                  {activities.slice(0, 5).map(activity => (
                    <TabsTrigger key={activity.id} value={activity.id} className="text-xs">
                      {activity.name.length > 20 ? activity.name.slice(0, 20) + '...' : activity.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {activities.length > 5 && (
                  <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="More activities..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activities.map(activity => (
                        <SelectItem key={activity.id} value={activity.id}>
                          {activity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {activities.map(activity => (
                <TabsContent key={activity.id} value={activity.id}>
                  <Card>
                    <CardHeader className="border-b">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <CardTitle>{activity.name}</CardTitle>
                          <CardDescription>
                            {format(new Date(activity.activity_date), 'PPP')} • 
                            <Badge variant="secondary" className="ml-2">{activity.status}</Badge>
                            <Badge variant="outline" className="ml-2">{activity.registrations.length} registered</Badge>
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                          <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Filter by college" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Colleges</SelectItem>
                              {colleges.map(college => (
                                <SelectItem key={college.id} value={college.id}>
                                  {college.short_code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search students..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9 w-48"
                            />
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {filteredRegistrations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <Users className="h-12 w-12 mb-4 opacity-50" />
                          <p>No registrations found</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead className="w-[250px]">Student</TableHead>
                                <TableHead>Enrollment</TableHead>
                                <TableHead>College</TableHead>
                                <TableHead>WhatsApp</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Registered At</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredRegistrations.map((reg, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <SecureAvatar
                                        src={reg.profile.profile_photo_url}
                                        fallback={`${reg.profile.first_name[0]}${reg.profile.last_name[0] || ''}`}
                                        className="h-9 w-9"
                                      />
                                      <span className="font-medium">
                                        {reg.profile.first_name} {reg.profile.last_name}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <code className="px-2 py-1 rounded bg-muted text-sm">
                                      {reg.profile.enrollment_number || '-'}
                                    </code>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {reg.profile.college_name || '-'}
                                  </TableCell>
                                  <TableCell>{reg.profile.whatsapp_number || '-'}</TableCell>
                                  <TableCell className="text-sm">{reg.profile.email || '-'}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {format(new Date(reg.registered_at), 'PP')}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          {/* Activity Attendance Tab */}
          <TabsContent value="activity-attendance">
            <Card>
              <CardHeader>
                <CardTitle>Activity-wise Attendance</CardTitle>
                <CardDescription>Attendance breakdown by activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getActivityWiseAttendance().length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No attendance records</p>
                  ) : (
                    getActivityWiseAttendance().map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                        <div className="flex-1">
                          <p className="font-medium">{activity.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(activity.date), 'PPP')}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">{activity.present}/{activity.total}</p>
                            <p className="text-xs text-muted-foreground">Present</p>
                          </div>
                          <Badge variant={activity.percentage >= 75 ? 'success' : activity.percentage >= 50 ? 'warning' : 'danger'}>
                            {activity.percentage}%
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meeting Attendance Tab */}
          <TabsContent value="meeting-attendance">
            <Card>
              <CardHeader>
                <CardTitle>Meeting-wise Attendance</CardTitle>
                <CardDescription>Attendance breakdown by meeting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getMeetingWiseAttendance().length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No attendance records</p>
                  ) : (
                    getMeetingWiseAttendance().map((meeting) => (
                      <div key={meeting.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                        <div className="flex-1">
                          <p className="font-medium">{meeting.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(meeting.date), 'PPP')}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">{meeting.present}/{meeting.total}</p>
                            <p className="text-xs text-muted-foreground">Present</p>
                          </div>
                          <Badge variant={meeting.percentage >= 75 ? 'success' : meeting.percentage >= 50 ? 'warning' : 'danger'}>
                            {meeting.percentage}%
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
