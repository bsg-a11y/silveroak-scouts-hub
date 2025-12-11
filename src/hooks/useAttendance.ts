import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  activity_id: string | null;
  meeting_id: string | null;
  status: string;
  marked_at: string;
  marked_by: string | null;
  profile?: {
    first_name: string;
    last_name: string;
    uid: string;
  };
}

export function useAttendance(activityId?: string, meetingId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['attendance', activityId, meetingId],
    queryFn: async () => {
      let query = supabase.from('attendance').select('*');

      if (activityId) query = query.eq('activity_id', activityId);
      if (meetingId) query = query.eq('meeting_id', meetingId);

      const { data, error } = await query.order('marked_at', { ascending: false });
      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, uid')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data.map(record => ({
        ...record,
        profile: profileMap.get(record.user_id),
      })) as AttendanceRecord[];
    },
    enabled: !!activityId || !!meetingId,
  });

  const markAttendance = useMutation({
    mutationFn: async (records: { user_id: string; status: string; activity_id?: string; meeting_id?: string }[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      const recordsWithMarker = records.map(r => ({ ...r, marked_by: user?.id }));
      
      const { error } = await supabase.from('attendance').insert(recordsWithMarker);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: 'Success', description: 'Attendance marked successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { attendance, isLoading, markAttendance };
}

export function useUserAttendance(userId?: string) {
  const { data: userAttendance = [], isLoading } = useQuery({
    queryKey: ['user-attendance', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId!)
        .order('marked_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  return { userAttendance, isLoading };
}
