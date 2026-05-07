/**
 * Aletheia Steganalysis Client
 *
 * Bridges the Next.js backend to the Aletheia Python steganalysis toolkit
 * via a subprocess wrapper. Operates server-side only (API routes / scan-service).
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execFilePromise = promisify(execFile);

export interface AletheiaDetectorResult {
  positive?: boolean;
  confidence?: number;
  description?: string;
  error?: string;
  raw?: string;
}

export interface AletheiaResult {
  spa?: AletheiaDetectorResult;
  rs_analysis?: AletheiaDetectorResult;
  chi_square?: AletheiaDetectorResult;
  primary_quantization?: AletheiaDetectorResult;
  error?: string;
}

const ALETIMEOUT_MS = parseInt(process.env.ALE_TIMEOUT_MS || '8000', 10);

/**
 * Write an ArrayBuffer image to a temporary file, run Aletheia analysis,
 * and return structured detector results. Cleans up the temp file afterwards.
 * Returns `null` on failure so the caller can fall back to statistical-only.
 */
export async function analyzeWithAletheia(
  imageBuffer: ArrayBuffer,
  mimeType: string = 'image/png'
): Promise<AletheiaResult | null> {
  const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? '.jpg' : '.png';
  const tempFile = path.join(os.tmpdir(), `invisify-aletheia-${Date.now()}${ext}`);

  try {
    fs.writeFileSync(tempFile, Buffer.from(imageBuffer));

    const wrapperPath = path.join(process.cwd(), 'aletheia-wrapper.py');
    if (!fs.existsSync(wrapperPath)) {
      console.warn('[Aletheia] Wrapper script not found:', wrapperPath);
      return null;
    }

    const { stdout, stderr } = await execFilePromise(
      'python',
      [wrapperPath, tempFile],
      { timeout: ALETIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }
    );

    if (stderr) {
      console.warn('[Aletheia] stderr:', stderr.substring(0, 500));
    }

    const result: AletheiaResult = JSON.parse(stdout);
    return result;
  } catch (err: any) {
    console.warn('[Aletheia] Subprocess failed:', err.message);
    return null;
  } finally {
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch {
      // ignore cleanup errors
    }
  }
}

/**
 * Convert raw Aletheia results into an Invisify2-style detection score (0-100).
 */
export function aletheiaToScore(result: AletheiaResult): {
  score: number;
  reasons: string[];
  details: string[];
} {
  let score = 0;
  const reasons: string[] = [];
  const details: string[] = [];

  const detectors: Array<{
    key: keyof AletheiaResult;
    weight: number;
    label: string;
  }> = [
    { key: 'chi_square', weight: 30, label: 'Chi-Square test detected steganography' },
    { key: 'spa', weight: 25, label: 'SPA detected steganography' },
    { key: 'rs_analysis', weight: 20, label: 'RS Analysis detected steganography' },
    { key: 'primary_quantization', weight: 15, label: 'Primary Quantization detected steganography' },
  ];

  for (const { key, weight, label } of detectors) {
    const det = result[key] as AletheiaDetectorResult | undefined;
    if (det && !det.error && det.positive) {
      score += weight;
      reasons.push(`${key}_aletheia_positive`);
      details.push(
        `${label}: ${Math.round((det.confidence || 0) * 100)}% confidence`
      );
    }
  }

  // Correlation bonus when multiple detectors agree
  if (reasons.length > 1) {
    score = Math.min(100, Math.round(score * 1.15));
  }

  return { score: Math.min(100, score), reasons, details };
}
