import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { activitySchema } from '@/lib/validations';

export interface Activity {
  id: string;
  name: string;
  description: string | null;
  activity_date: string;
  activity_time: string | null;
  location: string | null;
  status: string;
  registration_enabled: boolean;
  capacity: number | null;
  created_by: string | null;
  created_at: string;
  registered_count?: number;
  is_registered?: boolean;
}

export interface CreateActivityData {
  name: string;
  description?: string;
  activity_date: string;
  activity_time?: string;
  location?: string;
  status?: string;
  registration_enabled?: boolean;
  capacity?: number;
}

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .order('activity_date', { ascending: true });

      if (activitiesError) throw activitiesError;

      // Get registration counts
      const { data: registrations, error: regError } = await supabase
        .from('activity_registrations')
        .select('activity_id');

      if (regError) throw regError;

      // Get user's registrations
      const { data: userRegistrations, error: userRegError } = await supabase
        .from('activity_registrations')
        .select('activity_id')
        .eq('user_id', user?.id || '');

      // Map registration counts to activities
      const activitiesWithCounts = (activitiesData || []).map(activity => {
        const count = registrations?.filter(r => r.activity_id === activity.id).length || 0;
        const isRegistered = userRegistrations?.some(r => r.activity_id === activity.id) || false;
        return {
          ...activity,
          registered_count: count,
          is_registered: isRegistered,
        };
      });

      setActivities(activitiesWithCounts);
    } catch (error: any) {
      toast({
        title: 'Error fetching activities',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createActivity = async (data: CreateActivityData) => {
    // Validate input data
    const result = activitySchema.safeParse({
      name: data.name,
      description: data.description,
      activity_date: data.activity_date,
      activity_time: data.activity_time,
      location: data.location,
      capacity: data.capacity,
      registration_enabled: data.registration_enabled,
    });

    if (!result.success) {
      const errorMsg = result.error.errors.map(e => e.message).join(', ');
      toast({
        title: 'Validation Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return { success: false, error: errorMsg };
    }

    try {
      const validated = result.data;
      const { error } = await supabase
        .from('activities')
        .insert({
          name: validated.name,
          description: validated.description || null,
          activity_date: validated.activity_date,
          activity_time: validated.activity_time || null,
          location: validated.location || null,
          status: data.status || 'upcoming',
          registration_enabled: validated.registration_enabled ?? true,
          capacity: validated.capacity || null,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Activity created successfully',
      });

      await fetchActivities();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error creating activity',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const updateActivity = async (id: string, data: Partial<CreateActivityData>) => {
    // Validate input data (partial validation for updates)
    const partialSchema = activitySchema.partial();
    const result = partialSchema.safeParse({
      name: data.name,
      description: data.description,
      activity_date: data.activity_date,
      activity_time: data.activity_time,
      location: data.location,
      capacity: data.capacity,
      registration_enabled: data.registration_enabled,
    });

    if (!result.success) {
      const errorMsg = result.error.errors.map(e => e.message).join(', ');
      toast({
        title: 'Validation Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return { success: false, error: errorMsg };
    }

    try {
      const validated = result.data;
      const updateData: Record<string, any> = {};
      
      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.description !== undefined) updateData.description = validated.description || null;
      if (validated.activity_date !== undefined) updateData.activity_date = validated.activity_date;
      if (validated.activity_time !== undefined) updateData.activity_time = validated.activity_time || null;
      if (validated.location !== undefined) updateData.location = validated.location || null;
      if (validated.capacity !== undefined) updateData.capacity = validated.capacity || null;
      if (validated.registration_enabled !== undefined) updateData.registration_enabled = validated.registration_enabled;
      if (data.status !== undefined) updateData.status = data.status;

      const { error } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Activity updated successfully',
      });

      await fetchActivities();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error updating activity',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const deleteActivity = async (id: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Activity deleted successfully',
      });

      await fetchActivities();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error deleting activity',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const registerForActivity = async (activityId: string) => {
    if (!user) {
      toast({
        title: 'Please login to register',
        variant: 'destructive',
      });
      return { success: false };
    }

    try {
      const { error } = await supabase
        .from('activity_registrations')
        .insert({
          activity_id: activityId,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Registration successful!',
        description: 'You have been registered for this activity.',
      });

      await fetchActivities();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error registering for activity',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const unregisterFromActivity = async (activityId: string) => {
    if (!user) return { success: false };

    try {
      const { error } = await supabase
        .from('activity_registrations')
        .delete()
        .eq('activity_id', activityId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Unregistered successfully',
      });

      await fetchActivities();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error unregistering',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [user]);

  return {
    activities,
    isLoading,
    fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    registerForActivity,
    unregisterFromActivity,
  };
}
