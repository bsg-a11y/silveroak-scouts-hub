import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Certificate {
  id: string;
  name: string;
  event_name: string;
  user_id: string;
  issue_date: string;
  certificate_url: string | null;
  created_by: string | null;
  created_at: string;
  profile?: {
    first_name: string;
    last_name: string;
    uid: string;
  };
}

export function useCertificates(userId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['certificates', userId],
    queryFn: async () => {
      let query = supabase.from('certificates').select('*').order('issue_date', { ascending: false });

      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, uid')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data.map(cert => ({
        ...cert,
        profile: profileMap.get(cert.user_id),
      })) as Certificate[];
    },
  });

  const createCertificate = useMutation({
    mutationFn: async (cert: { name: string; event_name: string; user_id: string; issue_date: string; certificate_url?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('certificates')
        .insert({ ...cert, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast({ title: 'Success', description: 'Certificate created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCertificate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('certificates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast({ title: 'Success', description: 'Certificate deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { certificates, isLoading, createCertificate, deleteCertificate };
}
