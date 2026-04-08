import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'checkbox' | 'rating';
  required: boolean;
  options?: string[]; // For select fields
  placeholder?: string;
}

export interface CustomForm {
  id: string;
  title: string;
  description: string | null;
  form_type: string;
  fields: FormField[];
  is_active: boolean;
  visibility_type: string;
  assigned_member_ids: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  user_id: string;
  responses: Record<string, any>;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_comment: string | null;
  created_at: string;
  form?: CustomForm;
  profile?: {
    first_name: string;
    last_name: string;
    uid: string;
  };
}

export function useCustomForms() {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [mySubmissions, setMySubmissions] = useState<FormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isAdminOrCoordinator } = useAuth();

  const fetchForms = async () => {
    const { data, error } = await supabase
      .from('custom_forms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching forms:', error);
      return;
    }

    // Parse fields from JSON
    const parsedForms = (data || []).map(form => ({
      ...form,
      fields: Array.isArray(form.fields) ? form.fields : JSON.parse(form.fields as string || '[]')
    })) as CustomForm[];

    setForms(parsedForms);
  };

  const fetchSubmissions = async () => {
    if (!user) return;

    // Fetch all submissions for admins
    if (isAdminOrCoordinator) {
      const { data, error } = await supabase
        .from('form_submissions')
        .select(`
          *,
          form:custom_forms(*)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Fetch profiles separately for each submission
        const userIds = [...new Set(data.map(sub => sub.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, uid')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const parsedSubmissions = data.map(sub => ({
          ...sub,
          form: sub.form ? {
            ...sub.form,
            fields: Array.isArray(sub.form.fields) ? sub.form.fields : JSON.parse(sub.form.fields as string || '[]')
          } : undefined,
          profile: profileMap.get(sub.user_id)
        })) as FormSubmission[];
        setSubmissions(parsedSubmissions);
      }
    }

    // Fetch user's own submissions
    const { data: myData, error: myError } = await supabase
      .from('form_submissions')
      .select(`
        *,
        form:custom_forms(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!myError && myData) {
      const parsedMySubmissions = myData.map(sub => ({
        ...sub,
        form: sub.form ? {
          ...sub.form,
          fields: Array.isArray(sub.form.fields) ? sub.form.fields : JSON.parse(sub.form.fields as string || '[]')
        } : undefined
      })) as FormSubmission[];
      setMySubmissions(parsedMySubmissions);
    }
  };

  const fetchAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchForms(), fetchSubmissions()]);
    setIsLoading(false);
  };

  // Create a new form (admin only)
  const createForm = async (formData: {
    title: string;
    description?: string;
    form_type: string;
    fields: FormField[];
  }) => {
    const { error } = await supabase
      .from('custom_forms')
      .insert({
        title: formData.title,
        description: formData.description || null,
        form_type: formData.form_type,
        fields: formData.fields as any,
        created_by: user?.id,
      });

    if (error) {
      toast({
        title: 'Error creating form',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }

    toast({ title: 'Form created successfully' });
    await fetchForms();
    return { success: true };
  };

  // Update a form
  const updateForm = async (id: string, formData: Partial<CustomForm>) => {
    const { error } = await supabase
      .from('custom_forms')
      .update({
        ...formData,
        fields: formData.fields as any,
      })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error updating form',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }

    toast({ title: 'Form updated successfully' });
    await fetchForms();
    return { success: true };
  };

  // Delete a form
  const deleteForm = async (id: string) => {
    const { error } = await supabase
      .from('custom_forms')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting form',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }

    toast({ title: 'Form deleted' });
    await fetchForms();
    return { success: true };
  };

  // Submit a form response
  const submitForm = async (formId: string, responses: Record<string, any>) => {
    const { error } = await supabase
      .from('form_submissions')
      .insert({
        form_id: formId,
        user_id: user?.id,
        responses: responses as any,
      });

    if (error) {
      toast({
        title: 'Error submitting form',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }

    toast({ title: 'Form submitted successfully' });
    await fetchSubmissions();
    return { success: true };
  };

  // Review a submission (admin only)
  const reviewSubmission = async (id: string, status: 'approved' | 'rejected', comment?: string) => {
    const { error } = await supabase
      .from('form_submissions')
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        admin_comment: comment || null,
      })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error reviewing submission',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }

    toast({ title: `Submission ${status}` });
    await fetchSubmissions();
    return { success: true };
  };

  // Delete a submission
  const deleteSubmission = async (id: string) => {
    const { error } = await supabase
      .from('form_submissions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting submission',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }

    toast({ title: 'Submission deleted' });
    await fetchSubmissions();
    return { success: true };
  };

  useEffect(() => {
    fetchAll();
  }, [user?.id, isAdminOrCoordinator]);

  return {
    forms,
    submissions,
    mySubmissions,
    isLoading,
    createForm,
    updateForm,
    deleteForm,
    submitForm,
    reviewSubmission,
    deleteSubmission,
    refetch: fetchAll,
  };
}
