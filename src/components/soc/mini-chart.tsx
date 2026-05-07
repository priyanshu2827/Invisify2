'use client';

import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export default function MiniChart({ data, color = '#10b981', height = 32 }: MiniChartProps) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={`miniGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#miniGrad-${color.replace('#', '')})`}
          dot={false}
          isAnimationActive={true}
          animationDuration={1000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
