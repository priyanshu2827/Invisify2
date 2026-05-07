'use client';

import {
  ShieldCheck,
  AlertTriangle,
  Activity,
  ScanSearch,
  Brain,
  Terminal,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const timelineData = Array.from({ length: 20 }, (_, i) => ({
  time: `${i}:00`,
  score: Math.floor(Math.random() * 40) + 20 + (i % 5 === 0 ? 40 : 0),
}));

const PIE_COLORS = ['#10B981', '#F43F5E', '#F59E0B', '#3B82F6'];
const pieData = [
  { name: 'Clean', value: 400 },
  { name: 'Critical', value: 300 },
  { name: 'High', value: 300 },
  { name: 'Suspicious', value: 200 },
];

const logs = [
  { time: '13:42:01', msg: 'high_character_entropy_detected', severity: 'warn', color: 'text-amber-400' },
  { time: '13:42:04', msg: 'rx_embedding_detected (ratio:0.5)', severity: 'crit', color: 'text-rose-400' },
  { time: '13:42:05', msg: 'zero_width_characters_detected', severity: 'warn', color: 'text-amber-400' },
  { time: '13:42:10', msg: 'scan_complete_clean', severity: 'info', color: 'text-emerald-400' },
];

export default function DashboardPreview() {
  return (
    <div className="w-full max-w-6xl mx-auto rounded-2xl border border-white/10 bg-[#060910]/80 backdrop-blur-3xl overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.1)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Threat Operations Center</h3>
            <p className="text-[10px] text-emerald-500/60 font-mono tracking-widest uppercase">System Online // Protected</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono text-emerald-400">LIVE FEED</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left Col: Stats */}
        <div className="flex flex-col gap-6">
          {/* Total Scans */}
          <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] relative overflow-hidden group transition-all duration-300 hover:border-emerald-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-neutral-500 uppercase">Total Scans</span>
              <ScanSearch className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-4xl font-bold text-white tracking-tighter">
              184<span className="text-sm text-emerald-500 ml-2">↑ 12%</span>
            </div>
          </div>

          {/* Threats Detected */}
          <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-500/[0.02] relative overflow-hidden group transition-all duration-300 hover:border-rose-500/40">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-rose-500/70 uppercase">Threats Detected</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-4xl font-bold text-white tracking-tighter">
              100<span className="text-sm text-rose-500 ml-2">↑ 8%</span>
            </div>
          </div>

          {/* Detection Breakdown Pie */}
          <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex-1 relative overflow-hidden group transition-all duration-300 hover:border-cyan-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-neutral-500 uppercase">Detection Breakdown</span>
              <Brain className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="rgba(0,0,0,0)"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Center/Right Col: Chart & Logs */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Timeline */}
          <div className="p-5 rounded-xl border border-emerald-500/10 bg-[#080C14] h-[240px] relative overflow-hidden transition-all duration-300 hover:border-emerald-500/20">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-20 pointer-events-none" />
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-mono text-emerald-500/80 uppercase">Threat Score Timeline</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <Area type="monotone" dataKey="score" stroke="#10B981" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="p-5 rounded-xl border border-white/[0.06] bg-black flex-1 relative overflow-hidden group transition-all duration-300 hover:border-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-neutral-500 uppercase">Live Activity Feed</span>
              <Terminal className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="space-y-3 font-mono text-[11px]">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center gap-3 py-1 border-b border-white/[0.02]">
                  <span className="text-neutral-600 w-16">{log.time}</span>
                  <span className={`px-1.5 py-0.5 rounded uppercase text-[9px] bg-white/[0.03] ${log.color}`}>
                    {log.severity}
                  </span>
                  <span className="text-neutral-300 truncate">{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
