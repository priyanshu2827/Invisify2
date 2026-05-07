'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ScanResult, Severity, ContentType } from '@/lib/types';
import SeverityBadge from './severity-badge';
import { FileText, Image as ImageIcon, Smile, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

const TYPE_ICON: Record<ContentType, { icon: React.ElementType; color: string }> = {
  Text: { icon: FileText, color: 'text-cyan-400' },
  Image: { icon: ImageIcon, color: 'text-blue-400' },
  Emoji: { icon: Smile, color: 'text-purple-400' },
};

interface ScanHistoryTableProps {
  scans: ScanResult[];
  pageSize?: number;
}

type SortField = 'timestamp' | 'score' | 'severity';
type SortDir = 'asc' | 'desc';

const SEVERITY_ORDER: Record<Severity, number> = { Safe: 0, Low: 1, Medium: 2, High: 3, Critical: 4 };

export default function ScanHistoryTable({ scans, pageSize = 8 }: ScanHistoryTableProps) {
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    return [...scans].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'timestamp':
          cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'score':
          cmp = a.score - b.score;
          break;
        case 'severity':
          cmp = (SEVERITY_ORDER[a.severity as Severity] ?? -1) - (SEVERITY_ORDER[b.severity as Severity] ?? -1);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [scans, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={cn(
        'flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest transition-colors',
        sortField === field ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-400'
      )}
    >
      {label}
      <ArrowUpDown size={10} className={sortField === field ? 'opacity-100' : 'opacity-30'} />
    </button>
  );

  if (scans.length === 0) {
    return (
      <div className="text-center py-16 text-neutral-600">
        <p className="text-sm font-mono">ARCHIVE_EMPTY</p>
        <p className="text-[10px] mt-1">No scan records available</p>
      </div>
    );
  }

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06] bg-transparent">
              <th className="text-left p-4"><SortButton field="timestamp" label="Timestamp" /></th>
              <th className="text-left p-4"><span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Input Type</span></th>
              <th className="text-left p-4"><SortButton field="score" label="Score" /></th>
              <th className="text-left p-4"><SortButton field="severity" label="Severity" /></th>
              <th className="text-left p-4"><span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Summary</span></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((scan) => {
              const typeConfig = TYPE_ICON[scan.content_type as ContentType] || { icon: FileText, color: 'text-neutral-500' };
              const Icon = typeConfig.icon;

              return (
                <tr
                  key={scan.id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="p-4" suppressHydrationWarning>
                    <span className="text-xs font-mono text-neutral-500" suppressHydrationWarning>
                      {new Date(scan.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <br />
                    <span className="text-[10px] font-mono text-neutral-700" suppressHydrationWarning>
                      {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center', typeConfig.color)}>
                        <Icon size={12} />
                      </div>
                      <span className="text-xs text-neutral-400">{scan.content_type}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', scoreColor(scan.score))}
                          style={{ width: `${scan.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-neutral-400 w-8">{scan.score}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <SeverityBadge severity={scan.severity} size="sm" />
                  </td>
                  <td className="p-4 max-w-[300px]">
                    <p className="text-xs text-neutral-500 truncate group-hover:text-neutral-900 group-hover:text-neutral-400 transition-colors">
                      {scan.summary}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04] bg-transparent">
          <span className="text-[10px] font-mono text-neutral-600">
            Page {page + 1} of {totalPages} • {sorted.length} records
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-white/[0.04] text-neutral-500 disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-white/[0.04] text-neutral-500 disabled:opacity-30 transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-rose-500';
  if (score >= 30) return 'bg-amber-500';
  if (score >= 10) return 'bg-teal-500';
  return 'bg-emerald-500';
}
