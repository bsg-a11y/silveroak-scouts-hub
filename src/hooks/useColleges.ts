import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface College {
  id: string;
  name: string;
  short_code: string;
}

export function useColleges() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchColleges = async () => {
      const { data, error } = await supabase
        .from('colleges')
        .select('*')
        .order('name');

      if (!error && data) {
        setColleges(data);
      }
      setIsLoading(false);
    };

    fetchColleges();
  }, []);

  return { colleges, isLoading };
}
