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
  academic_department: string | null;
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
  email?: string | null;
  joining_date?: string | null;
}

export interface CreateMemberData {
  uid?: string; // Optional custom UID
  password?: string; // Optional custom password
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  email?: string;
  course_duration?: string;
  college_name?: string;
  academic_department?: string;
  current_semester?: number;
  enrollment_number?: string;
  class_coordinator_name?: string;
  hod_name?: string;
  principal_name?: string;
  whatsapp_number?: string;
  aadhaar_number?: string;
  blood_group?: string;
  role?: string;
  joining_date?: string;
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
        .order('uid', { ascending: true });

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
          password: data.password || null, // Pass optional custom password
          first_name: validatedData.first_name,
          middle_name: validatedData.middle_name || null,
          last_name: validatedData.last_name,
          gender: validatedData.gender || null,
          date_of_birth: validatedData.date_of_birth || null,
          email: validatedData.email || null,
          course_duration: validatedData.course_duration || null,
          college_name: validatedData.college_name || 'Silver Oak University',
          academic_department: data.academic_department || null,
          current_semester: validatedData.current_semester || null,
          enrollment_number: validatedData.enrollment_number || null,
          class_coordinator_name: validatedData.class_coordinator_name || null,
          hod_name: validatedData.hod_name || null,
          principal_name: validatedData.principal_name || null,
          whatsapp_number: validatedData.whatsapp_number || null,
          aadhaar_number: validatedData.aadhaar_number || null,
          blood_group: validatedData.blood_group || null,
          role: validatedData.role || 'member',
          joining_date: data.joining_date || null,
        },
      });

      if (response.error) {
        // Extract meaningful error message
        const errorMsg = response.error.message || 'Failed to create member';
        console.error('Edge function error:', response.error);
        throw new Error(errorMsg);
      }

      const result = response.data;
      if (!result.success) {
        // Show specific validation or business logic errors
        const errorMsg = result.error || 'Failed to create member';
        console.error('Create member failed:', errorMsg);
        throw new Error(errorMsg);
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
      const updateData: Record<string, any> = {};
      
      // Only include fields that are defined
      if (data.first_name !== undefined) updateData.first_name = data.first_name;
      if (data.middle_name !== undefined) updateData.middle_name = data.middle_name;
      if (data.last_name !== undefined) updateData.last_name = data.last_name;
      if (data.gender !== undefined) updateData.gender = data.gender;
      if (data.date_of_birth !== undefined) updateData.date_of_birth = data.date_of_birth;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.course_duration !== undefined) updateData.course_duration = data.course_duration;
      if (data.college_name !== undefined) updateData.college_name = data.college_name;
      if ((data as any).academic_department !== undefined) updateData.academic_department = (data as any).academic_department;
      if (data.current_semester !== undefined) updateData.current_semester = data.current_semester;
      if (data.enrollment_number !== undefined) updateData.enrollment_number = data.enrollment_number;
      if (data.class_coordinator_name !== undefined) updateData.class_coordinator_name = data.class_coordinator_name;
      if (data.hod_name !== undefined) updateData.hod_name = data.hod_name;
      if (data.principal_name !== undefined) updateData.principal_name = data.principal_name;
      if (data.whatsapp_number !== undefined) updateData.whatsapp_number = data.whatsapp_number;
      if (data.aadhaar_number !== undefined) updateData.aadhaar_number = data.aadhaar_number;
      if (data.blood_group !== undefined) updateData.blood_group = data.blood_group;
      if (data.joining_date !== undefined) updateData.joining_date = data.joining_date;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
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
