import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ConsentForm {
  id: string;
  title: string;
  description: string | null;
  form_type: string;
  file_url: string;
  file_type: string | null;
  is_active: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export const CONSENT_FORM_TYPES = [
  { value: 'general', label: 'General Consent' },
  { value: 'activity', label: 'Activity Participation' },
  { value: 'medical', label: 'Medical Declaration' },
  { value: 'travel', label: 'Travel/Outstation' },
  { value: 'media', label: 'Media/Photo Release' },
  { value: 'other', label: 'Other' },
];

export function useConsentForms() {
  const [forms, setForms] = useState<ConsentForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isAdminOrCoordinator } = useAuth();

  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('consent_forms')
        .select('*')
        .order('form_type', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setForms((data || []) as ConsentForm[]);
    } catch (error: any) {
      toast({
        title: 'Error fetching consent forms',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadForm = async (data: {
    title: string;
    description?: string;
    form_type: string;
    file: File;
  }) => {
    if (!user) return { success: false };
    
    try {
      const fileExt = data.file.name.split('.').pop();
      const fileName = `${Date.now()}_${data.title.replace(/[^a-z0-9]/gi, '_')}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('consent-forms')
        .upload(fileName, data.file);
      
      if (uploadError) throw uploadError;
      
      const { error: insertError } = await supabase
        .from('consent_forms')
        .insert({
          title: data.title,
          description: data.description || null,
          form_type: data.form_type,
          file_url: fileName,
          file_type: fileExt,
          uploaded_by: user.id,
        });
      
      if (insertError) throw insertError;
      
      toast({ title: 'Consent form uploaded successfully' });
      await fetchForms();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error uploading form',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const updateForm = async (id: string, data: Partial<ConsentForm>) => {
    try {
      const { error } = await supabase
        .from('consent_forms')
        .update({
          title: data.title,
          description: data.description,
          form_type: data.form_type,
          is_active: data.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: 'Form updated successfully' });
      await fetchForms();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error updating form',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const deleteForm = async (id: string, fileUrl: string) => {
    try {
      // Delete from storage
      await supabase.storage.from('consent-forms').remove([fileUrl]);
      
      // Delete record
      const { error } = await supabase
        .from('consent_forms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: 'Form deleted' });
      await fetchForms();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error deleting form',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const getDownloadUrl = async (fileUrl: string) => {
    const { data } = await supabase.storage
      .from('consent-forms')
      .createSignedUrl(fileUrl, 3600);
    return data?.signedUrl;
  };

  useEffect(() => {
    fetchForms();
  }, []);

  return {
    forms,
    isLoading,
    fetchForms,
    uploadForm,
    updateForm,
    deleteForm,
    getDownloadUrl,
  };
}
