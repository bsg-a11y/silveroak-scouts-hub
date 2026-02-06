import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GoogleSheetsSettings {
  id: string;
  sheet_id: string | null;
  sheet_url: string | null;
  sheet_name: string;
  is_enabled: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useGoogleSheetsSync() {
  const [settings, setSettings] = useState<GoogleSheetsSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('google_sheets_settings')
        .select('*')
        .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSettings(data as GoogleSheetsSettings | null);
    } catch (error: any) {
      console.error('Error fetching Google Sheets settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createAndSync = async (sheetName?: string) => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
        body: { action: 'create', sheetName: sheetName || 'BSG Members' }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Google Sheet Created!',
        description: 'Your members are now synced to Google Sheets.',
      });

      await fetchSettings();
      return { success: true, spreadsheetUrl: data.spreadsheetUrl };
    } catch (error: any) {
      toast({
        title: 'Error creating Google Sheet',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  };

  const syncNow = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
        body: { action: 'sync' }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Sync Complete',
        description: `${data.memberCount} members synced to Google Sheets.`,
      });

      await fetchSettings();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error syncing',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setIsSyncing(false);
    }
  };

  const disableSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
        body: { action: 'disable' }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Sync Disabled',
        description: 'Google Sheets sync has been disabled.',
      });

      await fetchSettings();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error disabling sync',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    isLoading,
    isSyncing,
    createAndSync,
    syncNow,
    disableSync,
    refetch: fetchSettings,
  };
}