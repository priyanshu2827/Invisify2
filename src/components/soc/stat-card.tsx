'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  accentColor?: string;
  children?: ReactNode;
  className?: string;
}

export default function StatCard({ title, value, subtitle, icon, trend, accentColor = 'emerald', children, className }: StatCardProps) {
  const colorMap: Record<string, { glow: string; iconBg: string; text: string; trendUp: string; trendDown: string; gradient: string }> = {
    emerald: { glow: 'shadow-emerald-500/5', iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', text: 'text-emerald-400', trendUp: 'text-emerald-400', trendDown: 'text-rose-400', gradient: 'from-emerald-500/[0.04]' },
    cyan:    { glow: 'shadow-cyan-500/5',    iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',         text: 'text-cyan-400',    trendUp: 'text-emerald-400', trendDown: 'text-rose-400', gradient: 'from-cyan-500/[0.04]' },
    amber:   { glow: 'shadow-amber-500/5',   iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',      text: 'text-amber-400',   trendUp: 'text-amber-400',   trendDown: 'text-emerald-400', gradient: 'from-amber-500/[0.04]' },
    rose:    { glow: 'shadow-rose-500/5',     iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',         text: 'text-rose-400',    trendUp: 'text-rose-400',     trendDown: 'text-emerald-400', gradient: 'from-rose-500/[0.04]' },
    purple:  { glow: 'shadow-purple-500/5',   iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',   text: 'text-purple-400',  trendUp: 'text-purple-400',   trendDown: 'text-emerald-400', gradient: 'from-purple-500/[0.04]' },
  };

  const c = colorMap[accentColor] || colorMap.emerald;

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/[0.06] overflow-hidden',
        'hover:border-white/[0.1] transition-all duration-300 group',
        c.glow,
        className
      )}
    >
      {/* Card gradient background */}
      <div className={cn('absolute inset-0 bg-gradient-to-br to-transparent', c.gradient)} />
      <div className="absolute inset-0 bg-[#0a0f18]/90 transition-colors duration-300" />

      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] font-semibold text-neutral-500/80 uppercase tracking-wider">{title}</span>
          {icon && (
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', c.iconBg)}>
              {icon}
            </div>
          )}
        </div>

        <div className="flex items-end gap-3">
          <span className="text-3xl font-black tracking-tight text-white">{value}</span>
          {trend && (
            <span className={cn('text-[11px] font-mono font-semibold mb-1', trend.value >= 0 ? c.trendUp : c.trendDown)}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-[11px] text-neutral-500/70 mt-1.5">{subtitle}</p>
        )}

        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
