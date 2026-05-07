'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';
import type { ScanResult } from '@/lib/types';
import { getDetectionTypeDistribution } from '@/lib/soc-analytics';

const COLORS = [
  '#10b981', // emerald — zero-width
  '#f59e0b', // amber — homoglyph
  '#8b5cf6', // purple — emoji
  '#3b82f6', // blue — image
  '#ef4444', // red — bidi
  '#ec4899', // pink — AI
  '#6366f1', // indigo — SNOW
  '#f97316', // orange — prompt injection
];

interface DetectionBreakdownChartProps {
  scans: ScanResult[];
}

// Custom tooltip for dark theme
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1117]/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md">
      <p className="text-xs text-neutral-400 font-mono uppercase mb-1">{payload[0].name}</p>
      <p className="text-lg font-bold text-white">{payload[0].value} <span className="text-xs text-neutral-500">detections</span></p>
    </div>
  );
};

// Custom legend
const CustomLegend = ({ payload }: any) => {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center">
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[10px] font-mono text-neutral-500">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function DetectionBreakdownChart({ scans }: DetectionBreakdownChartProps) {
  const data = useMemo(() => getDetectionTypeDistribution(scans), [scans]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-600">
        <div className="text-center">
          <p className="text-sm font-mono">NO_THREAT_DATA</p>
          <p className="text-[10px] mt-1">Scan content to populate detection breakdown</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            animationBegin={200}
            animationDuration={800}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
