'use client';

import { useEffect, useState } from 'react';
import ExtensionEventsTable from '@/components/soc/extension-events';
import type { ExtensionEvent } from '@/lib/soc-types';
import { Chrome, Wifi, Shield, ShieldCheck, ShieldX, Database, Download } from 'lucide-react';

export default function ExtensionPage() {
  const [events, setEvents] = useState<ExtensionEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      try {
        const res = await fetch('/api/extension-events?limit=200', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch extension events');
        const data = await res.json();
        if (!cancelled) {
          setEvents(Array.isArray(data.events) ? data.events : []);
          setIsConnected(true);
        }
      } catch {
        if (!cancelled) setIsConnected(false);
      }
    };

    loadEvents();
    const id = setInterval(loadEvents, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const blockedCount = events.filter((event) => event.action === 'blocked').length;
  const warnedCount = events.filter((event) => event.action === 'warned').length;
  const allowedCount = events.filter((event) => event.action === 'allowed').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Chrome size={12} className="text-cyan-500" />
            <span className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-widest">Extension Interface</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Extension Monitor</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Gmail scanning events and browser extension status</p>
        </div>

        <a
          href="/api/download-extension"
          download="sentinel-prime-extension.zip"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all text-xs font-mono font-bold shadow-sm"
        >
          <Download size={14} className="animate-pulse" />
          Download Extension ZIP
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.03] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Wifi size={14} className="text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-neutral-600 uppercase">Status</span>
          </div>
          <p className="text-lg font-bold text-emerald-400">{isConnected ? 'Connected' : 'Disconnected'}</p>
          <p className="text-[10px] text-neutral-600 font-mono mt-0.5">/api/extension-events</p>
        </div>
        <div className="rounded-2xl border border-rose-500/10 bg-rose-500/[0.03] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShieldX size={14} className="text-rose-400" />
            <span className="text-[10px] font-mono text-neutral-600 uppercase">Blocked</span>
          </div>
          <p className="text-3xl font-bold text-rose-400">{blockedCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.03] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-amber-400" />
            <span className="text-[10px] font-mono text-neutral-600 uppercase">Warned</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{warnedCount}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={14} className="text-neutral-500" />
            <span className="text-[10px] font-mono text-neutral-600 uppercase">Allowed</span>
          </div>
          <p className="text-3xl font-bold text-white">{allowedCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117]/80 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] font-mono text-neutral-600 uppercase mb-1">Extension Version</p>
            <p className="text-sm font-bold text-white">Manifest V3</p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-neutral-600 uppercase mb-1">SHA-256 Cache</p>
            <div className="flex items-center gap-2">
              <Database size={12} className="text-cyan-500" />
              <p className="text-sm font-bold text-white">{events.length} fingerprints</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-mono text-neutral-600 uppercase mb-1">Detection Mode</p>
            <p className="text-sm font-bold text-white">API + Local Fallback</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117]/80 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Chrome size={14} className="text-cyan-500" />
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">Gmail Scan Events</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-600">{events.length} events</span>
        </div>
        <ExtensionEventsTable events={events} />
      </div>
    </div>
  );
}
