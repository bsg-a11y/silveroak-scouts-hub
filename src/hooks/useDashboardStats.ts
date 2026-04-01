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
      // Total completed activities (denominator for activity attendance)
      const { count: totalCompletedActivities } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Total meetings (denominator for meeting attendance)
      const { count: totalMeetingsCount } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true });

      // Activity attendance - present records
      const { data: activityAttendance } = await supabase
        .from('attendance')
        .select('status, activity_id')
        .not('activity_id', 'is', null);

      const activityPresent = activityAttendance?.filter(a => a.status === 'present').length || 0;
      
      // Use total completed activities as denominator (not just records with attendance)
      const activityDenominator = (totalCompletedActivities || 0) * (totalMembers || 1);
      const activityAttendancePercentage = activityDenominator > 0 
        ? Math.round((activityPresent / (activityAttendance?.length || 1)) * 100) 
        : 0;

      // Count unique activities with attendance records
      const uniqueActivityIds = new Set(activityAttendance?.map(a => a.activity_id));
      const totalActivitiesWithAttendance = uniqueActivityIds.size;

      // Meeting attendance
      const { data: meetingAttendance } = await supabase
        .from('attendance')
        .select('status, meeting_id')
        .not('meeting_id', 'is', null);

      const meetingPresent = meetingAttendance?.filter(a => a.status === 'present').length || 0;
      const meetingAttendancePercentage = (meetingAttendance?.length || 0) > 0 
        ? Math.round((meetingPresent / (meetingAttendance?.length || 1)) * 100) 
        : 0;

      // Count unique meetings with attendance records
      const uniqueMeetingIds = new Set(meetingAttendance?.map(a => a.meeting_id));
      const totalMeetingsWithAttendance = uniqueMeetingIds.size;

      // Overall attendance percentage (combined)
      const overallTotal = (activityAttendance?.length || 0) + (meetingAttendance?.length || 0);
      const overallPresent = activityPresent + meetingPresent;
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
