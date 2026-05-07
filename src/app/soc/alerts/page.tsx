'use client';

import { useState, useEffect } from 'react';

import { useLogStore } from '@/lib/store';
import AlertList from '@/components/soc/alert-list';
import { Bell, ShieldAlert } from 'lucide-react';

export default function AlertsPage() {
  const { logs } = useLogStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scans = mounted ? logs : [];

  const criticalCount = scans.filter((s) => s.severity === 'Critical').length;
  const highCount = scans.filter((s) => s.severity === 'High').length;
  const totalAlerts = scans.filter((s) => s.severity === 'High' || s.severity === 'Critical' || s.severity === 'Medium').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell size={12} className="text-rose-500" />
            <span className="text-[10px] font-mono text-rose-500/60 uppercase tracking-widest">Alert Center</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Security Alerts</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Critical and high-severity threat notifications</p>
        </div>
      </div>

      {/* Alert Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={14} className="text-red-400 animate-pulse" />
            <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Critical</span>
          </div>
          <span className="text-3xl font-bold text-red-400">{criticalCount}</span>
        </div>
        <div className="rounded-2xl border border-rose-500/10 bg-rose-500/[0.03] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={14} className="text-rose-400" />
            <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">High Risk</span>
          </div>
          <span className="text-3xl font-bold text-rose-400">{highCount}</span>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Bell size={14} className="text-neutral-500" />
            <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Total Alerts</span>
          </div>
          <span className="text-3xl font-bold text-white">{totalAlerts}</span>
        </div>
      </div>

      {/* Alert List */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
          <ShieldAlert size={14} className="text-amber-500" />
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">Active Alerts</span>
        </div>
        <div className="p-6">
          <AlertList scans={scans} />
        </div>
      </div>
    </div>
  );
}
