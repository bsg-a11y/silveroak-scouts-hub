import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface StudentReport {
  id: string;
  activity_id: string;
  user_id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  status: string;
  admin_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  activity?: {
    id: string;
    name: string;
    activity_date: string;
  };
  profile?: {
    uid: string;
    first_name: string;
    last_name: string;
  };
}

export function useStudentReports() {
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [myReports, setMyReports] = useState<StudentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isAdminOrCoordinator } = useAuth();

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      // Fetch reports based on role
      const query = supabase
        .from('student_reports')
        .select(`
          *,
          activity:activities(id, name, activity_date)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const allReports = (data || []) as StudentReport[];
      
      // For admins, fetch profile info for all reports
      if (isAdminOrCoordinator && allReports.length > 0) {
        const userIds = [...new Set(allReports.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, uid, first_name, last_name')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        allReports.forEach(report => {
          report.profile = profileMap.get(report.user_id) as any;
        });
        setReports(allReports);
      }
      
      // Filter my reports
      if (user) {
        setMyReports(allReports.filter(r => r.user_id === user.id));
      }
    } catch (error: any) {
      toast({
        title: 'Error fetching reports',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadReport = async (activityId: string, file: File, title: string) => {
    if (!user) return { success: false };
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${activityId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('student-reports')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('student-reports')
        .getPublicUrl(fileName);
      
      const { error: insertError } = await supabase
        .from('student_reports')
        .insert({
          activity_id: activityId,
          user_id: user.id,
          title,
          file_url: fileName, // Store path for signed URL generation
          file_type: fileExt,
        });
      
      if (insertError) throw insertError;
      
      toast({ title: 'Report uploaded successfully' });
      await fetchReports();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error uploading report',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const reviewReport = async (reportId: string, status: 'approved' | 'rejected', comment?: string) => {
    if (!user) return { success: false };
    
    try {
      const { error } = await supabase
        .from('student_reports')
        .update({
          status,
          admin_comment: comment || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);
      
      if (error) throw error;
      
      toast({ title: `Report ${status}` });
      await fetchReports();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error reviewing report',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const deleteReport = async (reportId: string, fileUrl: string) => {
    try {
      // Delete from storage
      await supabase.storage.from('student-reports').remove([fileUrl]);
      
      // Delete record
      const { error } = await supabase
        .from('student_reports')
        .delete()
        .eq('id', reportId);
      
      if (error) throw error;
      
      toast({ title: 'Report deleted' });
      await fetchReports();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error deleting report',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const getReportDownloadUrl = async (fileUrl: string) => {
    const { data } = await supabase.storage
      .from('student-reports')
      .createSignedUrl(fileUrl, 3600);
    return data?.signedUrl;
  };

  useEffect(() => {
    fetchReports();
  }, [user, isAdminOrCoordinator]);

  return {
    reports,
    myReports,
    isLoading,
    fetchReports,
    uploadReport,
    reviewReport,
    deleteReport,
    getReportDownloadUrl,
  };
}
