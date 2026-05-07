'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ScanResult } from './types';

const MAX_LOGS = 250;
const MAX_FINDINGS_CHARS = 50_000;

type LogStore = {
  logs: ScanResult[];
  addLog: (log: ScanResult) => void;
  clearLogs: () => void;
  updateLog: (logId: string, updates: Partial<ScanResult>) => void;
};

function compactFindings(findings: string): string {
  try {
    const parsed = JSON.parse(findings);
    if (parsed?.image?.stegoveritas_analysis?.entropyMap) {
      parsed.image.stegoveritas_analysis.entropyMap = ['[Omitted for storage optimization]'];
    }
    const serialized = JSON.stringify(parsed);
    if (serialized.length > MAX_FINDINGS_CHARS) {
      return serialized.slice(0, MAX_FINDINGS_CHARS);
    }
    return serialized;
  } catch {
    return findings.length > MAX_FINDINGS_CHARS
      ? findings.slice(0, MAX_FINDINGS_CHARS)
      : findings;
  }
}

export const useLogStore = create<LogStore>()(
  persist(
    (set, get) => ({
      logs: [],
      addLog: (log) =>
        set((state) => {
          const normalized: ScanResult = {
            ...log,
            findings: compactFindings(log.findings),
          };
          const deduped = state.logs.filter((entry) => entry.id !== normalized.id);
          return { logs: [normalized, ...deduped].slice(0, MAX_LOGS) };
        }),
      clearLogs: () => set({ logs: [] }),
      updateLog: (logId, updates) =>
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === logId ? { ...log, ...updates } : log
          ),
        })),
    }),
    {
      name: 'invisify-logs',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
