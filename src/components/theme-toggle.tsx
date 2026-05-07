'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn('w-8 h-8', className)} />;
  }

  const modes = [
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'system', icon: Monitor, label: 'System' },
  ] as const;

  return (
    <div className={cn('flex items-center gap-0.5 rounded-full p-0.5 bg-white/[0.04] dark:bg-white/[0.04] border border-white/[0.06] dark:border-white/[0.06]', className)}>
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={cn(
            'relative flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200',
            theme === value
              ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04]'
          )}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}
