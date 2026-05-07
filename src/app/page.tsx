import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DecryptedText from '@/components/app/decrypted-text';
import { StegoShieldLogo } from '@/components/app/icons';
import { ArrowRight, ShieldCheck, Eye, FileText, Search, Mail, Download, CheckCircle2, Activity, Terminal } from 'lucide-react';
import SpotlightCard from '@/components/app/spotlight-card';
import { BentoGrid } from '@/components/app/bento-grid';
import DashboardPreview from '@/components/app/dashboard-preview';


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F14] text-white selection:bg-emerald-500/30 overflow-hidden font-sans">
      {/* Grid Background with subtle animation */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex flex-col justify-center px-6 pb-20 pt-10">
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center mt-[-8vh]">
          <div className="inline-flex items-center justify-center flex-wrap sm:flex-nowrap gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-8 shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-fade-in text-center">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>Next-Generation Steganography Detection</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-6">
            <DecryptedText
              text="INVISIFY"
              speed={40}
              maxIterations={25}
              animateOn="view"
              sequential={true}
              revealDirection="center"
              className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              encryptedClassName="text-emerald-500 font-mono opacity-50"
            />
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-neutral-400 mb-10 leading-relaxed font-medium px-4 sm:px-0">
            Uncover hidden data with forensic precision. Our advanced engine detects steganography across
            text, images, and binary streams—now including real-time protection with our Email Guard extension.
          </p>

          <div className="flex flex-col w-full sm:w-auto sm:flex-row items-center justify-center gap-4 px-4 sm:px-0">
            <Button asChild size="lg" className="w-full sm:w-auto h-14 px-8 bg-emerald-500 hover:bg-emerald-400 text-black transition-all font-bold rounded-full shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 group">
              <Link href="/soc/scanner">
                Start Forensic Scan <ArrowRight className="ml-2 w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="ghost" className="w-full sm:w-auto h-14 px-8 text-white hover:bg-white/10 border border-white/20 rounded-full font-bold hover:scale-105 transition-all">
              <Link href="/soc">View Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW SECTION (NEW V2 REQUIREMENT) */}
      <section className="relative z-10 px-6 pb-32">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="w-full relative">
            <div className="absolute inset-0 bg-emerald-500/10 blur-[120px] rounded-full" />
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* Bento Features Section */}
      <section className="relative z-10 px-6 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight drop-shadow-md">Powerful Detection Capabilities</h2>
            <p className="text-neutral-400 text-lg">Advanced tools designed for security researchers and forensic analysts.</p>
          </div>

          <BentoGrid className="max-w-7xl mx-auto">
            {/* Main Feature - 2x1 */}
            <SpotlightCard className="md:col-span-2 md:row-span-1 flex flex-col justify-between group p-8 border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="space-y-6">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-300">
                  <Eye size={28} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold mb-3 tracking-tight">Real-time Vision Engine</h3>
                  <p className="text-neutral-400 text-lg leading-relaxed">Scan images for LSB substitution, Chi-Square attacks, and Sample Pair Analysis with instant risk scoring.</p>
                </div>
              </div>
              <div className="mt-10 pt-8 border-t border-white/10 flex items-center justify-between text-sm">
                <span className="text-emerald-400 font-mono tracking-widest uppercase text-xs font-bold">SC-01 // IMAGE_ANALYSIS</span>
                <Link href="/soc/scanner" className="text-white hover:text-emerald-400 font-bold flex items-center gap-2 group-hover:translate-x-2 transition-all">
                  Launch Analyzer <ArrowRight size={16} />
                </Link>
              </div>
            </SpotlightCard>

            {/* Unicode Scanner */}
            <SpotlightCard className="flex flex-col justify-between group p-8 border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="space-y-6">
                <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-300">
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3 tracking-tight">Unicode Sanitizer</h3>
                  <p className="text-neutral-400 leading-relaxed">Detect and remove zero-width characters, BIDI overrides, and homoglyph attacks in text streams.</p>
                </div>
              </div>
              <div className="mt-6 text-[10px] font-mono text-neutral-600 tracking-widest font-bold uppercase">TX-04 // TEXT_FORENSICS</div>
            </SpotlightCard>

            {/* Deep Insight */}
            <SpotlightCard className="md:col-span-2 flex flex-col justify-between group p-8 border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="h-14 w-14 shrink-0 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-300">
                  <Search size={28} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold tracking-tight">Deep Heuristic Scan</h3>
                  <p className="text-neutral-400 text-lg leading-relaxed">Our engine cross-references multiple detection methods to minimize false positives and identify even the most subtle anomalies.</p>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <span className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-neutral-400 uppercase font-bold tracking-widest shadow-sm">LSB</span>
                <span className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-neutral-400 uppercase font-bold tracking-widest shadow-sm">CHI-SQ</span>
                <span className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-neutral-400 uppercase font-bold tracking-widest shadow-sm">BIDI</span>
              </div>
            </SpotlightCard>
          </BentoGrid>
        </div>
      </section>

      {/* Browser Extension Section */}
      <section className="relative z-10 px-6 pb-32">
        <div className="max-w-6xl mx-auto">
          <div>
            <SpotlightCard className="p-0 border-white/10 overflow-hidden bg-[#0A1016] shadow-2xl shadow-emerald-500/5">
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10">
                <div className="md:w-[55%] p-10 md:p-14 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      <Mail size={26} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight">Sentinel Prime: Email Guard</h2>
                      <p className="text-xs font-mono text-emerald-500/80 uppercase tracking-widest mt-1 font-bold">Browser Extension // v0.1.0</p>
                    </div>
                  </div>

                  <p className="text-neutral-400 text-lg leading-relaxed">
                    Extend your forensic capabilities to your inbox. Our browser extension monitors your Gmail stream for hidden payloads,
                    protecting you from sophisticated steganographic phishing and data leaks in real-time.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-2">
                    <div className="flex items-center gap-3 text-xs font-mono text-neutral-300 uppercase tracking-wide font-bold">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Real-time Gmail Scan</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-neutral-300 uppercase tracking-wide font-bold">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Payload Extraction</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-neutral-300 uppercase tracking-wide font-bold">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Visual Warnings</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-neutral-300 uppercase tracking-wide font-bold">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Auto-Sanitization</span>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Button asChild className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-black h-14 px-8 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] transition-all hover:scale-105 active:scale-95 group text-sm uppercase tracking-wide">
                      <a href="/api/download-extension" download="sentinel-prime-extension.zip" className="flex items-center justify-center">
                        <Download size={18} className="mr-3 shrink-0 group-hover:-translate-y-1 transition-transform" /> Download Extension
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="md:w-[45%] p-10 md:p-14 bg-black/60 space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
                  
                  <div className="flex items-center gap-3 mb-2">
                    <Terminal size={18} className="text-neutral-500" />
                    <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-neutral-400">Installation Node</h3>
                  </div>
                  
                  <div className="space-y-6">
                    {[
                      "Download and extract the extension module.",
                      "Navigate to chrome://extensions in your browser.",
                      "Activate 'Developer Mode' (top-right toggle).",
                      "Execute 'Load Unpacked' and select the directory."
                    ].map((step, i) => (
                      <div key={i} className="flex gap-4 items-start group">
                        <div className="shrink-0 w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-emerald-500 font-bold group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-colors">
                          0{i + 1}
                        </div>
                        <p className="text-sm text-neutral-400 font-mono leading-relaxed group-hover:text-white transition-colors uppercase tracking-tight">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-8 mt-8 border-t border-white/10">
                    <div className="flex items-center gap-3 text-[11px] font-mono font-bold text-emerald-400/80 bg-emerald-500/10 w-max px-4 py-2 rounded-lg border border-emerald-500/20">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                      SYSTEM_READY // SEC_PROTO_MAIL
                    </div>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* Footer-like section */}
      <footer className="relative z-10 border-t border-white/10 bg-[#06090E] py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <StegoShieldLogo className="w-8 h-8 text-emerald-500" />
            <span className="font-black tracking-tighter text-2xl">INVISIFY</span>
          </div>
          <div className="text-neutral-500 text-sm font-medium">
            © 2026 Invisify Security. Forensic-grade steganography detection.
          </div>
        </div>
      </footer>
    </div>
  );
}
