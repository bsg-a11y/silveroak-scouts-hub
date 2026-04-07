import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ExternalParticipantsManager } from '@/components/ExternalParticipantsManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClipboardCheck, Calendar, Users, CalendarCheck, CalendarX, Loader2, Search, Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [meetingSearchQuery, setMeetingSearchQuery] = useState('');

  // Stats for member view
  const [totalCompletedActivities, setTotalCompletedActivities] = useState(0);
  const [totalMeetings, setTotalMeetings] = useState(0);

  const { attendance, markAttendance } = useAttendance(
    selectedActivity || undefined,
    selectedMeeting || undefined
  );

  const activeMembers = members.filter(m => m.status === 'active');

  // Filter members by search for activity attendance marking
  const filteredActivityMembers = useMemo(() => {
    if (!searchQuery.trim()) return activeMembers;
    const q = searchQuery.toLowerCase();
    return activeMembers.filter(m =>
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q) ||
      m.uid.toLowerCase().includes(q) ||
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)
    );
  }, [activeMembers, searchQuery]);

  // Filter members by search for meeting attendance marking
  const filteredMeetingMembers = useMemo(() => {
    if (!meetingSearchQuery.trim()) return activeMembers;
    const q = meetingSearchQuery.toLowerCase();
    return activeMembers.filter(m =>
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q) ||
      m.uid.toLowerCase().includes(q) ||
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)
    );
  }, [activeMembers, meetingSearchQuery]);

  // Fetch user's attendance with activity/meeting details + totals
  useEffect(() => {
    if (user && !isAdminOrCoordinator) {
      fetchMyAttendance();
    }
  }, [user, isAdminOrCoordinator]);

  const fetchMyAttendance = async () => {
    if (!user) return;
    setIsLoadingMyAttendance(true);

    try {
      // Fetch total completed activities
      const { count: completedCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      setTotalCompletedActivities(completedCount || 0);

      // Fetch total meetings
      const { count: meetingsCount } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true });

      setTotalMeetings(meetingsCount || 0);

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('id, status, marked_at, activity_id, meeting_id')
        .eq('user_id', user.id)
        .order('marked_at', { ascending: false });

      if (!attendanceData) {
        setMyAttendance([]);
        return;
      }

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

  // Calculate my attendance stats - against total completed activities/meetings
  const myActivityPresent = myAttendance.filter(a => a.activity_id && a.status === 'present').length;
  const myMeetingPresent = myAttendance.filter(a => a.meeting_id && a.status === 'present').length;
  const myActivityPercentage = totalCompletedActivities > 0
    ? Math.round((myActivityPresent / totalCompletedActivities) * 100) : 0;
  const myMeetingPercentage = totalMeetings > 0
    ? Math.round((myMeetingPresent / totalMeetings) * 100) : 0;
  const totalEvents = totalCompletedActivities + totalMeetings;
  const totalPresent = myActivityPresent + myMeetingPresent;
  const overallPercentage = totalEvents > 0 ? Math.round((totalPresent / totalEvents) * 100) : 0;

  // --- Download helpers ---
  const getSelectedActivityName = () => {
    const act = activities.find(a => a.id === selectedActivity);
    return act ? `${act.name} - ${format(new Date(act.activity_date), 'dd MMM yyyy')}` : 'Activity';
  };

  const getSelectedMeetingName = () => {
    const mtg = meetings.find(m => m.id === selectedMeeting);
    return mtg ? `${mtg.title} - ${format(new Date(mtg.meeting_date), 'dd MMM yyyy')}` : 'Meeting';
  };

  const downloadAttendanceExcel = (type: 'activity' | 'meeting') => {
    const eventName = type === 'activity' ? getSelectedActivityName() : getSelectedMeetingName();
    const records = attendance;

    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        <h2>Attendance Report</h2>
        <p><strong>${type === 'activity' ? 'Activity' : 'Meeting'}:</strong> ${eventName}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <table border="1">
          <thead>
            <tr>
              <th style="background:#f0f0f0;font-weight:bold;">S.No</th>
              <th style="background:#f0f0f0;font-weight:bold;">BSG ID</th>
              <th style="background:#f0f0f0;font-weight:bold;">Name</th>
              <th style="background:#f0f0f0;font-weight:bold;">Status</th>
              <th style="background:#f0f0f0;font-weight:bold;">Marked At</th>
            </tr>
          </thead>
          <tbody>
            ${records.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${r.profile?.uid || '-'}</td>
                <td>${r.profile?.first_name || ''} ${r.profile?.last_name || ''}</td>
                <td>${r.status}</td>
                <td>${format(new Date(r.marked_at), 'dd/MM/yyyy hh:mm a')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p><strong>Total:</strong> ${records.length} | <strong>Present:</strong> ${records.filter(r => r.status === 'present').length} | <strong>Absent:</strong> ${records.filter(r => r.status === 'absent').length}</p>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${type}_${Date.now()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAttendancePDF = (type: 'activity' | 'meeting') => {
    const eventName = type === 'activity' ? getSelectedActivityName() : getSelectedMeetingName();
    const records = attendance;
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1a4d2e; }
          .header h1 { color: #1a4d2e; font-size: 24px; margin-bottom: 4px; }
          .header h2 { color: #555; font-size: 16px; font-weight: normal; }
          .event-info { background: #f8faf8; border: 1px solid #e0e8e0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
          .event-info h3 { color: #1a4d2e; font-size: 18px; margin-bottom: 8px; }
          .event-info p { color: #666; font-size: 13px; margin: 4px 0; }
          .stats-row { display: flex; gap: 16px; margin-bottom: 24px; }
          .stat-box { flex: 1; text-align: center; padding: 12px; border-radius: 8px; }
          .stat-box.total { background: #e8f0fe; color: #1a4d2e; }
          .stat-box.present { background: #e6f7e6; color: #166534; }
          .stat-box.absent { background: #fde8e8; color: #991b1b; }
          .stat-box .num { font-size: 28px; font-weight: bold; }
          .stat-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1a4d2e; color: white; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
          tr:nth-child(even) { background: #fafafa; }
          .status-present { color: #166534; font-weight: 600; }
          .status-absent { color: #991b1b; font-weight: 600; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>The Bharat Scouts & Guides</h1>
          <h2>Silver Oak University — Attendance Report</h2>
        </div>
        <div class="event-info">
          <h3>${eventName}</h3>
          <p><strong>Type:</strong> ${type === 'activity' ? 'Activity' : 'Meeting'}</p>
          <p><strong>Report Generated:</strong> ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
        </div>
        <div class="stats-row">
          <div class="stat-box total"><div class="num">${records.length}</div><div class="label">Total</div></div>
          <div class="stat-box present"><div class="num">${presentCount}</div><div class="label">Present</div></div>
          <div class="stat-box absent"><div class="num">${absentCount}</div><div class="label">Absent</div></div>
        </div>
        <table>
          <thead>
            <tr><th>S.No</th><th>BSG ID</th><th>Name</th><th>Status</th><th>Marked At</th></tr>
          </thead>
          <tbody>
            ${records.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${r.profile?.uid || '-'}</td>
                <td>${r.profile?.first_name || ''} ${r.profile?.last_name || ''}</td>
                <td class="status-${r.status}">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</td>
                <td>${format(new Date(r.marked_at), 'dd MMM yyyy, hh:mm a')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">BSG Silver Oak University Administration Portal • Generated on ${format(new Date(), 'dd MMM yyyy')}</div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const renderDownloadButton = (type: 'activity' | 'meeting') => {
    if (attendance.length === 0) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => downloadAttendancePDF(type)}>
            <FileText className="h-4 w-4 mr-2" />
            Print / PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadAttendanceExcel(type)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export as Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Activity Attendance</span>
                      <span className="text-2xl font-bold text-bsg-green">{myActivityPercentage}%</span>
                    </div>
                    <Progress value={myActivityPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {myActivityPresent} of {totalCompletedActivities} completed activities
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
                      {myMeetingPresent} of {totalMeetings} meetings
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Overall</span>
                      <span className="text-2xl font-bold text-primary">{overallPercentage}%</span>
                    </div>
                    <Progress value={overallPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {totalPresent} of {totalEvents} total events
                    </p>
                  </CardContent>
                </Card>
              </div>

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

          {/* Admin tabs */}
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
                    <Select value={selectedActivity} onValueChange={(v) => { setSelectedActivity(v); setAttendanceData({}); setSearchQuery(''); }}>
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
                        <div className="flex items-center gap-2">
                          {renderDownloadButton('activity')}
                          <Button
                            size="sm"
                            onClick={handleMarkAttendance}
                            disabled={Object.keys(attendanceData).length === 0 || markAttendance.isPending}
                          >
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                            Save Attendance
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by name or BSG ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {filteredActivityMembers.map((member) => {
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
                        {filteredActivityMembers.length === 0 && (
                          <p className="text-center text-muted-foreground py-4">No members found matching "{searchQuery}"</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedActivity && attendance.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Attendance Record</span>
                        {renderDownloadButton('activity')}
                      </CardTitle>
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

                {selectedActivity && (
                  <ExternalParticipantsManager
                    activityId={selectedActivity}
                    eventName={getSelectedActivityName()}
                    eventType="activity"
                    memberAttendance={attendance.map(a => ({
                      name: `${a.profile?.first_name || ''} ${a.profile?.last_name || ''}`,
                      uid: a.profile?.uid || '-',
                      status: a.status,
                      college_name: a.profile?.college_name,
                      academic_department: a.profile?.academic_department,
                      current_semester: a.profile?.current_semester,
                      enrollment_number: a.profile?.enrollment_number,
                    }))}
                  />
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
                    <Select value={selectedMeeting} onValueChange={(v) => { setSelectedMeeting(v); setAttendanceData({}); setMeetingSearchQuery(''); }}>
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
                        <div className="flex items-center gap-2">
                          {renderDownloadButton('meeting')}
                          <Button
                            size="sm"
                            onClick={handleMarkAttendance}
                            disabled={Object.keys(attendanceData).length === 0 || markAttendance.isPending}
                          >
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                            Save Attendance
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by name or BSG ID..."
                            value={meetingSearchQuery}
                            onChange={(e) => setMeetingSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {filteredMeetingMembers.map((member) => {
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
                        {filteredMeetingMembers.length === 0 && (
                          <p className="text-center text-muted-foreground py-4">No members found matching "{meetingSearchQuery}"</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedMeeting && (
                  <ExternalParticipantsManager
                    meetingId={selectedMeeting}
                    eventName={getSelectedMeetingName()}
                    eventType="meeting"
                    memberAttendance={attendance.map(a => ({
                      name: `${a.profile?.first_name || ''} ${a.profile?.last_name || ''}`,
                      uid: a.profile?.uid || '-',
                      status: a.status,
                    }))}
                  />
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}