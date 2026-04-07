import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExternalParticipant {
  id: string;
  activity_id: string | null;
  meeting_id: string | null;
  name: string;
  enrollment_number: string | null;
  college_name: string | null;
  department: string | null;
  semester: number | null;
  pdf_url: string | null;
  added_by: string | null;
  created_at: string;
}

export function useExternalParticipants(activityId?: string, meetingId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: participants = [], isLoading } = useQuery({
    queryKey: ['external-participants', activityId, meetingId],
    queryFn: async () => {
      let query = supabase.from('external_participants').select('*');
      if (activityId) query = query.eq('activity_id', activityId);
      if (meetingId) query = query.eq('meeting_id', meetingId);
      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw error;
      return data as ExternalParticipant[];
    },
    enabled: !!activityId || !!meetingId,
  });

  const addParticipant = useMutation({
    mutationFn: async (participant: {
      name: string;
      enrollment_number?: string;
      college_name?: string;
      department?: string;
      semester?: number;
      activity_id?: string;
      meeting_id?: string;
      pdf_url?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('external_participants').insert({
        ...participant,
        added_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-participants'] });
      toast({ title: 'Success', description: 'External participant added' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateParticipant = useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      name?: string;
      enrollment_number?: string;
      college_name?: string;
      department?: string;
      semester?: number;
    }) => {
      const { error } = await supabase.from('external_participants').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-participants'] });
      toast({ title: 'Success', description: 'Participant updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteParticipant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('external_participants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-participants'] });
      toast({ title: 'Success', description: 'Participant removed' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const uploadPdf = async (file: File, activityId?: string, meetingId?: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const filePath = `external-participants/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('documents').upload(filePath, file);
    if (error) {
      toast({ title: 'Error', description: 'Failed to upload PDF', variant: 'destructive' });
      return null;
    }
    const { data: { user } } = await supabase.auth.getUser();
    // Save a record with just the PDF
    await supabase.from('external_participants').insert({
      name: `PDF Upload: ${file.name}`,
      pdf_url: filePath,
      activity_id: activityId || null,
      meeting_id: meetingId || null,
      added_by: user?.id,
    });
    queryClient.invalidateQueries({ queryKey: ['external-participants'] });
    toast({ title: 'Success', description: 'PDF uploaded successfully' });
    return filePath;
  };

  return { participants, isLoading, addParticipant, updateParticipant, deleteParticipant, uploadPdf };
}
