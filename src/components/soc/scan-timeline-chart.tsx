'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { useMemo } from 'react';
import type { ScanResult } from '@/lib/types';
import { getTimelineData } from '@/lib/soc-analytics';

interface ScanTimelineChartProps {
  scans: ScanResult[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  const severity = score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : score >= 10 ? 'LOW' : 'SAFE';
  const color = score >= 80 ? '#ef4444' : score >= 60 ? '#f43f5e' : score >= 30 ? '#f59e0b' : score >= 10 ? '#14b8a6' : '#10b981';

  return (
    <div className="bg-[#0d1117]/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md">
      <p className="text-[10px] font-mono text-neutral-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-lg font-bold text-white">{score}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color }}>{severity}</span>
      </div>
    </div>
  );
};

export default function ScanTimelineChart({ scans }: ScanTimelineChartProps) {
  const data = useMemo(() => getTimelineData(scans), [scans]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-600">
        <div className="text-center">
          <p className="text-sm font-mono">NO_TIMELINE_DATA</p>
          <p className="text-[10px] mt-1">Scans will appear here as timeline data</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-white/[0.04]" />
        <XAxis
          dataKey="time"
          tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={{ stroke: 'currentColor' }}
          className="text-white/[0.06]"
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={{ stroke: 'currentColor' }}
          className="text-white/[0.06]"
          tickLine={false}
        />
        {/* Threshold lines */}
        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.3} />
        <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.2} />
        <ReferenceLine y={30} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.2} />

        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#scoreGradient)"
          dot={{ fill: 'currentColor', stroke: '#10b981', strokeWidth: 2, r: 3 }}
          activeDot={{ fill: '#10b981', stroke: 'currentColor', strokeWidth: 2, r: 5 }}
          className="text-[#0d1117]"
          animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
