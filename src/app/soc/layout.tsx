import SocClientNav from '@/components/soc/soc-nav';

export const metadata = {
  title: 'SENTINEL PRIME — SOC Dashboard',
  description: 'Steganography Detection & Threat Intelligence Platform',
};

export default function SOCLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Ambient gradient mesh background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.02] rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-purple-500/[0.02] rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
      </div>

      {/* Staggered slide-out nav (fixed overlay, always rendered) */}
      <SocClientNav />

      {/* Main content — below the 56px fixed header */}
      <main className="relative z-10 min-h-screen pt-14">
        {children}
      </main>
    </div>
  );
}
