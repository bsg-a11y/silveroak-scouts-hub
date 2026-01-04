import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  agenda: string | null;
  mom_url: string | null;
  created_by: string | null;
  created_at: string;
  attendee_count?: number;
}

export interface MeetingAttendee {
  id: string;
  user_id: string;
  uid: string;
  first_name: string;
  last_name: string;
  enrollment_number: string | null;
  whatsapp_number: string | null;
  college_name: string | null;
  current_semester: number | null;
  marked_at: string;
  status: string;
}

export function useMeetings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const { data: meetingsData, error } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false });

      if (error) throw error;

      // Get attendee counts
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('meeting_id')
        .not('meeting_id', 'is', null);

      const meetingsWithCounts = (meetingsData || []).map(meeting => {
        const count = attendanceData?.filter(a => a.meeting_id === meeting.id).length || 0;
        return {
          ...meeting,
          attendee_count: count,
        };
      });

      return meetingsWithCounts as Meeting[];
    },
  });

  const createMeeting = useMutation({
    mutationFn: async (meeting: { title: string; meeting_date: string; meeting_time?: string; location?: string; agenda?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('meetings')
        .insert({ ...meeting, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast({ title: 'Success', description: 'Meeting created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meetings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast({ title: 'Success', description: 'Meeting deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const fetchMeetingAttendees = async (meetingId: string): Promise<MeetingAttendee[]> => {
    try {
      // First get attendance records
      const { data: attendanceRecords, error: attError } = await supabase
        .from('attendance')
        .select('id, user_id, marked_at, status')
        .eq('meeting_id', meetingId);

      if (attError || !attendanceRecords) {
        console.error('Error fetching attendance:', attError);
        return [];
      }

      // Then get profiles for those users
      const userIds = attendanceRecords.map(a => a.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, uid, first_name, last_name, enrollment_number, whatsapp_number, college_name, current_semester')
        .in('user_id', userIds);

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        return [];
      }

      // Combine the data
      return attendanceRecords.map((att) => {
        const profile = profiles?.find(p => p.user_id === att.user_id);
        return {
          id: att.id,
          user_id: att.user_id,
          marked_at: att.marked_at,
          status: att.status,
          uid: profile?.uid || 'N/A',
          first_name: profile?.first_name || 'Unknown',
          last_name: profile?.last_name || '',
          enrollment_number: profile?.enrollment_number || null,
          whatsapp_number: profile?.whatsapp_number || null,
          college_name: profile?.college_name || null,
          current_semester: profile?.current_semester || null,
        };
      });
    } catch (error) {
      console.error('Error fetching meeting attendees:', error);
      return [];
    }
  };

  return { meetings, isLoading, createMeeting, deleteMeeting, fetchMeetingAttendees };
}
