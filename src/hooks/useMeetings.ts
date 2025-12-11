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
}

export function useMeetings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      return data as Meeting[];
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

  return { meetings, isLoading, createMeeting, deleteMeeting };
}
