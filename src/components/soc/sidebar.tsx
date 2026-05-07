'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ScanSearch,
  Brain,
  Bell,
  History,
  Chrome,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useLogStore } from '@/lib/store';


const NAV_ITEMS = [
  { href: '/soc', label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
  { href: '/soc/scanner', label: 'Scan Analyzer', icon: ScanSearch, section: 'main' },
  { href: '/soc/intelligence', label: 'Threat Intel', icon: Brain, section: 'main' },
  { href: '/soc/alerts', label: 'Alerts', icon: Bell, section: 'main', badge: true },
  { href: '/soc/history', label: 'Logs / History', icon: History, section: 'main' },
  { href: '/soc/extension', label: 'Extension Monitor', icon: Chrome, section: 'monitor' },
  { href: '/soc/settings', label: 'Settings', icon: Settings, section: 'system' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const logs = useLogStore((s) => s.logs);
  const alertCount = logs.filter((l) => l.severity === 'High' || l.severity === 'Critical').length;
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/soc') return pathname === '/soc';
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: typeof NAV_ITEMS[0], activeColor: string, activeBg: string) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 group relative',
          active
            ? `${activeBg} ${activeColor}`
            : 'text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]',
          collapsed && 'justify-center px-0'
        )}
      >
        {active && (
          <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full', activeColor.replace('text-', 'bg-'))} />
        )}
        <Icon size={17} className={cn('shrink-0', active ? activeColor : 'text-neutral-600 group-hover:text-neutral-400')} />
        {!collapsed && <span>{item.label}</span>}
        {item.badge && alertCount > 0 && (
          <span className={cn(
            'ml-auto bg-rose-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.3)]',
            collapsed && 'absolute -top-0.5 -right-0.5 ml-0 min-w-[14px] h-[14px] text-[8px]'
          )}>
            {alertCount > 99 ? '99+' : alertCount}
          </span>
        )}
        {collapsed && (
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-neutral-900/95 border border-white/10 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-xl backdrop-blur-sm">
            {item.label}
          </div>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col border-r border-white/[0.06] transition-all duration-300 z-50 shrink-0 relative',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Sidebar background with subtle gradient */}
      <div className="absolute inset-0 bg-[#050810] transition-colors duration-300" />
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] from-emerald-500/[0.01] via-transparent to-purple-500/[0.02] to-purple-500/[0.01]" />

      <div className="relative flex flex-col h-full">
        {/* Logo */}
        <div className={cn('flex items-center gap-3 px-5 h-[72px] border-b border-white/[0.06] shrink-0', collapsed && 'justify-center px-2')}>
          <Link href="/soc" className="flex items-center gap-3 group/logo">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-lg group-hover/logo:scale-105 transition-transform duration-300">
                <Image 
                  src="/logo.png" 
                  alt="Invisify Logo" 
                  width={36} 
                  height={36} 
                  className="object-cover"
                  priority
                />
              </div>
              <div className="absolute -inset-1 bg-emerald-500/20 rounded-xl blur opacity-0 group-hover/logo:opacity-100 transition-opacity" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="text-[14px] font-black text-white tracking-tight leading-none">SENTINEL PRIME</h1>
                <p className="text-[9px] text-emerald-400/60 font-mono tracking-[0.2em] mt-1">INVISIFY SYSTEM</p>
              </div>
            )}
          </Link>
        </div>

        {/* System status bar */}
        {!collapsed && (
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-emerald-400/40 uppercase tracking-[0.2em]">System Online</span>
              <div className="w-8 h-1 rounded-full bg-emerald-500/20 overflow-hidden">
                <div className="w-full h-full bg-emerald-500/40 animate-pulse rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {!collapsed && (
            <p className="px-3 mb-2.5 text-[10px] font-semibold text-neutral-600/80 uppercase tracking-[0.2em]">Operations</p>
          )}
          {NAV_ITEMS.filter((i) => i.section === 'main').map((item) =>
            renderNavItem(item, 'text-emerald-400', 'bg-emerald-500/[0.08]')
          )}

          <div className="my-4 mx-3 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

          {!collapsed && (
            <p className="px-3 mb-2.5 text-[10px] font-semibold text-neutral-600/80 uppercase tracking-[0.2em]">Monitor</p>
          )}
          {NAV_ITEMS.filter((i) => i.section === 'monitor').map((item) =>
            renderNavItem(item, 'text-cyan-400', 'bg-cyan-500/[0.08]')
          )}

          <div className="my-4 mx-3 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

          {!collapsed && (
            <p className="px-3 mb-2.5 text-[10px] font-semibold text-neutral-600/80 uppercase tracking-[0.2em]">System</p>
          )}
          {NAV_ITEMS.filter((i) => i.section === 'system').map((item) =>
            renderNavItem(item, 'text-purple-400', 'bg-purple-500/[0.08]')
          )}
        </nav>

        {/* Bottom panel */}
        <div className="border-t border-white/[0.04] p-3 shrink-0 space-y-2">

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.03] transition-all"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            {!collapsed && <span className="text-[11px] font-mono">Collapse</span>}
          </button>
          {!collapsed && (
            <div className="px-3 flex items-center gap-2">
              <Activity size={9} className="text-neutral-700" />
              <span className="text-[8px] font-mono text-neutral-700 uppercase tracking-[0.15em]">v4.2.0 // Cascade Engine</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
