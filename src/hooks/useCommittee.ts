import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CommitteeDepartment {
  id: string;
  name: string;
  committee_type: string;
  display_order: number;
}

export interface CommitteePosition {
  id: string;
  user_id: string;
  position_type: string;
  position_title: string | null;
  department_id: string | null;
  email: string | null;
  phone: string | null;
  display_order: number;
  // Joined data
  profile?: {
    user_id: string;
    first_name: string;
    last_name: string;
    middle_name: string | null;
    profile_photo_url: string | null;
    college_name: string | null;
  };
  department?: CommitteeDepartment | null;
}

export function useCommittee() {
  const [departments, setDepartments] = useState<CommitteeDepartment[]>([]);
  const [positions, setPositions] = useState<CommitteePosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch departments
      const { data: depts, error: deptsError } = await supabase
        .from('committee_departments')
        .select('*')
        .order('display_order');

      if (deptsError) throw deptsError;
      setDepartments(depts || []);

      // Fetch positions with profile data
      const { data: pos, error: posError } = await supabase
        .from('committee_positions')
        .select(`
          *,
          department:committee_departments(*)
        `)
        .order('display_order');

      if (posError) throw posError;

      // Fetch profile data for each position
      if (pos && pos.length > 0) {
        const userIds = pos.map(p => p.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, middle_name, profile_photo_url, college_name')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        const positionsWithProfiles = pos.map(p => ({
          ...p,
          profile: profiles?.find(pr => pr.user_id === p.user_id),
        }));

        setPositions(positionsWithProfiles);
      } else {
        setPositions([]);
      }
    } catch (error: any) {
      toast({
        title: 'Error fetching committee data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addPosition = async (data: {
    user_id: string;
    position_type: 'institute_coordinator' | 'executive' | 'core';
    position_title?: string;
    department_id?: string;
    email?: string;
    phone?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('committee_positions')
        .insert({
          user_id: data.user_id,
          position_type: data.position_type,
          position_title: data.position_title || null,
          department_id: data.department_id || null,
          email: data.email || null,
          phone: data.phone || null,
        });

      if (error) throw error;

      toast({ title: 'Position added successfully' });
      await fetchData();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error adding position',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const updatePosition = async (id: string, data: Partial<CommitteePosition>) => {
    try {
      const { error } = await supabase
        .from('committee_positions')
        .update({
          position_title: data.position_title,
          department_id: data.department_id,
          email: data.email,
          phone: data.phone,
          display_order: data.display_order,
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Position updated successfully' });
      await fetchData();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error updating position',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const removePosition = async (id: string) => {
    try {
      const { error } = await supabase
        .from('committee_positions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Position removed successfully' });
      await fetchData();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error removing position',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const addDepartment = async (name: string, committee_type: 'executive' | 'core') => {
    try {
      const { error } = await supabase
        .from('committee_departments')
        .insert({ name, committee_type, display_order: departments.length + 1 });

      if (error) throw error;

      toast({ title: 'Department added successfully' });
      await fetchData();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error adding department',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const deleteDepartment = async (id: string) => {
    try {
      // First remove all positions in this department
      const { error: posError } = await supabase
        .from('committee_positions')
        .delete()
        .eq('department_id', id);

      if (posError) throw posError;

      const { error } = await supabase
        .from('committee_departments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Department deleted successfully' });
      await fetchData();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error deleting department',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    departments,
    positions,
    isLoading,
    fetchData,
    addPosition,
    updatePosition,
    removePosition,
    addDepartment,
    deleteDepartment,
  };
}
