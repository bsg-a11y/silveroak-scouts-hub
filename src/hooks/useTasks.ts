import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const TASK_CATEGORIES = [
  { value: 'social_media', label: 'Social Media' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'designing', label: 'Designing' },
  { value: 'research', label: 'Research' },
] as const;

export const TASK_TYPES = [
  { value: 'poster_creation', label: 'Poster Creation', category: 'designing' },
  { value: 'story_creation', label: 'Story Creation', category: 'social_media' },
  { value: 'content_writing', label: 'Content Writing', category: 'social_media' },
  { value: 'reel_shooting', label: 'Reel Shooting', category: 'social_media' },
  { value: 'reel_editing', label: 'Reel Editing', category: 'social_media' },
  { value: 'researching_topic', label: 'Researching Topic', category: 'research' },
  { value: 'outreach_task', label: 'Outreach Task', category: 'outreach' },
  { value: 'banner_design', label: 'Banner Design', category: 'designing' },
  { value: 'certificate_design', label: 'Certificate Design', category: 'designing' },
  { value: 'social_post', label: 'Social Media Post', category: 'social_media' },
] as const;

export const TASK_STATUSES = [
  { value: 'allotted', label: 'Allotted', color: 'bg-blue-500' },
  { value: 'in_process', label: 'In Process', color: 'bg-yellow-500' },
  { value: 'in_approval', label: 'In Approval', color: 'bg-purple-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'posted', label: 'Posted', color: 'bg-emerald-600' },
] as const;

export interface Task {
  id: string;
  name: string;
  description: string | null;
  category: string;
  task_type: string;
  status: string;
  assigned_to: string;
  assigned_by: string | null;
  file_url: string | null;
  comments: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assignee?: {
    first_name: string;
    last_name: string;
    uid: string;
    profile_photo_url: string | null;
  };
  assigner?: {
    first_name: string;
    last_name: string;
  };
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
  };
}

export interface CreateTaskData {
  name: string;
  description?: string;
  category: string;
  task_type: string;
  assigned_to: string;
  due_date?: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isAdminOrCoordinator } = useAuth();

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for assigned users
      const userIds = [...new Set([
        ...(tasksData || []).map(t => t.assigned_to),
        ...(tasksData || []).filter(t => t.assigned_by).map(t => t.assigned_by),
      ])].filter(Boolean) as string[];

      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, uid, profile_photo_url')
          .in('user_id', userIds);
        profiles = profilesData || [];
      }

      const tasksWithProfiles = (tasksData || []).map(task => ({
        ...task,
        assignee: profiles.find(p => p.user_id === task.assigned_to),
        assigner: profiles.find(p => p.user_id === task.assigned_by),
      }));

      setTasks(tasksWithProfiles);
    } catch (error: any) {
      toast({
        title: 'Error fetching tasks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async (data: CreateTaskData) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          name: data.name,
          description: data.description || null,
          category: data.category,
          task_type: data.task_type,
          assigned_to: data.assigned_to,
          assigned_by: user?.id,
          due_date: data.due_date || null,
        });

      if (error) throw error;

      toast({ title: 'Task created successfully' });
      await fetchTasks();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error creating task',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;

      toast({ title: 'Task status updated' });
      await fetchTasks();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const uploadTaskFile = async (taskId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update task with file URL and change status to in_approval
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          file_url: fileName,
          status: 'in_approval',
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      toast({ title: 'File uploaded successfully' });
      await fetchTasks();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error uploading file',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const addComment = async (taskId: string, comment: string) => {
    try {
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          comment,
        });

      if (error) throw error;

      toast({ title: 'Comment added' });
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error adding comment',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const fetchTaskComments = async (taskId: string): Promise<TaskComment[]> => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const userIds = [...new Set(data?.map(c => c.user_id) || [])];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);
        profiles = profilesData || [];
      }

      return (data || []).map(c => ({
        ...c,
        user: profiles.find(p => p.user_id === c.user_id),
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({ title: 'Task deleted' });
      await fetchTasks();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error deleting task',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  const getTaskStats = (userId: string) => {
    const userTasks = tasks.filter(t => t.assigned_to === userId);
    const byCategory = TASK_CATEGORIES.reduce((acc, cat) => {
      acc[cat.value] = userTasks.filter(t => t.category === cat.value).length;
      return acc;
    }, {} as Record<string, number>);
    
    const byStatus = TASK_STATUSES.reduce((acc, status) => {
      acc[status.value] = userTasks.filter(t => t.status === status.value).length;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: userTasks.length,
      completed: userTasks.filter(t => t.status === 'posted' || t.status === 'approved').length,
      byCategory,
      byStatus,
    };
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  return {
    tasks,
    isLoading,
    fetchTasks,
    createTask,
    updateTaskStatus,
    uploadTaskFile,
    addComment,
    fetchTaskComments,
    deleteTask,
    getTaskStats,
  };
}
