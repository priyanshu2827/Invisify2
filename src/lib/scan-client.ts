'use client';

import type { ScanApiResponse } from './types';

export type ScanClientPayload = {
  text?: string;
  imageFile?: File | null;
  timeoutMs?: number;
};

export async function scanViaApi(payload: ScanClientPayload): Promise<ScanApiResponse | { error: string }> {
  const controller = new AbortController();
  const timeoutMs = payload.timeoutMs ?? 60000;
  const startTime = Date.now();
  const timeoutId = setTimeout(() => {
    console.warn(`[scanViaApi] Aborting after ${timeoutMs}ms timeout`);
    controller.abort();
  }, timeoutMs);

  try {
    console.log(`[scanViaApi] Starting scan request (timeout: ${timeoutMs}ms)`);
    let response: Response;

    if (payload.imageFile) {
      const formData = new FormData();
      if (payload.text) formData.append('text', payload.text);
      formData.append('image', payload.imageFile);
      response = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
    } else {
      response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: payload.text ?? '' }),
        signal: controller.signal,
      });
    }

    const elapsed = Date.now() - startTime;
    console.log(`[scanViaApi] Response received after ${elapsed}ms, status: ${response.status}`);

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Scan request failed.' }));
      return { error: err.error || `Scan request failed (${response.status}).` };
    }

    const data = await response.json();
    return data as ScanApiResponse;
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    if (error?.name === 'AbortError') {
      console.error(`[scanViaApi] Timeout after ${elapsed}ms (limit: ${timeoutMs}ms)`);
      return { error: `Scan timed out after ${elapsed}ms. Please try again.` };
    }
    console.error(`[scanViaApi] Network error after ${elapsed}ms:`, error);
    return { error: 'Failed to reach scan service.' };
  } finally {
    clearTimeout(timeoutId);
  }
}
