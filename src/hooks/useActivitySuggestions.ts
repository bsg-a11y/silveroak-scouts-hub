import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ActivitySuggestion {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  suggested_date: string | null;
  status: string;
  admin_response: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profile?: {
    first_name: string;
    last_name: string;
    uid: string;
    whatsapp_number: string | null;
  };
}

export interface CreateSuggestionData {
  title: string;
  description?: string;
  suggested_date?: string;
}

export function useActivitySuggestions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['activity-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, uid, whatsapp_number')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(suggestion => ({
        ...suggestion,
        profile: profileMap.get(suggestion.user_id),
      })) as ActivitySuggestion[];
    },
  });

  const createSuggestion = useMutation({
    mutationFn: async (data: CreateSuggestionData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('activity_suggestions').insert({
        user_id: user.id,
        title: data.title,
        description: data.description || null,
        suggested_date: data.suggested_date || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-suggestions'] });
      toast({ title: 'Success', description: 'Activity suggestion submitted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateSuggestion = useMutation({
    mutationFn: async ({ id, status, admin_response }: { id: string; status: string; admin_response?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('activity_suggestions')
        .update({
          status,
          admin_response: admin_response || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-suggestions'] });
      toast({ title: 'Success', description: 'Suggestion updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteSuggestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('activity_suggestions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-suggestions'] });
      toast({ title: 'Success', description: 'Suggestion deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { suggestions, isLoading, createSuggestion, updateSuggestion, deleteSuggestion };
}
