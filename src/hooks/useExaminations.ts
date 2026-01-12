import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExaminationStage {
  id: string;
  name: string;
  display_order: number;
  description: string | null;
}

export interface ExaminationMaterial {
  id: string;
  stage_id: string;
  title: string;
  material_type: 'notes' | 'logbook' | 'other';
  file_url: string;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  stage?: ExaminationStage;
}

export interface MemberExamination {
  id: string;
  user_id: string;
  stage_id: string;
  status: 'ongoing' | 'complete';
  exam_year: number;
  applied_at: string;
  completed_at: string | null;
  stage?: ExaminationStage;
  profile?: {
    first_name: string;
    last_name: string;
    uid: string;
    college_name: string | null;
    academic_department: string | null;
    profile_photo_url: string | null;
  };
}

export function useExaminations() {
  const [stages, setStages] = useState<ExaminationStage[]>([]);
  const [materials, setMaterials] = useState<ExaminationMaterial[]>([]);
  const [memberExaminations, setMemberExaminations] = useState<MemberExamination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchStages = async () => {
    const { data, error } = await supabase
      .from('examination_stages')
      .select('*')
      .order('display_order');

    if (error) {
      console.error('Error fetching stages:', error);
      return;
    }
    setStages(data || []);
  };

  const fetchMaterials = async () => {
    const { data, error } = await supabase
      .from('examination_materials')
      .select(`
        *,
        stage:examination_stages(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching materials:', error);
      return;
    }
    // Cast material_type to the correct union type
    const typedMaterials = (data || []).map(m => ({
      ...m,
      material_type: m.material_type as 'notes' | 'logbook' | 'other',
    }));
    setMaterials(typedMaterials);
  };

  const fetchMemberExaminations = async () => {
    // First fetch member examinations with stages
    const { data: examData, error } = await supabase
      .from('member_examinations')
      .select(`
        *,
        stage:examination_stages(*)
      `)
      .order('applied_at', { ascending: false });

    if (error) {
      console.error('Error fetching member examinations:', error);
      return;
    }

    // Then fetch profiles for each user
    const userIds = [...new Set((examData || []).map(e => e.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, uid, college_name, academic_department, profile_photo_url')
      .in('user_id', userIds);

    const profilesMap = new Map((profilesData || []).map(p => [p.user_id, p]));

    const typedExams = (examData || []).map(e => ({
      ...e,
      status: e.status as 'ongoing' | 'complete',
      profile: profilesMap.get(e.user_id) || undefined,
    }));

    setMemberExaminations(typedExams);
  };

  const fetchAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchStages(), fetchMaterials(), fetchMemberExaminations()]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Add material
  const addMaterial = async (data: {
    stage_id: string;
    title: string;
    material_type: 'notes' | 'logbook' | 'other';
    file_url: string;
    description?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('examination_materials')
      .insert({
        ...data,
        uploaded_by: user?.id,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add material: ' + error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Success',
      description: 'Material added successfully',
    });
    await fetchMaterials();
    return true;
  };

  // Delete material
  const deleteMaterial = async (id: string) => {
    const { error } = await supabase
      .from('examination_materials')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete material',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Success',
      description: 'Material deleted successfully',
    });
    await fetchMaterials();
    return true;
  };

  // Update member examination status
  const updateMemberExamination = async (
    userId: string,
    stageId: string,
    status: 'ongoing' | 'complete',
    examYear?: number
  ) => {
    const { data: { user } } = await supabase.auth.getUser();

    // Check if record exists
    const { data: existing } = await supabase
      .from('member_examinations')
      .select('id')
      .eq('user_id', userId)
      .eq('stage_id', stageId)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('member_examinations')
        .update({
          status,
          completed_at: status === 'complete' ? new Date().toISOString() : null,
          updated_by: user?.id,
        })
        .eq('id', existing.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update examination status',
          variant: 'destructive',
        });
        return false;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('member_examinations')
        .insert({
          user_id: userId,
          stage_id: stageId,
          status,
          exam_year: examYear || new Date().getFullYear(),
          completed_at: status === 'complete' ? new Date().toISOString() : null,
          updated_by: user?.id,
        });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to add examination status',
          variant: 'destructive',
        });
        return false;
      }
    }

    toast({
      title: 'Success',
      description: 'Examination status updated',
    });
    await fetchMemberExaminations();
    return true;
  };

  // Delete member examination
  const deleteMemberExamination = async (id: string) => {
    const { error } = await supabase
      .from('member_examinations')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete examination record',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Success',
      description: 'Examination record deleted',
    });
    await fetchMemberExaminations();
    return true;
  };

  // Get user's current examination stage
  const getUserExaminationBadge = (userId: string) => {
    const userExams = memberExaminations.filter(e => e.user_id === userId);
    if (userExams.length === 0) return null;

    // Get the highest stage (by display_order)
    const sortedExams = userExams
      .filter(e => e.stage)
      .sort((a, b) => (b.stage?.display_order || 0) - (a.stage?.display_order || 0));

    if (sortedExams.length === 0) return null;

    const highestExam = sortedExams[0];
    return {
      stageName: highestExam.stage?.name || '',
      status: highestExam.status,
      displayText: `${highestExam.stage?.name} ${highestExam.status === 'complete' ? 'Complete' : 'Ongoing'}`,
    };
  };

  return {
    stages,
    materials,
    memberExaminations,
    isLoading,
    fetchAll,
    addMaterial,
    deleteMaterial,
    updateMemberExamination,
    deleteMemberExamination,
    getUserExaminationBadge,
  };
}

// Hook to get examination stats for dashboard
export function useExaminationStats() {
  const [stats, setStats] = useState<{
    totalApplied: number;
    totalCompleted: number;
    byStage: { name: string; ongoing: number; complete: number }[];
    byYear: { year: number; count: number }[];
    byCollege: { college: string; count: number }[];
  }>({
    totalApplied: 0,
    totalCompleted: 0,
    byStage: [],
    byYear: [],
    byCollege: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async (filters?: {
    year?: number;
    college?: string;
    department?: string;
  }) => {
    setIsLoading(true);
    try {
      // Get all member examinations with profiles
      let query = supabase
        .from('member_examinations')
        .select(`
          *,
          stage:examination_stages(*),
          profile:profiles!member_examinations_user_id_fkey(
            college_name,
            academic_department
          )
        `);

      if (filters?.year) {
        query = query.eq('exam_year', filters.year);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching examination stats:', error);
        return;
      }

      let filteredData = data || [];

      // Apply college filter
      if (filters?.college) {
        filteredData = filteredData.filter(
          (d: any) => d.profile?.college_name === filters.college
        );
      }

      // Apply department filter
      if (filters?.department) {
        filteredData = filteredData.filter(
          (d: any) => d.profile?.academic_department === filters.department
        );
      }

      // Calculate stats
      const totalApplied = filteredData.length;
      const totalCompleted = filteredData.filter((d: any) => d.status === 'complete').length;

      // Group by stage
      const stageMap = new Map<string, { ongoing: number; complete: number }>();
      filteredData.forEach((d: any) => {
        const stageName = d.stage?.name || 'Unknown';
        const current = stageMap.get(stageName) || { ongoing: 0, complete: 0 };
        if (d.status === 'complete') {
          current.complete++;
        } else {
          current.ongoing++;
        }
        stageMap.set(stageName, current);
      });
      const byStage = Array.from(stageMap.entries()).map(([name, counts]) => ({
        name,
        ...counts,
      }));

      // Group by year
      const yearMap = new Map<number, number>();
      filteredData.forEach((d: any) => {
        const year = d.exam_year;
        yearMap.set(year, (yearMap.get(year) || 0) + 1);
      });
      const byYear = Array.from(yearMap.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => b.year - a.year);

      // Group by college
      const collegeMap = new Map<string, number>();
      filteredData.forEach((d: any) => {
        const college = d.profile?.college_name || 'Unknown';
        collegeMap.set(college, (collegeMap.get(college) || 0) + 1);
      });
      const byCollege = Array.from(collegeMap.entries())
        .map(([college, count]) => ({ college, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        totalApplied,
        totalCompleted,
        byStage,
        byYear,
        byCollege,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, isLoading, fetchStats };
}
