import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, Save, BookOpen } from 'lucide-react';
import { useOfficeRules, useOfficeAttendance, sumMinutes, formatHours } from '@/hooks/useOfficeAttendance';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

interface Props {
  isAdmin: boolean;
  /** When a member is viewing, pass their userId to compute compliance */
  userId?: string;
}

export function OfficeRulesCard({ isAdmin, userId }: Props) {
  const { rules, isLoading, saveRules } = useOfficeRules();
  const [draft, setDraft] = useState({
    weekly_hours_target: 0,
    monthly_hours_target: 0,
    open_time: '09:00',
    close_time: '18:00',
    enforce_window: false,
    rules_text: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rules) {
      setDraft({
        weekly_hours_target: Number(rules.weekly_hours_target) || 0,
        monthly_hours_target: Number(rules.monthly_hours_target) || 0,
        open_time: (rules.open_time || '09:00').slice(0, 5),
        close_time: (rules.close_time || '18:00').slice(0, 5),
        enforce_window: !!rules.enforce_window,
        rules_text: rules.rules_text || '',
      });
    }
  }, [rules]);

  // member compliance calc
  const now = new Date();
  const weekFrom = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekTo = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthFrom = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthTo = format(endOfMonth(now), 'yyyy-MM-dd');

  const { logs: weekLogs } = useOfficeAttendance({ userId, fromDate: weekFrom, toDate: weekTo, enabled: !!userId && !isAdmin });
  const { logs: monthLogs } = useOfficeAttendance({ userId, fromDate: monthFrom, toDate: monthTo, enabled: !!userId && !isAdmin });

  const weekMin = useMemo(() => sumMinutes(weekLogs), [weekLogs]);
  const monthMin = useMemo(() => sumMinutes(monthLogs), [monthLogs]);

  if (isLoading) {
    return <Card><CardContent className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>;
  }

  if (!isAdmin) {
    const wkTarget = Number(rules?.weekly_hours_target) || 0;
    const mnTarget = Number(rules?.monthly_hours_target) || 0;
    const wkMet = wkTarget === 0 || weekMin / 60 >= wkTarget;
    const mnMet = mnTarget === 0 || monthMin / 60 >= mnTarget;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5" /> Office Rules &amp; My Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Weekly target</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold">{wkTarget > 0 ? `${wkTarget} hrs` : '—'}</span>
                <Badge variant={wkMet ? 'success' : 'danger'}>{wkMet ? 'Met' : 'Below'}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">You: {formatHours(weekMin)} this week</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Monthly target</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold">{mnTarget > 0 ? `${mnTarget} hrs` : '—'}</span>
                <Badge variant={mnMet ? 'success' : 'danger'}>{mnMet ? 'Met' : 'Below'}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">You: {formatHours(monthMin)} this month</div>
            </div>
          </div>
          <div className="text-sm border rounded-lg p-3 bg-muted/30">
            <div className="font-medium mb-1">Office Hours</div>
            <div className="text-muted-foreground">
              {(rules?.open_time || '09:00').slice(0, 5)} – {(rules?.close_time || '18:00').slice(0, 5)}
              {rules?.enforce_window ? ' (strictly enforced)' : ''}
            </div>
          </div>
          {rules?.rules_text && (
            <div className="text-sm border rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
              {rules.rules_text}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Admin editor
  const handleSave = async () => {
    setSaving(true);
    await saveRules({
      weekly_hours_target: draft.weekly_hours_target,
      monthly_hours_target: draft.monthly_hours_target,
      open_time: draft.open_time,
      close_time: draft.close_time,
      enforce_window: draft.enforce_window,
      rules_text: draft.rules_text,
    });
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5" /> Office Rules (Admin)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Weekly hours target</Label>
            <Input type="number" min={0} step="0.5" value={draft.weekly_hours_target}
              onChange={(e) => setDraft(d => ({ ...d, weekly_hours_target: Number(e.target.value) || 0 }))} />
          </div>
          <div className="space-y-1">
            <Label>Monthly hours target</Label>
            <Input type="number" min={0} step="0.5" value={draft.monthly_hours_target}
              onChange={(e) => setDraft(d => ({ ...d, monthly_hours_target: Number(e.target.value) || 0 }))} />
          </div>
          <div className="space-y-1">
            <Label>Office open time</Label>
            <Input type="time" value={draft.open_time}
              onChange={(e) => setDraft(d => ({ ...d, open_time: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Office close time</Label>
            <Input type="time" value={draft.close_time}
              onChange={(e) => setDraft(d => ({ ...d, close_time: e.target.value }))} />
          </div>
        </div>
        <div className="flex items-center gap-3 border rounded-lg p-3">
          <Switch checked={draft.enforce_window}
            onCheckedChange={(v) => setDraft(d => ({ ...d, enforce_window: v }))} />
          <div>
            <div className="text-sm font-medium">Enforce check-in window</div>
            <div className="text-xs text-muted-foreground">Block check-ins outside open/close times.</div>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Rules / Code of Conduct</Label>
          <Textarea rows={6} value={draft.rules_text}
            onChange={(e) => setDraft(d => ({ ...d, rules_text: e.target.value }))}
            placeholder="Write the rules visible to members…" />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save rules
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}