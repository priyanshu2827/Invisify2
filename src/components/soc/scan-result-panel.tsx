'use client';

import { cn } from '@/lib/utils';
import type { ScanResult, Severity } from '@/lib/types';
import RiskGauge from './risk-gauge';
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  Brain,
  Layers,
  ChevronDown,
  ChevronRight,
  Cpu,
  Search,
} from 'lucide-react';
import { useState } from 'react';

interface ScanResultPanelProps {
  result: ScanResult;
}

export default function ScanResultPanel({ result }: ScanResultPanelProps) {
  const [expandedFindings, setExpandedFindings] = useState(false);

  let parsedFindings: any = {};
  try {
    parsedFindings = typeof result.findings === 'string' ? JSON.parse(result.findings) : result.findings || {};
  } catch { parsedFindings = {}; }

  const ensembleConfidence = parsedFindings.ensemble_confidence || 0;
  const detectorsTriggered = parsedFindings.detectors_triggered || 0;
  const detectorsTotal = parsedFindings.detectors_total || 1;
  const hasAI = !!parsedFindings.semantic_ai?.isSuspicious;
  const hasDL = !!parsedFindings.dl_analysis && parsedFindings.dl_analysis.model_loaded;
  const dlScore = parsedFindings.dl_analysis?.score ?? 0;
  const dlConfidence = parsedFindings.dl_analysis?.confidence ?? 0;
  const hasAletheia = !!parsedFindings.aletheia && !parsedFindings.aletheia.error;
  const aletheiaChi = parsedFindings.aletheia?.chi_square;
  const aletheiaSpa = parsedFindings.aletheia?.spa;
  const aletheiaRs = parsedFindings.aletheia?.rs_analysis;
  const aletheiaPq = parsedFindings.aletheia?.primary_quantization;
  const aletheiaTriggered = [aletheiaChi, aletheiaSpa, aletheiaRs, aletheiaPq].filter(
    (d) => d && !d.error && d.positive
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Risk Gauge */}
      <div className="flex justify-center">
        <RiskGauge score={result.score} severity={result.severity} size={160} />
      </div>

      {/* Severity Banner */}
      <div className={cn(
        'p-4 rounded-2xl border flex items-center gap-3',
        severityBannerStyles[result.severity as Severity] || 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
      )}>
        <div className="bg-white/10 p-2 rounded-xl">
          {result.severity === 'Safe' || result.severity === 'Low' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-mono opacity-60 uppercase">Classification</p>
          <p className="text-lg font-bold tracking-tight">{result.severity}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono opacity-60 uppercase">Score</p>
          <p className="text-lg font-bold tracking-tight">{result.score}/100</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[9px] font-mono text-neutral-600 uppercase mb-1">Method</p>
          <div className="flex items-center gap-1.5">
            {hasAI && <Brain size={12} className="text-purple-400" />}
            {hasDL && <Cpu size={12} className="text-cyan-400" />}
            {hasAletheia && <Search size={12} className="text-amber-400" />}
            <span className="text-xs font-bold text-white">
              {hasDL && hasAI && hasAletheia ? 'AI + DL + ALE + STAT'
                : hasDL && hasAletheia ? 'DL + ALE + STAT'
                : hasAI && hasAletheia ? 'AI + ALE + STAT'
                : hasDL && hasAI ? 'AI + DL + STAT'
                : hasDL ? 'DL + STAT'
                : hasAletheia ? 'ALE + STAT'
                : hasAI ? 'AI + STAT'
                : 'STAT'}
            </span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[9px] font-mono text-neutral-600 uppercase mb-1">Confidence</p>
          <span className="text-xs font-bold text-white">{(ensembleConfidence * 100).toFixed(1)}%</span>
        </div>
        {hasDL && (
          <div className="p-3 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/[0.12]">
            <p className="text-[9px] font-mono text-cyan-500/60 uppercase mb-1">DL Score</p>
            <span className="text-xs font-bold text-cyan-400">{dlScore.toFixed(0)}/100</span>
          </div>
        )}
        {hasAletheia && (
          <div className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/[0.12]">
            <p className="text-[9px] font-mono text-amber-500/60 uppercase mb-1">Aletheia</p>
            <span className="text-xs font-bold text-amber-400">{aletheiaTriggered} triggered</span>
          </div>
        )}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[9px] font-mono text-neutral-600 uppercase mb-1">Detectors</p>
          <span className="text-xs font-bold text-white">{detectorsTriggered}/{detectorsTotal}</span>
        </div>
      </div>

      {/* Summary */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Info size={12} className="text-neutral-600" />
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">AI Summary</span>
        </div>
        <p className="text-sm text-neutral-300 leading-relaxed p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          {result.summary}
        </p>
      </div>

      {/* Reasons */}
      {result.reasons?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Layers size={12} className="text-neutral-600" />
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              {result.reasons.length} Anomalies
            </span>
          </div>
          <div className="space-y-1.5">
            {result.reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span className="text-[11px] text-neutral-400 leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Findings Toggle */}
      <button
        onClick={() => setExpandedFindings(!expandedFindings)}
        className="flex items-center gap-2 text-[10px] font-mono text-neutral-600 hover:text-neutral-400 transition-colors uppercase tracking-widest"
      >
        {expandedFindings ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Raw Detection Data
      </button>
      {expandedFindings && (
        <pre className="text-[10px] font-mono text-neutral-600 bg-black/40 rounded-xl p-4 overflow-x-auto border border-white/[0.04] max-h-64 overflow-y-auto shadow-inner">
          {JSON.stringify(parsedFindings, null, 2)}
        </pre>
      )}
    </div>
  );
}

const severityBannerStyles: Record<Severity, string> = {
  Safe: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Low: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  High: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Critical: 'bg-red-600/15 text-red-400 border-red-500/30',
};
