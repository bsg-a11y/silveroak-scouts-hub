import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface LeaveRequest {
  id: string;
  user_id: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: string;
  admin_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user_name?: string;
  user_uid?: string;
}

export interface CreateLeaveRequestData {
  from_date: string;
  to_date: string;
  reason: string;
}

export function useLeaveRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isAdminOrCoordinator } = useAuth();

  const fetchLeaveRequests = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // If not admin, only fetch user's own requests
      if (!isAdminOrCoordinator && user) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user profiles for leave requests
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, uid')
        .in('user_id', userIds);

      const requestsWithNames = (data || []).map(request => {
        const profile = profiles?.find(p => p.user_id === request.user_id);
        return {
          ...request,
          user_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
          user_uid: profile?.uid || 'N/A',
        };
      });

      setLeaveRequests(requestsWithNames);
    } catch (error: any) {
      toast({
        title: 'Error fetching leave requests',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createLeaveRequest = async (data: CreateLeaveRequestData) => {
    if (!user) {
      toast({
        title: 'Please login to apply for leave',
        variant: 'destructive',
      });
      return { success: false };
    }

    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          user_id: user.id,
          from_date: data.from_date,
          to_date: data.to_date,
          reason: data.reason,
        });

      if (error) throw error;

      toast({
        title: 'Leave request submitted successfully',
      });

      await fetchLeaveRequests();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error submitting leave request',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const updateLeaveStatus = async (id: string, status: 'approved' | 'rejected', comment?: string) => {
    if (!user) return { success: false };

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status,
          admin_comment: comment || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: `Leave request ${status}`,
      });

      await fetchLeaveRequests();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error updating leave request',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeaveRequests();
    }
  }, [user, isAdminOrCoordinator]);

  return {
    leaveRequests,
    isLoading,
    fetchLeaveRequests,
    createLeaveRequest,
    updateLeaveStatus,
  };
}
