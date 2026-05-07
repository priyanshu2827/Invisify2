'use client';

import { Brain, EyeOff, Type, Smile, Image as ImageIcon, ShieldAlert, Zap, Shield, Target, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

const DETECTION_METHODS = [
  {
    title: 'Zero-Width Character Detection',
    icon: EyeOff,
    color: 'emerald',
    tier: 'Tier 1 — Deterministic',
    accuracy: 'Very High',
    description: 'Detects invisible Unicode characters: ZWSP (U+200B), ZWNJ (U+200C), ZWJ (U+200D), BOM (U+FEFF), LRM/RLM, Mongolian Vowel Separator. Includes BIDI override detection.',
    techniques: ['Character-set matching', 'Binary mode decode (ZWSP→0, BOM→1)', 'ZWSP-Tool base-7 decode', 'BIDI control detection'],
    indicators: ['Hidden characters count', 'Decoded payload content', 'BIDI character positions'],
  },
  {
    title: 'Homoglyph Phishing Detection',
    icon: Type,
    color: 'amber',
    tier: 'Tier 1 — Deterministic',
    accuracy: 'High',
    description: '80+ confusable character mappings across Cyrillic, Greek, Armenian, Hebrew scripts. TR39 skeletal mapping converts all confusables to ASCII for comparison.',
    techniques: ['NFKC normalization', 'Multi-script confusable mapping', 'TR39 skeletal analysis', 'Shannon entropy (threshold >5.5 bits/char)'],
    indicators: ['Script mixing ratio', 'Confusable character count', 'Entropy anomaly score'],
  },
  {
    title: 'Emoji Steganography Analysis',
    icon: Smile,
    color: 'purple',
    tier: 'Tier 2 — Statistical',
    accuracy: 'Medium-High',
    description: 'Detects nibble encoding (power-of-2 unique emoji count), EmojiEncode 7-bit mapping, ZWJ sequence manipulation, and variation selector binary channels.',
    techniques: ['Nibble steganalysis (2^n detection)', 'Distribution variance analysis', 'ZWJ density profiling', 'Variation selector binary decode', 'EmojiEncode brute-force'],
    indicators: ['Unique emoji count (power of 2)', 'Distribution variance σ²', 'ZWJ density per grapheme', 'Decoded payload'],
  },
  {
    title: 'Image LSB Steganalysis',
    icon: ImageIcon,
    color: 'blue',
    tier: 'Tier 2 — Statistical',
    accuracy: 'Medium',
    description: 'Ensemble of statistical tests targeting Least Significant Bit embedding in spatial domain images.',
    techniques: [
      'Chi-Square Attack — Pair-of-Values frequency analysis',
      'Sample Pair Analysis — Quadratic embedding rate estimation',
      'RS Analysis — Regular/Singular group classification',
      'Bit-cycle autocorrelation (lag 1-32)',
      'Block-wise LSB variance (noise fingerprint)',
    ],
    indicators: ['Chi-square p-value (>0.95 = LSB)', 'SPA embedding rate %', 'RS regular/singular ratio', 'Autocorrelation peaks'],
  },
  {
    title: 'Structural Image Analysis',
    icon: Shield,
    color: 'cyan',
    tier: 'Tier 2 — Structural',
    accuracy: 'High',
    description: 'Analyzes image file structure for non-content anomalies: trailing data, tool signatures, shadow chunks, entropy maps, filter patterns.',
    techniques: ['EOF marker detection (PNG IEND, JPEG EOI)', 'Tool signature regex (StegHide, OutGuess, JPHIDE, F5)', 'Non-standard PNG chunk detection', '1KB-block entropy profiling', 'RGB channel LSB entropy comparison'],
    indicators: ['Trailing data size (bytes after EOF)', 'Tool signatures found', 'Channel entropy deviation'],
  },
  {
    title: 'AI Semantic Analysis',
    icon: Brain,
    color: 'pink',
    tier: 'Tier 3 — Deep',
    accuracy: 'Low-Medium',
    description: 'Google Gemini 1.5 Flash via Genkit performs semantic perplexity scoring to identify machine-generated stegotext (cover text designed to hide data).',
    techniques: ['LLM perplexity scoring', 'Token distribution analysis', 'Semantic anomaly detection', 'Stegotext vs natural text classification'],
    indicators: ['Perplexity score (0-100)', 'Confidence level', 'Suspicious classification', 'AI-generated reason'],
  },
];

const THREAT_TAXONOMY = [
  { category: 'Data Exfiltration', threats: ['Zero-width encoded secrets', 'Emoji-encoded payloads', 'LSB image embedding', 'SNOW whitespace channels'] },
  { category: 'Phishing', threats: ['Homoglyph URL spoofing (gооgle.com)', 'BIDI text direction manipulation', 'Mixed-script domain attacks'] },
  { category: 'LLM Attacks', threats: ['Prompt injection via hidden characters', 'BIDI-obfuscated instructions', 'Zero-width payload in prompts'] },
  { category: 'Covert Communication', threats: ['Stegotext cover messages', 'Emoji variation selector binary', 'Image stego (StegHide, OutGuess)'] },
];

const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  emerald: { bg: 'bg-emerald-500/[0.03]', border: 'border-emerald-500/10', text: 'text-emerald-400', iconBg: 'bg-emerald-500/10' },
  amber: { bg: 'bg-amber-500/[0.03]', border: 'border-amber-500/10', text: 'text-amber-400', iconBg: 'bg-amber-500/10' },
  purple: { bg: 'bg-purple-500/[0.03]', border: 'border-purple-500/10', text: 'text-purple-400', iconBg: 'bg-purple-500/10' },
  blue: { bg: 'bg-blue-500/[0.03]', border: 'border-blue-500/10', text: 'text-blue-400', iconBg: 'bg-blue-500/10' },
  cyan: { bg: 'bg-cyan-500/[0.03]', border: 'border-cyan-500/10', text: 'text-cyan-400', iconBg: 'bg-cyan-500/10' },
  pink: { bg: 'bg-pink-500/[0.03]', border: 'border-pink-500/10', text: 'text-pink-400', iconBg: 'bg-pink-500/10' },
};

