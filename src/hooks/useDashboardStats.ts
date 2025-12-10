import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  upcomingActivities: number;
  pendingLeaveRequests: number;
  lowStockItems: number;
  attendancePercentage: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    upcomingActivities: 0,
    pendingLeaveRequests: 0,
    lowStockItems: 0,
    attendancePercentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Fetch members count
      const { count: totalMembers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: activeMembers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch upcoming activities count
      const today = new Date().toISOString().split('T')[0];
      const { count: upcomingActivities } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .gte('activity_date', today)
        .eq('status', 'upcoming');

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
