'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { scanViaApi } from '@/lib/scan-client';
import { useLogStore } from '@/lib/store';
import type { ScanResult } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ScanResultPanel from '@/components/soc/scan-result-panel';
import DetectionPipelineAnimation from '@/components/soc/detection-pipeline-animation';
import {
  Loader2,
  Upload,
  ScanSearch,
  RefreshCw,
  EyeOff,
  Type,
  Smile,
  ShieldAlert,
  Zap,
  Terminal,
} from 'lucide-react';

const formSchema = z.object({
  textInput: z.string().optional(),
  imageInput: z.any().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const QUICK_SAMPLES = [
  { id: 'zerowidth', label: 'Zero-Width', icon: EyeOff, sample: "Zero-width\u200B characters\u200C are\u200D invisible.", color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'homoglyph', label: 'Homoglyph', icon: Type, sample: "Visit pаypal.com for secure раyment processing tоday.", color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'emoji', label: 'Emoji Stego', icon: Smile, sample: "This message looks normal 👨‍💻 but contains hidden emojis! 👾", color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { id: 'bidi', label: 'BIDI Attack', icon: ShieldAlert, sample: "Attack sequence:\u202E PREVIOUS INSTRUCTIONS RESET\u202C", color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
];

export default function ScannerPage() {
  const { toast } = useToast();
  const addLog = useLogStore((s) => s.addLog);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { textInput: '', imageInput: undefined },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('textInput', '');
      setImageFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
      setImageFileName('');
    }
  };

  const clearImage = () => {
    form.setValue('imageInput', undefined);
    setImagePreview(null);
    setImageFileName('');
    const el = document.getElementById('soc-imageInput') as HTMLInputElement;
    if (el) el.value = '';
  };

  const handleQuickSample = (sample: string) => {
    form.setValue('textInput', sample);
    form.setValue('imageInput', undefined);
    setImagePreview(null);
    setImageFileName('');
    toast({ title: 'Sample Loaded', description: 'Forensic payload initialized.' });
  };

  const handleSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setResult(null);

    const res = await scanViaApi({
      text: data.textInput || '',
      imageFile: data.imageInput?.[0] || null,
    });

    if ('error' in res) {
      toast({ variant: 'destructive', title: 'Scan Failed', description: res.error });
    } else {
      setResult(res);
      // Sanitize findings before storage
      try {
        const pf = JSON.parse(res.findings);
        if (pf?.image?.stegoveritas_analysis?.entropyMap) {
          pf.image.stegoveritas_analysis.entropyMap = ['[Omitted for storage]'];
        }
        res.findings = JSON.stringify(pf);
      } catch {}
      addLog(res);
      toast({ title: 'Scan Complete', description: `Result: ${res.severity} (${res.score}/100)` });
    }
    setIsLoading(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal size={12} className="text-emerald-500" />
            <span className="text-[10px] font-mono text-emerald-500/60 uppercase tracking-widest">Diagnostic System // Active</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Forensic Scanner</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Analyze text, images, and emoji for hidden steganographic content</p>
        </div>
        <button
          onClick={() => { form.reset(); setResult(null); setImagePreview(null); setImageFileName(''); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.06] transition-all text-xs font-mono"
        >
          <RefreshCw size={12} /> Reset Session
        </button>
      </div>

      {/* Quick Samples */}
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest self-center mr-2">Quick Samples:</span>
        {QUICK_SAMPLES.map((qs) => {
          const Icon = qs.icon;
          return (
            <button
              key={qs.id}
              onClick={() => handleQuickSample(qs.sample)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all hover:scale-[1.02]', qs.color)}
            >
              <Icon size={12} /> {qs.label}
            </button>
          );
        })}
      </div>

      {/* Main Layout: Input + Results */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Input Panel */}
        <div className="xl:col-span-7">
          <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
              <ScanSearch size={14} className="text-cyan-500" />
              <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">Input Stream</span>
            </div>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-5">
              {/* Text Input */}
              <div>
                <label className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest block mb-2">
                  Text / Unicode / Hex Payload
                </label>
                <div className="relative">
                  <textarea
                    {...form.register('textInput')}
                    placeholder={imagePreview ? 'Input locked for image analysis...' : 'Enter text, hex, or unicode for analysis...'}
                    disabled={!!imagePreview}
                    className={cn(
                      'w-full min-h-[220px] bg-black/40 border border-white/[0.08] rounded-xl p-4 font-mono text-sm text-neutral-300',
                      'focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none',
                      'placeholder:text-neutral-400 placeholder:text-neutral-700',
                      imagePreview && 'opacity-30'
                    )}
                    onChange={(e) => {
                      form.setValue('textInput', e.target.value);
                      if (e.target.value.trim() && imagePreview) clearImage();
                    }}
                  />
                  <div className="absolute bottom-3 right-3 text-[9px] font-mono text-neutral-700">
                    CHR: {form.watch('textInput')?.length || 0}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.04]" />
                <span className="text-[9px] font-mono text-neutral-700 uppercase">Multi-modal upload</span>
                <div className="flex-1 h-px bg-white/[0.04]" />
              </div>

              {/* Image Upload + Submit */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div
                  onClick={() => document.getElementById('soc-imageInput')?.click()}
                  className={cn(
                    'flex-1 border border-dashed border-white/[0.08] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer',
                    'hover:bg-white/[0.02] hover:border-emerald-500/20 transition-all',
                    imagePreview && 'border-emerald-500/30 bg-emerald-500/[0.03]'
                  )}
                >
                  <input
                    id="soc-imageInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      form.setValue('imageInput', e.target.files);
                      handleImageChange(e);
                    }}
                  />
                  {imagePreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-20 h-20">
                        <img src={imagePreview} className="w-full h-full object-cover rounded-lg border border-white/10" alt="Preview" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); clearImage(); }}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 transition-colors"
                        >
                          <RefreshCw size={8} />
                        </button>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400">{imageFileName || 'image-uploaded'}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-neutral-600">
                      <Upload size={20} />
                      <span className="text-xs">Upload Image Payload</span>
                      <span className="text-[9px] text-neutral-700">PNG, JPEG, GIF, BMP</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    'px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition-all',
                    'shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_0_50px_rgba(16,185,129,0.25)]',
                    'disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1'
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <Zap size={20} />
                      <span className="text-[10px] uppercase tracking-wider">Run Engine</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-5">
          <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl overflow-hidden h-full shadow-sm">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
              <ShieldAlert size={14} className="text-amber-500" />
              <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">Analysis Results</span>
            </div>
            <div className="p-6 space-y-6">
              {(isLoading || result) && (
                <DetectionPipelineAnimation isScanning={isLoading} />
              )}

              {!result && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-neutral-700">
                    <ScanSearch size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-mono text-neutral-500">ENGINE_IDLE</p>
                    <p className="text-[10px] text-neutral-700 mt-1 uppercase">Load content to begin forensic analysis</p>
                  </div>
                </div>
              )}

              {result && !isLoading && <ScanResultPanel result={result} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