export default function IntelligencePage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Brain size={12} className="text-purple-500" />
          <span className="text-[10px] font-mono text-purple-500/60 uppercase tracking-widest">Intelligence Database</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Threat Intelligence</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Detection methods, threat taxonomy, and system capabilities</p>
      </div>

      {/* Cascade Pipeline */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl p-6 shadow-sm">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Zap size={14} className="text-emerald-500" /> 3-Tier Cascade Detection Pipeline
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { tier: 'Tier 1', name: 'Fast Detection', desc: 'Deterministic character-set checks, pattern matching, zero-width scanning', time: '<1ms', color: 'emerald' },
            { tier: 'Tier 2', name: 'Statistical Analysis', desc: 'Shannon entropy, Chi-Square, RS Analysis, SPA, Markov chains', time: '~100ms', color: 'amber' },
            { tier: 'Tier 3', name: 'AI Deep Analysis', desc: 'Google Gemini semantic perplexity scoring, stegotext classification', time: '~1s', color: 'purple' },
          ].map((t, i) => (
            <div key={i} className={cn('rounded-xl border p-4', colorMap[t.color].bg, colorMap[t.color].border)}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('text-[10px] font-mono font-bold uppercase tracking-widest', colorMap[t.color].text)}>{t.tier}</span>
                <span className="text-[9px] font-mono text-neutral-700 ml-auto">{t.time}</span>
              </div>
              <p className="text-sm font-bold text-white mb-1">{t.name}</p>
              <p className="text-[11px] text-neutral-500 leading-relaxed">{t.desc}</p>
              {i < 2 && (
                <div className="hidden md:flex items-center justify-end mt-2">
                  <span className="text-neutral-700">→</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detection Methods */}
      <div>
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Target size={14} className="text-cyan-500" /> Detection Methods
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {DETECTION_METHODS.map((method, i) => {
            const Icon = method.icon;
            const c = colorMap[method.color];
            return (
              <div key={i} className={cn('rounded-2xl border p-5', c.bg, c.border)}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', c.iconBg)}>
                    <Icon size={20} className={c.text} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white">{method.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-mono text-neutral-600 uppercase">{method.tier}</span>
                      <span className="text-[9px] font-mono text-neutral-700">•</span>
                      <span className={cn('text-[9px] font-mono uppercase', c.text)}>Accuracy: {method.accuracy}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed mb-3">{method.description}</p>
                <div className="space-y-2">
                  <p className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">Techniques</p>
                  <div className="flex flex-wrap gap-1">
                    {method.techniques.map((t, j) => (
                      <span key={j} className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04] text-neutral-500">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Threat Taxonomy */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl p-6 shadow-sm">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <ShieldAlert size={14} className="text-rose-500" /> Threat Taxonomy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {THREAT_TAXONOMY.map((cat, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
              <h3 className="text-xs font-bold text-white mb-2">{cat.category}</h3>
              <div className="space-y-1">
                {cat.threats.map((threat, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-rose-500/60" />
                    <span className="text-[11px] text-neutral-500">{threat}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confidence Weights */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl p-6 shadow-sm">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Cpu size={14} className="text-cyan-500" /> Ensemble Confidence Weights
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'Zero-Width', weight: 1.5 },
            { name: 'Homoglyphs', weight: 1.2 },
            { name: 'Emoji', weight: 1.0 },
            { name: 'Image LSB', weight: 1.3 },
            { name: 'Structural', weight: 1.5 },
            { name: 'Semantic AI', weight: 0.9 },
            { name: 'ML Ensemble', weight: 1.4 },
          ].map((w, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-mono text-neutral-600 uppercase mb-1">{w.name}</p>
              <div className="flex items-end gap-1">
                <span className="text-xl font-bold text-white">{w.weight}</span>
                <span className="text-[9px] text-neutral-700 mb-0.5">×</span>
              </div>
              <div className="w-full h-1 rounded-full bg-white/[0.04] mt-2 overflow-hidden">
                <div className="h-full rounded-full bg-cyan-500/40" style={{ width: `${(w.weight / 1.5) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
