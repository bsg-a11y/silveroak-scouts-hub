import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ClipboardCheck, Calendar, Users, CalendarCheck, CalendarX, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useActivities } from '@/hooks/useActivities';
import { useMeetings } from '@/hooks/useMeetings';
import { useMembers } from '@/hooks/useMembers';
import { useAttendance, useUserAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface EnrichedAttendance {
  id: string;
  status: string;
  marked_at: string;
  activity_id: string | null;
  meeting_id: string | null;
  activity?: { name: string; activity_date: string };
  meeting?: { title: string; meeting_date: string };
}

export default function Attendance() {
  const { activities } = useActivities();
  const { meetings } = useMeetings();
  const { members } = useMembers();
  const { isAdminOrCoordinator, user } = useAuth();
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [myAttendance, setMyAttendance] = useState<EnrichedAttendance[]>([]);
  const [isLoadingMyAttendance, setIsLoadingMyAttendance] = useState(false);

  const { attendance, markAttendance } = useAttendance(
    selectedActivity || undefined,
    selectedMeeting || undefined
  );

  const activeMembers = members.filter(m => m.status === 'active');

  // Fetch user's attendance with activity/meeting details
  useEffect(() => {
    if (user && !isAdminOrCoordinator) {
      fetchMyAttendance();
    }
  }, [user, isAdminOrCoordinator]);

  const fetchMyAttendance = async () => {
    if (!user) return;
    setIsLoadingMyAttendance(true);
    
    try {
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('id, status, marked_at, activity_id, meeting_id')
        .eq('user_id', user.id)
        .order('marked_at', { ascending: false });

      if (!attendanceData) {
        setMyAttendance([]);
        return;
      }

      // Get unique activity and meeting IDs
      const activityIds = [...new Set(attendanceData.filter(a => a.activity_id).map(a => a.activity_id!))];
      const meetingIds = [...new Set(attendanceData.filter(a => a.meeting_id).map(a => a.meeting_id!))];

      const [activitiesResult, meetingsResult] = await Promise.all([
        activityIds.length > 0 
          ? supabase.from('activities').select('id, name, activity_date').in('id', activityIds)
          : { data: [] },
        meetingIds.length > 0 
          ? supabase.from('meetings').select('id, title, meeting_date').in('id', meetingIds)
          : { data: [] },
      ]);

      const activityMap = new Map<string, { id: string; name: string; activity_date: string }>();
      activitiesResult.data?.forEach(a => activityMap.set(a.id, a));
      
      const meetingMap = new Map<string, { id: string; title: string; meeting_date: string }>();
      meetingsResult.data?.forEach(m => meetingMap.set(m.id, m));

      setMyAttendance(attendanceData.map(a => ({
        id: a.id,
        status: a.status,
        marked_at: a.marked_at,
        activity_id: a.activity_id,
        meeting_id: a.meeting_id,
        activity: a.activity_id ? activityMap.get(a.activity_id) : undefined,
        meeting: a.meeting_id ? meetingMap.get(a.meeting_id) : undefined,
      })));
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setIsLoadingMyAttendance(false);
    }
  };

  const handleMarkAttendance = async () => {
    const records = Object.entries(attendanceData).map(([user_id, status]) => ({
      user_id,
      status,
      activity_id: selectedActivity || undefined,
      meeting_id: selectedMeeting || undefined,
    }));

    await markAttendance.mutateAsync(records);
    setAttendanceData({});
  };

  const toggleAttendance = (userId: string, currentStatus: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [userId]: currentStatus === 'present' ? 'absent' : 'present',
    }));
  };

  // Calculate my attendance stats
  const myActivityAttendance = myAttendance.filter(a => a.activity_id);
  const myMeetingAttendance = myAttendance.filter(a => a.meeting_id);
  const myActivityPresent = myActivityAttendance.filter(a => a.status === 'present').length;
  const myMeetingPresent = myMeetingAttendance.filter(a => a.status === 'present').length;
  const myActivityPercentage = myActivityAttendance.length > 0 
    ? Math.round((myActivityPresent / myActivityAttendance.length) * 100) : 0;
  const myMeetingPercentage = myMeetingAttendance.length > 0 
    ? Math.round((myMeetingPresent / myMeetingAttendance.length) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Attendance</h1>
          <p className="text-muted-foreground mt-1">Track and manage attendance records</p>
        </div>

        <Tabs defaultValue={isAdminOrCoordinator ? "activities" : "my-attendance"} className="space-y-6">
          <TabsList>
            {!isAdminOrCoordinator && (
              <TabsTrigger value="my-attendance">My Attendance</TabsTrigger>
            )}
            {isAdminOrCoordinator && (
              <>
                <TabsTrigger value="activities">Activity Attendance</TabsTrigger>
                <TabsTrigger value="meetings">Meeting Attendance</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* My Attendance Tab (for non-admin users) */}
          {!isAdminOrCoordinator && (
            <TabsContent value="my-attendance" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Activity Attendance</span>
                      <span className="text-2xl font-bold text-bsg-green">{myActivityPercentage}%</span>
                    </div>
                    <Progress value={myActivityPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {myActivityPresent} of {myActivityAttendance.length} activities
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Meeting Attendance</span>
                      <span className="text-2xl font-bold text-accent">{myMeetingPercentage}%</span>
                    </div>
                    <Progress value={myMeetingPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {myMeetingPresent} of {myMeetingAttendance.length} meetings
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Overall</span>
                      <span className="text-2xl font-bold text-primary">
                        {myAttendance.length > 0 
                          ? Math.round(((myActivityPresent + myMeetingPresent) / myAttendance.length) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={myAttendance.length > 0 
                        ? ((myActivityPresent + myMeetingPresent) / myAttendance.length) * 100
                        : 0} 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {myActivityPresent + myMeetingPresent} of {myAttendance.length} total
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Attendance History */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance History</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMyAttendance ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : myAttendance.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No attendance records found</p>
                  ) : (
                    <div className="space-y-2">
                      {myAttendance.map((record) => (
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
                                {record.activity?.name || record.meeting?.title || 'Unknown'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {record.activity?.activity_date || record.meeting?.meeting_date 
                                  ? format(new Date(record.activity?.activity_date || record.meeting?.meeting_date!), 'MMM d, yyyy')
                                  : format(new Date(record.marked_at), 'MMM d, yyyy')}
                                {' • '}
                                {record.activity_id ? 'Activity' : 'Meeting'}
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
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Admin tabs for marking attendance */}
          {isAdminOrCoordinator && (
            <>
              <TabsContent value="activities" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Select Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an activity" />
                      </SelectTrigger>
                      <SelectContent>
                        {activities.map((activity) => (
                          <SelectItem key={activity.id} value={activity.id}>
                            {activity.name} - {format(new Date(activity.activity_date), 'MMM d, yyyy')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {selectedActivity && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Mark Attendance
                        </div>
                        <Button
                          size="sm"
                          onClick={handleMarkAttendance}
                          disabled={Object.keys(attendanceData).length === 0 || markAttendance.isPending}
                        >
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          Save Attendance
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {activeMembers.map((member) => {
                          const existingRecord = attendance.find(a => a.user_id === member.user_id);
                          const currentStatus = attendanceData[member.user_id] || existingRecord?.status || 'absent';
                          
                          return (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={currentStatus === 'present'}
                                  onCheckedChange={() => toggleAttendance(member.user_id, currentStatus)}
                                  disabled={!!existingRecord}
                                />
                                <div>
                                  <p className="font-medium">{member.first_name} {member.last_name}</p>
                                  <p className="text-sm text-muted-foreground">{member.uid}</p>
                                </div>
                              </div>
                              <Badge variant={currentStatus === 'present' ? 'success' : 'danger'}>
                                {currentStatus === 'present' ? 'Present' : 'Absent'}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedActivity && attendance.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Attendance Record</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {attendance.map((record) => (
                          <div
                            key={record.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/50"
                          >
                            <div>
                              <p className="font-medium">
                                {record.profile?.first_name} {record.profile?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{record.profile?.uid}</p>
                            </div>
                            <Badge variant={record.status === 'present' ? 'success' : 'danger'}>
                              {record.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="meetings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Select Meeting
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedMeeting} onValueChange={setSelectedMeeting}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a meeting" />
                      </SelectTrigger>
                      <SelectContent>
                        {meetings.map((meeting) => (
                          <SelectItem key={meeting.id} value={meeting.id}>
                            {meeting.title} - {format(new Date(meeting.meeting_date), 'MMM d, yyyy')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {selectedMeeting && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Mark Attendance
                        </div>
                        <Button
                          size="sm"
                          onClick={handleMarkAttendance}
                          disabled={Object.keys(attendanceData).length === 0 || markAttendance.isPending}
                        >
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          Save Attendance
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {activeMembers.map((member) => {
                          const existingRecord = attendance.find(a => a.user_id === member.user_id);
                          const currentStatus = attendanceData[member.user_id] || existingRecord?.status || 'absent';
                          
                          return (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={currentStatus === 'present'}
                                  onCheckedChange={() => toggleAttendance(member.user_id, currentStatus)}
                                  disabled={!!existingRecord}
                                />
                                <div>
                                  <p className="font-medium">{member.first_name} {member.last_name}</p>
                                  <p className="text-sm text-muted-foreground">{member.uid}</p>
                                </div>
                              </div>
                              <Badge variant={currentStatus === 'present' ? 'success' : 'danger'}>
                                {currentStatus === 'present' ? 'Present' : 'Absent'}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
