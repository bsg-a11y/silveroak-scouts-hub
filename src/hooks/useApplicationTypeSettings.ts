 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 
 export interface ApplicationTypeSetting {
   id: string;
   application_type: string;
   is_active: boolean;
   updated_by: string | null;
   created_at: string;
   updated_at: string;
 }
 
 export function useApplicationTypeSettings() {
   const [settings, setSettings] = useState<ApplicationTypeSetting[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const { toast } = useToast();
 
   const fetchSettings = async () => {
     const { data, error } = await supabase
       .from('application_type_settings')
       .select('*')
       .order('application_type');
 
     if (error) {
       console.error('Error fetching application type settings:', error);
       return;
     }
 
     setSettings((data || []) as ApplicationTypeSetting[]);
     setIsLoading(false);
   };
 
   const toggleSetting = async (applicationType: string) => {
     const current = settings.find(s => s.application_type === applicationType);
     if (!current) return { success: false };
 
     const { error } = await supabase
       .from('application_type_settings')
       .update({ 
         is_active: !current.is_active,
         updated_at: new Date().toISOString()
       })
       .eq('application_type', applicationType);
 
     if (error) {
       toast({
         title: 'Error updating setting',
         description: error.message,
         variant: 'destructive',
       });
       return { success: false };
     }
 
     toast({ title: `${applicationType.replace('_', ' ')} form ${current.is_active ? 'deactivated' : 'activated'}` });
     await fetchSettings();
     return { success: true };
   };
 
   const isTypeActive = (applicationType: string): boolean => {
     const setting = settings.find(s => s.application_type === applicationType);
     return setting?.is_active ?? true;
   };
 
   useEffect(() => {
     fetchSettings();
   }, []);
 
   return {
     settings,
     isLoading,
     toggleSetting,
     isTypeActive,
     refetch: fetchSettings,
   };
 }