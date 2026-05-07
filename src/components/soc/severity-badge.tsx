'use client';

import { cn } from '@/lib/utils';
import type { Severity } from '@/lib/types';

const styles: Record<Severity, { bg: string; text: string; border: string; dot: string }> = {
  Safe:     { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  Low:      { bg: 'bg-teal-500/10',    text: 'text-teal-400',    border: 'border-teal-500/20',    dot: 'bg-teal-500' },
  Medium:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   dot: 'bg-amber-500' },
  High:     { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/20',     dot: 'bg-rose-500' },
  Critical: { bg: 'bg-red-600/15',     text: 'text-red-400',     border: 'border-red-500/30',      dot: 'bg-red-500' },
};

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  pulse?: boolean;
  className?: string;
}

export default function SeverityBadge({ severity, size = 'md', showDot = true, pulse, className }: SeverityBadgeProps) {
  const s = styles[severity as Severity] || { bg: 'bg-neutral-500/10', text: 'text-neutral-400', border: 'border-neutral-500/20', dot: 'bg-neutral-500' };
  const shouldPulse = pulse ?? severity === 'Critical';

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-mono font-semibold tracking-wider uppercase',
        s.bg, s.text, s.border,
        sizeClasses[size],
        shouldPulse && 'animate-pulse',
        className
      )}
    >
      {showDot && (
        <span className={cn('rounded-full shrink-0', s.dot, size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5')} />
      )}
      {severity || 'Unknown'}
    </span>
  );
}
