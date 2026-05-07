'use client';

import { cn } from '@/lib/utils';
import type { ExtensionEvent } from '@/lib/soc-types';
import SeverityBadge from './severity-badge';
import { ShieldCheck, ShieldAlert, ShieldX, Lock } from 'lucide-react';

interface ExtensionEventsProps {
  events: ExtensionEvent[];
}

const ACTION_STYLES = {
  allowed: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Allowed' },
  warned:  { icon: ShieldAlert, color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Warned' },
  blocked: { icon: ShieldX,     color: 'text-rose-400',    bg: 'bg-rose-500/10',     label: 'Blocked' },
};

export default function ExtensionEventsTable({ events }: ExtensionEventsProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-neutral-600">
        <Lock size={32} className="mx-auto mb-3 text-neutral-700" />
        <p className="text-sm font-mono">NO_EXTENSION_EVENTS</p>
        <p className="text-[10px] mt-1">Connect the Gmail extension to see scan events</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.06] bg-transparent">
            <th className="text-left p-4 text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Time</th>
            <th className="text-left p-4 text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Subject</th>
            <th className="text-left p-4 text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Sender</th>
            <th className="text-left p-4 text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Threat</th>
            <th className="text-left p-4 text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Score</th>
            <th className="text-left p-4 text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Action</th>
            <th className="text-left p-4 text-[10px] font-mono text-neutral-600 uppercase tracking-widest">SHA-256</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const action = ACTION_STYLES[event.action];
            const ActionIcon = action.icon;

            return (
              <tr key={event.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                <td className="p-4">
                  <span className="text-xs font-mono text-neutral-500">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>
                <td className="p-4 max-w-[200px]">
                  <span className="text-xs text-neutral-300 truncate block group-hover:text-neutral-900 group-hover:text-white transition-colors">{event.emailSubject}</span>
                </td>
                <td className="p-4">
                  <span className="text-xs text-neutral-500 font-mono">{event.sender}</span>
                </td>
                <td className="p-4">
                  <span className={cn(
                    'text-[10px] font-mono px-2 py-0.5 rounded-md border',
                    event.threatType === 'None'
                      ? 'bg-white/[0.03] border-white/[0.06] text-neutral-600'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  )}>
                    {event.threatType}
                  </span>
                </td>
                <td className="p-4">
                  <SeverityBadge severity={event.severity} size="sm" />
                </td>
                <td className="p-4">
                  <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg shadow-sm', action.bg)}>
                    <ActionIcon size={12} className={action.color} />
                    <span className={cn('text-[10px] font-mono font-bold', action.color)}>{action.label}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-[10px] font-mono text-neutral-700">{event.fingerprint}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
