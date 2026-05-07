'use client';

import { useMemo } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Scan } from 'lucide-react';
import StatCard from './stat-card';
import MiniChart from './mini-chart';
import type { ScanResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ThreatOverviewProps {
  scans: ScanResult[];
}

export default function ThreatOverview({ scans }: ThreatOverviewProps) {
  const stats = useMemo(() => {
    const total = scans.length;
    const threats = scans.filter((s) => s.score > 30).length;
    const highRisk = scans.filter((s) => s.severity === 'High' || s.severity === 'Critical').length;
    const safe = scans.filter((s) => s.severity === 'Safe').length;
    const safeRatio = total > 0 ? Math.round((safe / total) * 100) : 0;

    // Sparkline data: last 8 scan scores
    const recentScores = scans.slice(0, 8).map((s) => s.score).reverse();
    const recentThreats = scans.slice(0, 8).map((s) => (s.score > 30 ? 1 : 0)).reverse();

    return { total, threats, highRisk, safe, safeRatio, recentScores, recentThreats };
  }, [scans]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        title="Total Scans"
        value={stats.total}
        subtitle={`${stats.total} content streams analyzed`}
        icon={<Scan size={16} />}
        accentColor="cyan"
        trend={{ value: 12, label: 'today' }}
      >
        <MiniChart data={stats.recentScores} color="#22d3ee" height={28} />
      </StatCard>

      <StatCard
        title="Threats Detected"
        value={stats.threats}
        subtitle={`${stats.total > 0 ? Math.round((stats.threats / stats.total) * 100) : 0}% threat rate`}
        icon={<ShieldAlert size={16} />}
        accentColor="amber"
        trend={{ value: stats.threats > 3 ? 8 : -5, label: 'vs avg' }}
      >
        <MiniChart data={stats.recentThreats.length > 0 ? stats.recentScores : [0]} color="#f59e0b" height={28} />
      </StatCard>

      <StatCard
        title="High-Risk Alerts"
        value={stats.highRisk}
        subtitle="Critical + High severity"
        icon={<AlertTriangle size={16} />}
        accentColor="rose"
        trend={stats.highRisk > 0 ? { value: 15, label: 'active' } : undefined}
      >
        <div className="flex gap-1">
          {scans.slice(0, 8).map((s, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 h-1.5 rounded-full',
                s.severity === 'Critical' ? 'bg-red-500' :
                s.severity === 'High' ? 'bg-rose-500' :
                s.severity === 'Medium' ? 'bg-amber-500/40' :
                'bg-white/[0.06]'
              )}
            />
          ))}
        </div>
      </StatCard>

      <StatCard
        title="Safe Ratio"
        value={`${stats.safeRatio}%`}
        subtitle={`${stats.safe} of ${stats.total} clean`}
        icon={<ShieldCheck size={16} />}
        accentColor="emerald"
      >
        {/* Mini progress bar */}
        <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 from-emerald-500 to-emerald-400 transition-all duration-700"
            style={{ width: `${stats.safeRatio}%` }}
          />
        </div>
      </StatCard>
    </div>
  );
}
