'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Severity } from '@/lib/types';
import type { ActivityEvent } from '@/lib/soc-types';
import {
  EyeOff,
  Type,
  Smile,
  Image as ImageIcon,
  AlertTriangle,
  Brain,
  Snowflake,
  ShieldAlert,
  Chrome,
  ShieldCheck,
} from 'lucide-react';

const TYPE_CONFIG: Record<ActivityEvent['type'], { icon: React.ElementType; color: string; label: string }> = {
  zero_width:       { icon: EyeOff,       color: 'text-emerald-400',  label: 'ZWSP' },
  homoglyph:        { icon: Type,          color: 'text-amber-400',    label: 'HOMO' },
  emoji_stego:      { icon: Smile,         color: 'text-purple-400',   label: 'EMOJI' },
  image_lsb:        { icon: ImageIcon,     color: 'text-blue-400',     label: 'IMAGE' },
  bidi:             { icon: AlertTriangle, color: 'text-red-400',      label: 'BIDI' },
  prompt_injection:  { icon: ShieldAlert,   color: 'text-orange-400',   label: 'INJECT' },
  ai_semantic:      { icon: Brain,         color: 'text-pink-400',     label: 'AI' },
  safe:             { icon: ShieldCheck,   color: 'text-neutral-500',  label: 'SAFE' },
  extension:        { icon: Chrome,        color: 'text-cyan-400',     label: 'EXT' },
};

const SEVERITY_DOT: Record<Severity, string> = {
  Safe: 'bg-emerald-500',
  Low: 'bg-teal-500',
  Medium: 'bg-amber-500',
  High: 'bg-rose-500',
  Critical: 'bg-red-500 animate-pulse',
};

interface LiveActivityFeedProps {
  events: ActivityEvent[];
  maxVisible?: number;
}

export default function LiveActivityFeed({ events, maxVisible = 8 }: LiveActivityFeedProps) {
  const [visibleEvents, setVisibleEvents] = useState<ActivityEvent[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Staggered animation: add events one by one
  useEffect(() => {
    const sorted = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const toShow = sorted.slice(0, maxVisible);

    setVisibleEvents([]);
    const timers: NodeJS.Timeout[] = [];

    toShow.forEach((event, index) => {
      const timer = setTimeout(() => {
        setVisibleEvents((prev) => [...prev, event]);
      }, index * 120);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [events, maxVisible]);

  return (
    <div ref={containerRef} className="space-y-1 overflow-y-auto max-h-full pr-1">
      {visibleEvents.map((event, idx) => {
        const config = TYPE_CONFIG[event.type] || { icon: AlertTriangle, color: 'text-neutral-500', label: 'UNKNOWN' };
        const Icon = config.icon;

        return (
          <div
            key={event.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl transition-all duration-300',
              'hover:bg-white/[0.03] group',
              'animate-in fade-in slide-in-from-top-2',
            )}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Severity dot + timeline line */}
            <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
              <div className={cn('w-2 h-2 rounded-full', SEVERITY_DOT[event.severity as Severity] || 'bg-neutral-500')} />
              {idx < visibleEvents.length - 1 && (
                <div className="w-px flex-1 bg-white/[0.04] min-h-[16px]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={12} className={cn('shrink-0', config.color)} />
                <span className={cn('text-[9px] font-mono font-bold uppercase tracking-widest', config.color)}>
                  {config.label}
                </span>
                <span className="text-[9px] font-mono text-neutral-700 ml-auto shrink-0">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed truncate group-hover:text-neutral-900 group-hover:text-neutral-300 transition-colors">
                {event.message}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-mono text-neutral-600 uppercase">{event.source}</span>
              </div>
            </div>
          </div>
        );
      })}

      {visibleEvents.length === 0 && (
        <div className="flex items-center justify-center h-32 text-neutral-600">
          <p className="text-xs font-mono">Waiting for events...</p>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
