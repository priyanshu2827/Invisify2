'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useLogStore } from '@/lib/store';
import { deriveActivityEvents } from '@/lib/soc-analytics';
import ThreatOverview from '@/components/soc/threat-overview';
import RiskGauge from '@/components/soc/risk-gauge';
import ScanHistoryTable from '@/components/soc/scan-history-table';
import SeverityBadge from '@/components/soc/severity-badge';
import { Activity, Shield, Zap, Clock, Radio, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

const DetectionBreakdownChart = dynamic(
  () => import('@/components/soc/detection-breakdown-chart'),
  { ssr: false }
);
const ScanTimelineChart = dynamic(
  () => import('@/components/soc/scan-timeline-chart'),
  { ssr: false }
);
const LiveActivityFeed = dynamic(
  () => import('@/components/soc/live-activity-feed'),
  { ssr: false }
);

export default function SOCDashboardPage() {
  const { logs } = useLogStore();
  const [clockStr, setClockStr] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fmt = () => {
      const d = new Date();
      setClockStr(`${d.toLocaleDateString()} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    };
    fmt();
    const id = setInterval(fmt, 30_000);
    return () => clearInterval(id);
  }, []);

  const scans = mounted ? logs : [];
  const activityEvents = useMemo(() => deriveActivityEvents(scans, 24), [scans]);
  const latestScan = scans[0];

  return (
    <div className={`p-6 lg:p-8 space-y-8 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <span className="text-[11px] font-mono text-emerald-400/70 uppercase tracking-[0.2em]">Cascade Engine Active</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Threat Operations Center
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-medium">Real-time steganography detection & hidden threat analysis</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
            <Clock size={13} className="text-neutral-500" />
            <span className="text-[11px] font-mono text-neutral-400">{clockStr || '\u00A0'}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/[0.08] to-cyan-500/[0.05] border border-emerald-500/15">
            <Zap size={13} className="text-emerald-400" />
            <span className="text-[11px] font-mono font-bold text-emerald-400/80 tracking-wider">3-TIER CASCADE</span>
          </div>
          <Link href="/soc/scanner" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <Sparkles size={13} /> Launch Scanner
          </Link>
        </div>
      </div>

      {/* ═══════════════════ KPI CARDS ═══════════════════ */}
      <ThreatOverview scans={scans} />

      {/* ═══════════════════ LATEST SCAN + PIE CHART ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latest Scan Result — Hero Card */}
        <div className="lg:col-span-7 relative rounded-2xl border border-white/[0.06] overflow-hidden group">
          {/* Card background */}
          <div className="absolute inset-0 bg-[#0d1117]" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-transparent" />
          <div className="relative">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  <Shield size={14} className="text-emerald-400" />
                </div>
                <span className="text-xs font-bold text-emerald-400/80 uppercase tracking-[0.2em] font-mono">Latest Scan Result</span>
              </div>
              {latestScan && <SeverityBadge severity={latestScan.severity} size="sm" />}
            </div>
            <div className="p-6">
              {latestScan ? (
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Risk Gauge with stronger glow */}
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl scale-150" />
                    <RiskGauge score={latestScan.score} severity={latestScan.severity} size={160} />
                  </div>

                  <div className="flex-1 space-y-4">
                    {/* Type + Confidence row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                        <p className="text-[9px] font-mono text-neutral-600 uppercase tracking-[0.2em]">Content Type</p>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-cyan-500/10 flex items-center justify-center">
                            <Radio size={10} className="text-cyan-400" />
                          </div>
                          <span className="text-sm font-bold text-white tracking-tight">{latestScan.content_type}</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                        <p className="text-[9px] font-mono text-neutral-600 uppercase tracking-[0.2em]">Confidence</p>
                        <span className="text-2xl font-black text-white tracking-tight">
                          {(() => { try { const f = JSON.parse(latestScan.findings); return `${((f.ensemble_confidence || 0) * 100).toFixed(0)}%`; } catch { return 'N/A'; } })()}
                        </span>
                      </div>
                    </div>

                    {/* AI Summary */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                      <p className="text-[9px] font-mono text-neutral-600 uppercase tracking-[0.2em]">AI Analysis</p>
                      <p className="text-[13px] text-neutral-200 leading-relaxed font-medium">{latestScan.summary}</p>
                    </div>

                    {/* Reason tags */}
                    {latestScan.reasons?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {latestScan.reasons.slice(0, 3).map((r, i) => (
                          <span key={i} className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-amber-500/[0.08] border border-amber-500/20 text-amber-400 font-medium">
                            {r.length > 45 ? r.slice(0, 45) + '…' : r}
                          </span>
                        ))}
                        {latestScan.reasons.length > 3 && (
                          <span className="text-[10px] font-mono text-neutral-600 self-center">+{latestScan.reasons.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl scale-150" />
                    <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                      <Shield size={36} className="text-neutral-700" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-black text-neutral-500 uppercase tracking-widest">Awaiting Scan</p>
                    <p className="text-xs text-neutral-700 mt-1 font-mono">No data — run a forensic scan to populate results</p>
                  </div>
                  <Link href="/soc/scanner" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-105">
                    <Sparkles size={12} /> Launch Scanner
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detection Breakdown — Donut Chart */}
        <div className="lg:col-span-5 rounded-2xl border border-white/[0.06] overflow-hidden relative">
          <div className="absolute inset-0 bg-[#0d1117]" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.04] via-transparent to-transparent" />
          <div className="relative">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Activity size={14} className="text-purple-400" />
              </div>
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Detection Breakdown</span>
            </div>
            <div className="p-4 h-[300px]">
              <DetectionBreakdownChart scans={scans} />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ TIMELINE + ACTIVITY FEED ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-white/[0.06] overflow-hidden relative">
          <div className="absolute inset-0 bg-[#0d1117]" />
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.04] via-transparent to-transparent" />
          <div className="relative">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Activity size={14} className="text-cyan-400" />
              </div>
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Threat Score Timeline</span>
            </div>
            <div className="p-4 h-[300px]">
              <ScanTimelineChart scans={scans} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-white/[0.06] overflow-hidden relative">
          <div className="absolute inset-0 bg-[#0d1117]" />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.04] via-transparent to-transparent" />
          <div className="relative">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Zap size={14} className="text-amber-400" />
                </div>
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Live Activity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-mono text-neutral-600">LIVE</span>
              </div>
            </div>
            <div className="p-3 h-[300px] overflow-hidden">
              <LiveActivityFeed events={activityEvents} maxVisible={6} />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ SCAN HISTORY TABLE ═══════════════════ */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden relative">
        <div className="absolute inset-0 bg-[#0d1117]" />
        <div className="relative">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <Clock size={14} className="text-neutral-400" />
              </div>
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Scan History</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-neutral-600">{scans.length} records</span>
              <Link href="/soc/history" className="flex items-center gap-1 text-[10px] font-mono text-emerald-400/60 hover:text-emerald-400 transition-colors">
                View All <ArrowRight size={10} />
              </Link>
            </div>
          </div>
          <ScanHistoryTable scans={scans} pageSize={5} />
        </div>
      </div>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <div className="flex items-center justify-between text-[9px] font-mono text-neutral-700/60 py-3 border-t border-white/[0.03]">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />ENGINE ONLINE
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />ZUSTAND STORE
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />GEMINI AI
          </span>
        </div>
        <span className="tracking-wider">SENTINEL PRIME // INVISIFY // v4.2.0</span>
      </div>
    </div>
  );
}
