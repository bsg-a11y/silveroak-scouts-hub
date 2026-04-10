import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  upcomingActivities: number;
  pendingLeaveRequests: number;
  lowStockItems: number;
  attendancePercentage: number;
  activityAttendancePercentage: number;
  meetingAttendancePercentage: number;
  activityRegistrations: number;
  upcomingMeetings: number;
  meetingAttendees: number;
  totalActivitiesWithAttendance: number;
  totalMeetingsWithAttendance: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    upcomingActivities: 0,
    pendingLeaveRequests: 0,
    lowStockItems: 0,
    attendancePercentage: 0,
    activityAttendancePercentage: 0,
    meetingAttendancePercentage: 0,
    activityRegistrations: 0,
    upcomingMeetings: 0,
    meetingAttendees: 0,
    totalActivitiesWithAttendance: 0,
    totalMeetingsWithAttendance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get faculty coordinator user IDs to exclude from member counts
      const { data: facultyRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'faculty_coordinator');
      
      const facultyUserIds = facultyRoles?.map(r => r.user_id) || [];

      // Fetch members count (excluding program officer and faculty coordinators)
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id, status, is_program_officer');
      
      const regularProfiles = (allProfiles || []).filter(p => 
        !p.is_program_officer && !facultyUserIds.includes(p.user_id)
      );
      
      const totalMembers = regularProfiles.length;
      const activeMembers = regularProfiles.filter(p => p.status === 'active').length;

      // Fetch upcoming activities count
      const { count: upcomingActivities } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .gte('activity_date', today)
        .eq('status', 'upcoming');

      // Fetch activity registrations for upcoming activities
      const { data: upcomingActivityIds } = await supabase
        .from('activities')
        .select('id')
        .gte('activity_date', today)
        .eq('status', 'upcoming');

      let activityRegistrations = 0;
      if (upcomingActivityIds && upcomingActivityIds.length > 0) {
        const { count } = await supabase
          .from('activity_registrations')
          .select('*', { count: 'exact', head: true })
          .in('activity_id', upcomingActivityIds.map(a => a.id));
        activityRegistrations = count || 0;
      }

      // Fetch upcoming meetings count
      const { count: upcomingMeetings } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .gte('meeting_date', today);

      // Fetch meeting attendees (attendance records for upcoming meetings)
      const { data: upcomingMeetingIds } = await supabase
        .from('meetings')
        .select('id')
        .gte('meeting_date', today);

      let meetingAttendees = 0;
      if (upcomingMeetingIds && upcomingMeetingIds.length > 0) {
        const { count } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .in('meeting_id', upcomingMeetingIds.map(m => m.id));
        meetingAttendees = count || 0;
      }

      // Fetch pending leave requests
      const { count: pendingLeaveRequests } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch low stock resources
      const { count: lowStockItems } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .lt('available_quantity', 10);

      // Calculate REAL attendance percentages from actual attendance records
      // Total completed activities (denominator)
      const { data: completedActivitiesData } = await supabase
        .from('activities')
        .select('id')
        .eq('status', 'completed');

      const totalCompletedActivities = completedActivitiesData?.length || 0;

      // Total meetings up to today (denominator)
      const { data: pastMeetingsData } = await supabase
        .from('meetings')
        .select('id')
        .lte('meeting_date', today);

      const totalPastMeetings = pastMeetingsData?.length || 0;

      // Activity attendance - present records
      const { data: activityAttendance } = await supabase
        .from('attendance')
        .select('status, activity_id')
        .not('activity_id', 'is', null);

      // Count unique activities where at least one member was present
      const activitiesWithPresent = new Set(
        activityAttendance?.filter(a => a.status === 'present').map(a => a.activity_id)
      );
      const totalActivitiesWithAttendance = new Set(activityAttendance?.map(a => a.activity_id)).size;

      const activityAttendancePercentage = totalCompletedActivities > 0
        ? Math.round((activitiesWithPresent.size / totalCompletedActivities) * 100)
        : 0;

      // Meeting attendance
      const { data: meetingAttendance } = await supabase
        .from('attendance')
        .select('status, meeting_id')
        .not('meeting_id', 'is', null);

      const meetingsWithPresent = new Set(
        meetingAttendance?.filter(a => a.status === 'present').map(a => a.meeting_id)
      );
      const totalMeetingsWithAttendance = new Set(meetingAttendance?.map(a => a.meeting_id)).size;

      const meetingAttendancePercentage = totalPastMeetings > 0
        ? Math.round((meetingsWithPresent.size / totalPastMeetings) * 100)
        : 0;

      // Overall attendance percentage (combined)
      const overallTotal = totalCompletedActivities + totalPastMeetings;
      const overallPresent = activitiesWithPresent.size + meetingsWithPresent.size;
      const attendancePercentage = overallTotal > 0 
        ? Math.round((overallPresent / overallTotal) * 100) 
        : 0;

      setStats({
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        upcomingActivities: upcomingActivities || 0,
        pendingLeaveRequests: pendingLeaveRequests || 0,
        lowStockItems: lowStockItems || 0,
        attendancePercentage,
        activityAttendancePercentage,
        meetingAttendancePercentage,
        activityRegistrations,
        upcomingMeetings: upcomingMeetings || 0,
        meetingAttendees,
        totalActivitiesWithAttendance,
        totalMeetingsWithAttendance,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, isLoading, refreshStats: fetchStats };
}
