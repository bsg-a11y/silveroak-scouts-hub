import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CertificateRequest {
  id: string;
  user_id: string;
  activity_id: string | null;
  reason: string;
  status: string;
  admin_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profile?: {
    first_name: string;
    last_name: string;
    uid: string;
  };
  activity?: {
    name: string;
    activity_date: string;
  };
}

export function useCertificateRequests(userId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['certificate-requests', userId],
    queryFn: async () => {
      let query = supabase
        .from('certificate_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles and activities separately
      const userIds = [...new Set(data.map(r => r.user_id))];
      const activityIds = [...new Set(data.filter(r => r.activity_id).map(r => r.activity_id!))];

      const [profilesResult, activitiesResult] = await Promise.all([
        supabase.from('profiles').select('user_id, first_name, last_name, uid').in('user_id', userIds),
        activityIds.length > 0 
          ? supabase.from('activities').select('id, name, activity_date').in('id', activityIds)
          : { data: [] }
      ]);

      const profileMap = new Map<string, { user_id: string; first_name: string; last_name: string; uid: string }>();
      profilesResult.data?.forEach(p => profileMap.set(p.user_id, p));
      
      const activityMap = new Map<string, { id: string; name: string; activity_date: string }>();
      activitiesResult.data?.forEach(a => activityMap.set(a.id, a));

      return data.map(req => ({
        ...req,
        profile: profileMap.get(req.user_id),
        activity: req.activity_id ? activityMap.get(req.activity_id) : undefined,
      })) as CertificateRequest[];
    },
  });

  const createRequest = useMutation({
    mutationFn: async ({ activity_id, reason }: { activity_id: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('certificate_requests').insert({
        user_id: user.id,
        activity_id,
        reason,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-requests'] });
      toast({ title: 'Success', description: 'Certificate request submitted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, status, admin_comment }: { id: string; status: string; admin_comment?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('certificate_requests')
        .update({
          status,
          admin_comment,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-requests'] });
      toast({ title: 'Success', description: 'Request updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { requests, isLoading, createRequest, updateRequest };
}
