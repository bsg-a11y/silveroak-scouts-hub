import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { memberSchema, validateData, validateEnrollmentNumber } from '@/lib/validations';

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
  uid?: string; // Optional custom UID
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
      // Validate input data with basic schema
      const validation = validateData(memberSchema, data);
      if (validation.success === false) {
        toast({
          title: 'Validation Error',
          description: validation.error,
          variant: 'destructive',
        });
        return { success: false as const, error: validation.error };
      }

      const validatedData = validation.data;

      // Additional semester-aware enrollment validation
      if (validatedData.enrollment_number && validatedData.enrollment_number !== '') {
        const enrollmentError = validateEnrollmentNumber(
          validatedData.enrollment_number,
          validatedData.current_semester
        );
        if (enrollmentError) {
          toast({
            title: 'Validation Error',
            description: enrollmentError,
            variant: 'destructive',
          });
          return { success: false as const, error: enrollmentError };
        }
      }

      // Get current session token for authorization
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('You must be logged in to create members');
      }

      // Call edge function to create member (uses service role, preserves admin session)
      const response = await supabase.functions.invoke('create-member', {
        body: {
          uid: data.uid || null, // Pass optional custom UID
          first_name: validatedData.first_name,
          middle_name: validatedData.middle_name || null,
          last_name: validatedData.last_name,
          gender: validatedData.gender || null,
          date_of_birth: validatedData.date_of_birth || null,
          course_duration: validatedData.course_duration || null,
          college_name: validatedData.college_name || 'Silver Oak University',
          current_semester: validatedData.current_semester || null,
          enrollment_number: validatedData.enrollment_number || null,
          class_coordinator_name: validatedData.class_coordinator_name || null,
          hod_name: validatedData.hod_name || null,
          principal_name: validatedData.principal_name || null,
          whatsapp_number: validatedData.whatsapp_number || null,
          aadhaar_number: validatedData.aadhaar_number || null,
          blood_group: validatedData.blood_group || null,
          role: validatedData.role || 'member',
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create member');
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Failed to create member');
      }

      toast({
        title: 'Member created successfully',
        description: `UID: ${result.uid} - Credentials ready to copy`,
      });

      await fetchMembers();
      return { uid: result.uid, password: result.password, success: true };
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
      // Get current session token for authorization
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('You must be logged in to delete members');
      }

      // Call edge function to delete member (handles all related records)
      const response = await supabase.functions.invoke('delete-member', {
        body: { user_id: userId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete member');
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete member');
      }

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
