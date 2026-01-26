import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ActivityPhoto {
  id: string;
  activity_id: string;
  photo_url: string;
  caption: string | null;
  display_order: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface ActivityReport {
  id: string;
  activity_id: string;
  title: string;
  report_type: string;
  file_url: string;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useActivityMedia() {
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [reports, setReports] = useState<ActivityReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isAdminOrCoordinator } = useAuth();

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from('activity_photos')
      .select('*')
      .order('display_order');

    if (error) {
      toast({
        title: 'Error fetching photos',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setPhotos(data || []);
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('activity_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error fetching reports',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setReports(data || []);
  };

  const fetchAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchPhotos(), fetchReports()]);
    setIsLoading(false);
  };

  // Photos CRUD - supports multiple files
  const uploadPhoto = async (activityId: string, file: File, caption?: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${activityId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload with original format and size (no transformation)
      const { error: uploadError } = await supabase.storage
        .from('activity-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('activity-photos')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('activity_photos')
        .insert({
          activity_id: activityId,
          photo_url: publicUrl,
          caption: caption || null,
          uploaded_by: user?.id,
        });

      if (insertError) throw insertError;

      return { success: true };
    } catch (error: any) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }
  };

  // Upload multiple photos at once
  const uploadMultiplePhotos = async (activityId: string, files: File[], caption?: string) => {
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      const result = await uploadPhoto(activityId, file, caption);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast({ title: `${successCount} photo${successCount > 1 ? 's' : ''} uploaded successfully` });
      await fetchPhotos();
    }
    if (failCount > 0) {
      toast({
        title: `${failCount} photo${failCount > 1 ? 's' : ''} failed to upload`,
        variant: 'destructive',
      });
    }

    return { success: successCount > 0, successCount, failCount };
  };

  const deletePhoto = async (id: string, photoUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split('/activity-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('activity-photos').remove([filePath]);
      }

      const { error } = await supabase
        .from('activity_photos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Photo deleted' });
      await fetchPhotos();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error deleting photo',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  // Reports CRUD - supports single file upload
  const uploadReport = async (
    activityId: string, 
    file: File, 
    title: string, 
    reportType: 'report' | 'summary' | 'documentation' = 'report'
  ) => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${activityId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('activity-reports')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const filePath = fileName;

      const { error: insertError } = await supabase
        .from('activity_reports')
        .insert({
          activity_id: activityId,
          title,
          report_type: reportType,
          file_url: filePath,
          file_type: fileExt,
          uploaded_by: user?.id,
        });

      if (insertError) throw insertError;

      return { success: true };
    } catch (error: any) {
      console.error('Report upload error:', error);
      return { success: false, error: error.message };
    }
  };

  // Upload multiple reports at once
  const uploadMultipleReports = async (
    activityId: string,
    files: File[],
    titlePrefix: string,
    reportType: 'report' | 'summary' | 'documentation' = 'report'
  ) => {
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const title = files.length > 1 ? `${titlePrefix} (${i + 1})` : titlePrefix;
      const result = await uploadReport(activityId, file, title, reportType);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast({ title: `${successCount} report${successCount > 1 ? 's' : ''} uploaded successfully` });
      await fetchReports();
    }
    if (failCount > 0) {
      toast({
        title: `${failCount} report${failCount > 1 ? 's' : ''} failed to upload`,
        variant: 'destructive',
      });
    }

    return { success: successCount > 0, successCount, failCount };
  };

  const getReportSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('activity-reports')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  };

  const deleteReport = async (id: string, filePath: string) => {
    try {
      await supabase.storage.from('activity-reports').remove([filePath]);

      const { error } = await supabase
        .from('activity_reports')
        .delete()
        .eq('id', id);

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

  // Get photos for specific activity
  const getPhotosForActivity = (activityId: string) => {
    return photos.filter(p => p.activity_id === activityId);
  };

  // Get reports for specific activity
  const getReportsForActivity = (activityId: string) => {
    return reports.filter(r => r.activity_id === activityId);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Get public URL for photo download
  const getPhotoDownloadUrl = (photoUrl: string): string => {
    return photoUrl; // Photos bucket is public, direct URL works
  };

  return {
    photos,
    reports,
    isLoading,
    fetchAll,
    uploadPhoto,
    uploadMultiplePhotos,
    deletePhoto,
    uploadReport,
    uploadMultipleReports,
    deleteReport,
    getReportSignedUrl,
    getPhotoDownloadUrl,
    getPhotosForActivity,
    getReportsForActivity,
  };
}
