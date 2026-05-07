'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Severity } from '@/lib/types';

interface RiskGaugeProps {
  score: number;
  severity: Severity;
  size?: number;
  className?: string;
  animated?: boolean;
}

const SEVERITY_COLORS: Record<Severity, { stroke: string; glow: string; text: string }> = {
  Safe:     { stroke: '#10b981', glow: 'rgba(16,185,129,0.3)',  text: 'text-emerald-400' },
  Low:      { stroke: '#14b8a6', glow: 'rgba(20,184,166,0.3)',  text: 'text-teal-400' },
  Medium:   { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.3)',  text: 'text-amber-400' },
  High:     { stroke: '#f43f5e', glow: 'rgba(244,63,94,0.3)',   text: 'text-rose-400' },
  Critical: { stroke: '#ef4444', glow: 'rgba(239,68,68,0.4)',   text: 'text-red-400' },
};

export default function RiskGauge({ score, severity, size = 180, className, animated = true }: RiskGaugeProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const colors = SEVERITY_COLORS[severity as Severity] || { stroke: '#737373', glow: 'rgba(115,115,115,0.3)', text: 'text-neutral-400' };

  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayScore / 100) * circumference;
  const dashOffset = circumference - progress;

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }
    let frame: number;
    const start = performance.now();
    const duration = 800;
    const from = 0;
    const to = score;

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score, animated]);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-white/[0.06]"
          strokeWidth={strokeWidth}
        />
        {/* Glow layer */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.glow}
          strokeWidth={strokeWidth + 6}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ filter: 'blur(8px)', transition: 'stroke-dashoffset 0.3s ease-out' }}
        />
        {/* Main arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-white tracking-tighter">{displayScore}</span>
        <span className={cn('text-[10px] font-mono uppercase tracking-widest mt-1', colors.text)}>
          {severity || 'Unknown'}
        </span>
      </div>
    </div>
  );
}
