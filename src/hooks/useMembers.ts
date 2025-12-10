import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Member {
  id: string;
  user_id: string;
  uid: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: string | null;
  date_of_birth: string | null;
  course_duration: string | null;
  college_name: string | null;
  current_semester: number | null;
  enrollment_number: string | null;
  class_coordinator_name: string | null;
  hod_name: string | null;
  principal_name: string | null;
  whatsapp_number: string | null;
  aadhaar_number: string | null;
  blood_group: string | null;
  profile_photo_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  role?: string;
}

export interface CreateMemberData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  course_duration?: string;
  college_name?: string;
  current_semester?: number;
  enrollment_number?: string;
  class_coordinator_name?: string;
  hod_name?: string;
  principal_name?: string;
  whatsapp_number?: string;
  aadhaar_number?: string;
  blood_group?: string;
  role?: string;
}

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for all members
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Map roles to members
      const membersWithRoles = (profilesData || []).map(profile => {
        const userRole = rolesData?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || 'member',
        };
      });

      setMembers(membersWithRoles);
    } catch (error: any) {
      toast({
        title: 'Error fetching members',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createMember = async (data: CreateMemberData) => {
    try {
      // Generate next UID
      const { data: uidData, error: uidError } = await supabase
        .rpc('generate_next_uid');

      if (uidError) throw uidError;

      const uid = uidData;
      const email = `${uid.toLowerCase()}@bsg.local`;
      const password = Math.random().toString(36).slice(-8) + 'A1!';

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: data.first_name,
            last_name: data.last_name,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          uid,
          first_name: data.first_name,
          middle_name: data.middle_name || null,
          last_name: data.last_name,
          gender: data.gender || null,
          date_of_birth: data.date_of_birth || null,
          course_duration: data.course_duration || null,
          college_name: data.college_name || 'Silver Oak University',
          current_semester: data.current_semester || null,
          enrollment_number: data.enrollment_number || null,
          class_coordinator_name: data.class_coordinator_name || null,
          hod_name: data.hod_name || null,
          principal_name: data.principal_name || null,
          whatsapp_number: data.whatsapp_number || null,
          aadhaar_number: data.aadhaar_number || null,
          blood_group: data.blood_group || null,
        });

      if (profileError) throw profileError;

      // Assign role
      const role = (data.role || 'member') as 'admin' | 'coordinator' | 'core' | 'executive' | 'member';
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: authData.user.id,
          role,
        }]);

      if (roleError) throw roleError;

      toast({
        title: 'Member created successfully',
        description: `UID: ${uid}, Password: ${password}`,
      });

      await fetchMembers();
      return { uid, password, success: true };
    } catch (error: any) {
      toast({
        title: 'Error creating member',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const updateMember = async (id: string, data: Partial<CreateMemberData>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          middle_name: data.middle_name,
          last_name: data.last_name,
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          course_duration: data.course_duration,
          college_name: data.college_name,
          current_semester: data.current_semester,
          enrollment_number: data.enrollment_number,
          class_coordinator_name: data.class_coordinator_name,
          hod_name: data.hod_name,
          principal_name: data.principal_name,
          whatsapp_number: data.whatsapp_number,
          aadhaar_number: data.aadhaar_number,
          blood_group: data.blood_group,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Member updated successfully',
      });

      await fetchMembers();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error updating member',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const toggleMemberStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: `Member ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      });

      await fetchMembers();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error updating member status',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const deleteMember = async (id: string, userId: string) => {
    try {
      // Delete profile (will cascade to user via foreign key)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Member deleted successfully',
      });

      await fetchMembers();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error deleting member',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return {
    members,
    isLoading,
    fetchMembers,
    createMember,
    updateMember,
    toggleMemberStatus,
    deleteMember,
  };
}
