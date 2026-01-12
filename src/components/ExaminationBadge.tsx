import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExaminationBadgeProps {
  stageName: string;
  status: 'ongoing' | 'complete';
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  'Joining': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
  'Pravesh': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  'Nipun': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  'Rajyapuraskar': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  'Rashtrapti Puraskar': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  'Ranger Rover': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
};

export function ExaminationBadge({ 
  stageName, 
  status, 
  className, 
  showIcon = true,
  size = 'md' 
}: ExaminationBadgeProps) {
  const colors = STAGE_COLORS[stageName] || { bg: 'bg-muted', text: 'text-muted-foreground' };
  const statusSuffix = status === 'complete' ? '✓' : '⋯';
  
  return (
    <Badge 
      className={cn(
        'border-transparent font-medium inline-flex items-center gap-1',
        colors.bg,
        colors.text,
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      {showIcon && <Award className={cn(size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />}
      <span>{stageName}</span>
      <span className={status === 'complete' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
        {statusSuffix}
      </span>
    </Badge>
  );
}
