import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface CommitteeApplication {
  id: string;
  user_id: string;
  application_type: 'core' | 'executive' | 'institute_coordinator';
  interested_department_id: string | null;
  reason: string;
  skill_ratings: Record<string, number>;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  admin_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  department?: {
    id: string;
    name: string;
    committee_type: string;
  } | null;
  profile?: {
    first_name: string;
    last_name: string;
    uid: string;
    college_name: string | null;
    whatsapp_number: string | null;
  } | null;
}

export interface CreateApplicationData {
  application_type: 'core' | 'executive' | 'institute_coordinator';
  interested_department_id?: string;
  reason: string;
  skill_ratings: Record<string, number>;
}

// Skills for each committee type
export const COMMITTEE_SKILLS: Record<string, string[]> = {
  core: ['Teamwork', 'Communication', 'Time Management', 'Problem Solving', 'Creativity'],
  executive: ['Leadership', 'Decision Making', 'Public Speaking', 'Event Management', 'Documentation'],
  institute_coordinator: ['Leadership', 'Communication', 'Coordination', 'Networking', 'Crisis Management'],
};

export function useCommitteeApplications() {
  const [applications, setApplications] = useState<CommitteeApplication[]>([]);
  const [myApplications, setMyApplications] = useState<CommitteeApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isAdminOrCoordinator } = useAuth();

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      // Fetch applications with department info
      const { data, error } = await supabase
        .from('committee_applications')
        .select(`
          *,
          department:committee_departments(id, name, committee_type)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for applications
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(a => a.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, uid, college_name, whatsapp_number')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        const applicationsWithProfiles = data.map(app => ({
          ...app,
          profile: profiles?.find(p => p.user_id === app.user_id) || null,
        })) as CommitteeApplication[];

        setApplications(applicationsWithProfiles);
        setMyApplications(applicationsWithProfiles.filter(a => a.user_id === user?.id));
      } else {
        setApplications([]);
        setMyApplications([]);
      }
    } catch (error: any) {
      toast({
        title: 'Error fetching applications',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createApplication = async (data: CreateApplicationData) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to apply',
        variant: 'destructive',
      });
      return { success: false };
    }

    try {
      const { error } = await supabase
        .from('committee_applications')
        .insert({
          user_id: user.id,
          application_type: data.application_type,
          interested_department_id: data.interested_department_id || null,
          reason: data.reason,
          skill_ratings: data.skill_ratings,
        });

      if (error) throw error;

      toast({ title: 'Application submitted successfully' });
      await fetchApplications();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error submitting application',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const reviewApplication = async (
    id: string, 
    status: 'reviewed' | 'accepted' | 'rejected',
    adminComment?: string
  ) => {
    try {
      const { error } = await supabase
        .from('committee_applications')
        .update({
          status,
          admin_comment: adminComment || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: `Application ${status}` });
      await fetchApplications();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error updating application',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const deleteApplication = async (id: string) => {
    try {
      const { error } = await supabase
        .from('committee_applications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Application deleted' });
      await fetchApplications();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error deleting application',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  return {
    applications,
    myApplications,
    isLoading,
    fetchApplications,
    createApplication,
    reviewApplication,
    deleteApplication,
  };
}
