'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ScanResult, Severity } from '@/lib/types';
import SeverityBadge from './severity-badge';
import { AlertTriangle, Eye, Flag, X } from 'lucide-react';

interface AlertListProps {
  scans: ScanResult[];
}

export default function AlertList({ scans }: AlertListProps) {
  const [severityFilter, setSeverityFilter] = useState<Severity | 'ALL'>('ALL');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const alerts = useMemo(() => {
    return scans
      .filter((s) => s.severity === 'High' || s.severity === 'Critical' || s.severity === 'Medium')
      .filter((s) => !dismissed.has(s.id))
      .filter((s) => severityFilter === 'ALL' || s.severity === severityFilter)
      .sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [scans, severityFilter, dismissed]);

  const criticalCount = scans.filter((s) => s.severity === 'Critical').length;
  const highCount = scans.filter((s) => s.severity === 'High').length;
  const mediumCount = scans.filter((s) => s.severity === 'Medium').length;

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSeverityFilter('ALL')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-mono border transition-all',
            severityFilter === 'ALL' 
              ? 'bg-white/[0.08] border-white/[0.1] text-white' 
              : 'bg-white/[0.02] border-white/[0.04] text-neutral-500 hover:text-neutral-300 shadow-sm'
          )}
        >
          All ({criticalCount + highCount + mediumCount})
        </button>
        <button
          onClick={() => setSeverityFilter('Critical')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-mono border transition-all',
            severityFilter === 'Critical' 
              ? 'bg-red-500/15 border-red-500/30 text-red-400' 
              : 'bg-white/[0.02] border-white/[0.04] text-neutral-500 hover:text-neutral-300 shadow-sm'
          )}
        >
          Critical ({criticalCount})
        </button>
        <button
          onClick={() => setSeverityFilter('High')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-mono border transition-all',
            severityFilter === 'High' 
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' 
              : 'bg-white/[0.02] border-white/[0.04] text-neutral-500 hover:text-neutral-300 shadow-sm'
          )}
        >
          High ({highCount})
        </button>
        <button
          onClick={() => setSeverityFilter('Medium')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-mono border transition-all',
            severityFilter === 'Medium' 
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
              : 'bg-white/[0.02] border-white/[0.04] text-neutral-500 hover:text-neutral-300 shadow-sm'
          )}
        >
          Medium ({mediumCount})
        </button>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'rounded-2xl border p-5 transition-all hover:border-white/[0.1] group shadow-sm',
              alert.severity === 'Critical' ? 'bg-red-500/[0.03] border-red-500/10' :
              alert.severity === 'High' ? 'bg-rose-500/[0.03] border-rose-500/10' :
              'bg-amber-500/[0.03] border-amber-500/10'
            )}
          >
            <div className="flex items-start gap-4">
              {/* Severity Icon */}
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner',
                alert.severity === 'Critical' ? 'bg-red-500/10' :
                alert.severity === 'High' ? 'bg-rose-500/10' :
                'bg-amber-500/10'
              )}>
                <AlertTriangle size={20} className={
                  alert.severity === 'Critical' ? 'text-red-400 animate-pulse' :
                  alert.severity === 'High' ? 'text-rose-400' :
                  'text-amber-400'
                } />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={alert.severity} size="sm" />
                  <span className="text-[10px] font-mono text-neutral-600">
                    {alert.content_type} • Score: {alert.score}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-700 ml-auto">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed mb-2">{alert.summary}</p>
                {alert.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {alert.reasons.slice(0, 3).map((r, i) => (
                      <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-neutral-500">
                        {r.length > 60 ? r.slice(0, 60) + '...' : r}
                      </span>
                    ))}
                    {alert.reasons.length > 3 && (
                      <span className="text-[10px] font-mono text-neutral-600">+{alert.reasons.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 rounded-lg hover:bg-white/[0.06] text-neutral-400 hover:text-neutral-300 transition-colors" title="View Details">
                  <Eye size={14} />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-white/[0.06] text-neutral-400 hover:text-amber-400 transition-colors" title="Mark False Positive">
                  <Flag size={14} />
                </button>
                <button
                  onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-neutral-400 hover:text-rose-400 transition-colors"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="text-center py-16 text-neutral-600">
            <AlertTriangle size={32} className="mx-auto mb-3 text-neutral-700" />
            <p className="text-sm font-mono">NO_ACTIVE_ALERTS</p>
            <p className="text-[10px] mt-1">All threats have been reviewed or dismissed</p>
          </div>
        )}
      </div>
    </div>
  );
}
