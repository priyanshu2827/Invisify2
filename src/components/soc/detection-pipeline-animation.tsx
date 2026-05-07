'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Hourglass, CheckCircle2 } from 'lucide-react';

const STAGES = [
  'VALIDATION',
  'ZERO-WIDTH',
  'HOMOGLYPH',
  'EMOJI',
  'STATISTICAL',
  'AI/ML',
  'SCORING'
];

// Each stage is held for this many ms while scanning is active
const STAGE_DURATION_MS = Math.floor(12000 / STAGES.length); // spread ~12 s across stages

interface Props {
  isScanning: boolean;
}

export default function DetectionPipelineAnimation({ isScanning }: Props) {
  const [activeStage, setActiveStage] = useState(0);
  // Hold the interval id in a ref so the callback always has the up-to-date id
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isScanning) {
      // Reset to the start every time a new scan begins
      setActiveStage(0);

      // Clear any leftover timer
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setActiveStage((prev) => {
          // Stop one stage before the last so the final stage only lights up
          // after the engine returns (i.e. when isScanning becomes false).
          if (prev >= STAGES.length - 1) {
            if (timerRef.current !== null) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return prev;
          }
          return prev + 1;
        });
      }, STAGE_DURATION_MS);

      return () => {
        if (timerRef.current !== null) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      // Scan finished — advance to fully completed state
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setActiveStage(STAGES.length);
    }
  }, [isScanning]);

  const progress = Math.min((activeStage / (STAGES.length - 1)) * 100, 100);

  return (
    <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl w-full shadow-sm">
      <h3 className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-6">Real-Time Detection Pipeline</h3>
      
      <div className="relative">
        {/* Background Line */}
        <div className="absolute top-4 left-[5%] right-[5%] h-[2px] bg-white/[0.05]" />
        
        {/* Progress Line */}
        <div 
          className="absolute top-4 left-[5%] h-[2px] bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-300 ease-linear"
          style={{ width: `${progress * 0.9}%` }}
        />

        <div className="flex justify-between relative z-10">
          {STAGES.map((stage, index) => {
            const isCompleted = activeStage > index;
            const isActive = activeStage === index;

            return (
              <div key={stage} className="flex flex-col items-center gap-3">
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 bg-[#0d1117]",
                    isCompleted
                      ? "border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                      : isActive
                      ? "border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)] animate-pulse"
                      : "border-white/10 text-neutral-600"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Hourglass size={14} className={cn(isActive && 'animate-[spin_3s_linear_infinite]')} />
                  )}
                </div>
                <span 
                  className={cn(
                    "text-[8px] sm:text-[9px] font-mono uppercase tracking-wider transition-colors duration-300",
                    isCompleted ? "text-neutral-300" :
                    isActive ? "text-cyan-400" :
                    "text-neutral-600"
                  )}
                >
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
