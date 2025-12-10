import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  importance: string;
  attachment_url: string | null;
  expiry_date: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  importance?: string;
  attachment_url?: string;
  expiry_date?: string;
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out expired announcements
      const validAnnouncements = (data || []).filter(a => {
        if (!a.expiry_date) return true;
        return new Date(a.expiry_date) >= new Date();
      });

      setAnnouncements(validAnnouncements);
    } catch (error: any) {
      toast({
        title: 'Error fetching announcements',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createAnnouncement = async (data: CreateAnnouncementData) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          title: data.title,
          content: data.content,
          importance: data.importance || 'normal',
          attachment_url: data.attachment_url || null,
          expiry_date: data.expiry_date || null,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Announcement posted successfully',
      });

      await fetchAnnouncements();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error posting announcement',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Announcement deleted successfully',
      });

      await fetchAnnouncements();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error deleting announcement',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  return {
    announcements,
    isLoading,
    fetchAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
  };
}
