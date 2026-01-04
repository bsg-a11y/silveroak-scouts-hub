import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  upcomingActivities: number;
  pendingLeaveRequests: number;
  lowStockItems: number;
  attendancePercentage: number;
  activityRegistrations: number;
  upcomingMeetings: number;
  meetingAttendees: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    upcomingActivities: 0,
    pendingLeaveRequests: 0,
    lowStockItems: 0,
    attendancePercentage: 0,
    activityRegistrations: 0,
    upcomingMeetings: 0,
    meetingAttendees: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch members count (excluding program officer)
      const { count: totalMembers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('is_program_officer', true);

      const { count: activeMembers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .neq('is_program_officer', true);

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

      // Calculate attendance percentage (present / total * 100)
      const { count: totalAttendance } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true });

      const { count: presentCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'present');

      const attendancePercentage = totalAttendance 
        ? Math.round((presentCount || 0) / totalAttendance * 100) 
        : 0;

      setStats({
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        upcomingActivities: upcomingActivities || 0,
        pendingLeaveRequests: pendingLeaveRequests || 0,
        lowStockItems: lowStockItems || 0,
        attendancePercentage,
        activityRegistrations,
        upcomingMeetings: upcomingMeetings || 0,
        meetingAttendees,
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
