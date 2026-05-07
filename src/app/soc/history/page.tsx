'use client';

import { useMemo, useState, useEffect } from 'react';
import { useLogStore } from '@/lib/store';
import ScanHistoryTable from '@/components/soc/scan-history-table';
import type { Severity, ContentType } from '@/lib/types';
import { History, Download, Trash2, Filter, Database } from 'lucide-react';
import { exportToCsv } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function HistoryPage() {
  const { logs, clearLogs } = useLogStore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Wait until mounted to use the actual logs, avoiding hydration mismatches
  const scans = mounted ? logs : [];

  const [severityFilter, setSeverityFilter] = useState<Severity | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ContentType | 'ALL'>('ALL');
  const [showConfirm, setShowConfirm] = useState(false);

  const filtered = useMemo(() => {
    return scans.filter((s) => {
      if (severityFilter !== 'ALL' && s.severity !== severityFilter) return false;
      if (typeFilter !== 'ALL' && s.content_type !== typeFilter) return false;
      return true;
    });
  }, [scans, severityFilter, typeFilter]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast({ variant: 'destructive', title: 'Export Failed', description: 'No data to export.' });
      return;
    }
    exportToCsv(`invisify-forensics-${new Date().toISOString()}.csv`, filtered);
    toast({ title: 'Export Complete', description: `Exported ${filtered.length} records.` });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database size={12} className="text-blue-500" />
            <span className="text-[10px] font-mono text-blue-500/60 uppercase tracking-widest">Archive System</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Scan History</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Complete forensic scan archive with filtering and export</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-neutral-500 hover:text-neutral-300 transition-all text-xs font-mono shadow-sm">
            <Download size={12} /> Export CSV
          </button>
          <button
            onClick={() => { if (showConfirm) { clearLogs(); setShowConfirm(false); toast({ title: 'Archive Wiped' }); } else setShowConfirm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-xs font-mono"
          >
            <Trash2 size={12} /> {showConfirm ? 'Confirm Wipe?' : 'Wipe Archive'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={12} className="text-neutral-600" />
            <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Filters</span>
          </div>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as Severity | 'ALL')}
            className="bg-black/40 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-400 focus:outline-none focus:border-emerald-500/30"
          >
            <option value="ALL">All Severities</option>
            <option value="Safe">Safe</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ContentType | 'ALL')}
            className="bg-black/40 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-400 focus:outline-none focus:border-emerald-500/30"
          >
            <option value="ALL">All Types</option>
            <option value="Text">Text</option>
            <option value="Image">Image</option>
            <option value="Emoji">Emoji</option>
          </select>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] font-mono text-neutral-600">TOTAL: {scans.length}</span>
            <span className="text-[10px] font-mono text-cyan-500/60">FILTERED: {filtered.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl overflow-hidden shadow-sm">
        <ScanHistoryTable scans={filtered} pageSize={12} />
      </div>
    </div>
  );
}
