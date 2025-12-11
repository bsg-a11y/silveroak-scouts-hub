import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ClipboardCheck, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useActivities } from '@/hooks/useActivities';
import { useMeetings } from '@/hooks/useMeetings';
import { useMembers } from '@/hooks/useMembers';
import { useAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';

export default function Attendance() {
  const { activities } = useActivities();
  const { meetings } = useMeetings();
  const { members } = useMembers();
  const { isAdminOrCoordinator } = useAuth();
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});

  const { attendance, markAttendance } = useAttendance(
    selectedActivity || undefined,
    selectedMeeting || undefined
  );

  const activeMembers = members.filter(m => m.status === 'active');

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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Attendance</h1>
          <p className="text-muted-foreground mt-1">Track and manage attendance records</p>
        </div>

        <Tabs defaultValue="activities" className="space-y-6">
          <TabsList>
            <TabsTrigger value="activities">Activity Attendance</TabsTrigger>
            <TabsTrigger value="meetings">Meeting Attendance</TabsTrigger>
          </TabsList>

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

            {selectedActivity && isAdminOrCoordinator && (
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
                          <Badge variant={currentStatus === 'present' ? 'success' : 'secondary'}>
                            {currentStatus}
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

            {selectedMeeting && isAdminOrCoordinator && (
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
                          <Badge variant={currentStatus === 'present' ? 'success' : 'secondary'}>
                            {currentStatus}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
