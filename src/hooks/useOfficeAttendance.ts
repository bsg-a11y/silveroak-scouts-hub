import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OfficeLog {
  id: string;
  user_id: string;
  check_in_at: string;
  check_out_at: string | null;
  log_date: string;
  marked_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function formatHours(totalMinutes: number) {
  if (!totalMinutes || totalMinutes < 0) return '0h 0m';
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${h}h ${m}m`;
}

export function logMinutes(log: OfficeLog) {
  if (!log.check_out_at) return 0;
  return (
    (new Date(log.check_out_at).getTime() - new Date(log.check_in_at).getTime()) /
    60000
  );
}

export function sumMinutes(logs: OfficeLog[]) {
  return logs.reduce((s, l) => s + logMinutes(l), 0);
}

/**
 * Fetch office attendance logs scoped by date range and/or user.
 */
export function useOfficeAttendance(opts: {
  userId?: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
  enabled?: boolean;
}) {
  const { userId, fromDate, toDate, enabled = true } = opts;
  const [logs, setLogs] = useState<OfficeLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      let q = supabase.from('office_attendance_logs').select('*').order('check_in_at', { ascending: false });
      if (userId) q = q.eq('user_id', userId);
      if (fromDate) q = q.gte('log_date', fromDate);
      if (toDate) q = q.lte('log_date', toDate);
      const { data, error } = await q;
      if (error) throw error;
      setLogs((data || []) as OfficeLog[]);
    } catch (e: any) {
      toast({ title: 'Error loading office attendance', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [userId, fromDate, toDate, enabled, toast]);

  useEffect(() => {
    fetchLogs();
    if (!enabled) return;
    const channel = supabase
      .channel(`office-att-${userId || 'all'}-${fromDate || ''}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'office_attendance_logs' }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLogs, enabled, userId, fromDate]);

  return { logs, isLoading, refetch: fetchLogs };
}

export async function checkInMember(userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  // Prevent double check-in
  const { data: open } = await supabase
    .from('office_attendance_logs')
    .select('id')
    .eq('user_id', userId)
    .is('check_out_at', null)
    .limit(1);
  if (open && open.length > 0) {
    return { success: false, error: 'Member is already checked in' };
  }
  const { error } = await supabase.from('office_attendance_logs').insert({
    user_id: userId,
    marked_by: user?.id ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function checkOutMember(userId: string) {
  // Find latest open session
  const { data: open, error: e1 } = await supabase
    .from('office_attendance_logs')
    .select('id')
    .eq('user_id', userId)
    .is('check_out_at', null)
    .order('check_in_at', { ascending: false })
    .limit(1);
  if (e1) return { success: false, error: e1.message };
  if (!open || open.length === 0) return { success: false, error: 'No active check-in found' };
  const { error } = await supabase
    .from('office_attendance_logs')
    .update({ check_out_at: new Date().toISOString() })
    .eq('id', open[0].id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
