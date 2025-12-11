import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Resource {
  id: string;
  name: string;
  category: string;
  total_quantity: number;
  available_quantity: number;
  unit: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceAssignment {
  id: string;
  resource_id: string;
  user_id: string;
  quantity: number;
  assigned_at: string;
  returned_at: string | null;
  resource?: Resource;
  profile?: {
    first_name: string;
    last_name: string;
    uid: string;
  };
}

export function useInventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      return data as Resource[];
    },
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['resource-assignments'],
    queryFn: async () => {
      const { data: assignmentData, error } = await supabase
        .from('resource_assignments')
        .select('*')
        .is('returned_at', null)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Fetch resources and profiles separately
      const resourceIds = [...new Set(assignmentData.map(a => a.resource_id))];
      const userIds = [...new Set(assignmentData.map(a => a.user_id))];

      const [{ data: resourcesData }, { data: profiles }] = await Promise.all([
        supabase.from('resources').select('*').in('id', resourceIds),
        supabase.from('profiles').select('user_id, first_name, last_name, uid').in('user_id', userIds),
      ]);

      const resourceMap = new Map(resourcesData?.map(r => [r.id, r]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return assignmentData.map(a => ({
        ...a,
        resource: resourceMap.get(a.resource_id),
        profile: profileMap.get(a.user_id),
      })) as ResourceAssignment[];
    },
  });

  const createResource = useMutation({
    mutationFn: async (resource: Omit<Resource, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('resources')
        .insert(resource)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast({ title: 'Success', description: 'Resource added successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const assignResource = useMutation({
    mutationFn: async (assignment: { resource_id: string; user_id: string; quantity: number }) => {
      // First update available quantity
      const resource = resources.find(r => r.id === assignment.resource_id);
      if (!resource) throw new Error('Resource not found');
      if (resource.available_quantity < assignment.quantity) throw new Error('Not enough stock');

      const { error: updateError } = await supabase
        .from('resources')
        .update({ available_quantity: resource.available_quantity - assignment.quantity })
        .eq('id', assignment.resource_id);

      if (updateError) throw updateError;

      const { error } = await supabase.from('resource_assignments').insert(assignment);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      toast({ title: 'Success', description: 'Resource assigned successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const returnResource = useMutation({
    mutationFn: async (assignmentId: string) => {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (!assignment) throw new Error('Assignment not found');

      const { error: returnError } = await supabase
        .from('resource_assignments')
        .update({ returned_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (returnError) throw returnError;

      const resource = resources.find(r => r.id === assignment.resource_id);
      if (resource) {
        await supabase
          .from('resources')
          .update({ available_quantity: resource.available_quantity + assignment.quantity })
          .eq('id', assignment.resource_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      toast({ title: 'Success', description: 'Resource returned successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { resources, assignments, isLoading, assignmentsLoading, createResource, assignResource, returnResource };
}
