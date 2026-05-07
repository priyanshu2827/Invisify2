import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type SIFTSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SIFTRiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface SIFTFinding {
  id: string;
  type: string;
  confidence: number;
  location: string;
  details: Record<string, unknown>;
  severity: SIFTSeverity;
}

export interface SIFTAnalysisResult {
  timestamp: string;
  imagePath: string;
  findings: SIFTFinding[];
  overallRisk: number;
  riskLevel: SIFTRiskLevel;
  summary: string;
}

/**
 * Thin adapter around SIFT CLI for optional forensic workflows.
 * This is intentionally isolated so the core app stays operational when SIFT is unavailable.
 */
export class SIFTAdapter {
  private readonly siftPath: string;
  private readonly tempDir: string;

  constructor(siftPath = '/opt/sift/cli/bin/sift') {
    this.siftPath = siftPath;
    this.tempDir = path.join(process.cwd(), 'temp', 'forensic-analysis');

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async analyzeDiskImage(imagePath: string): Promise<SIFTAnalysisResult> {
    const commands = [
      `${this.siftPath} stego detect --image "${imagePath}" --type jpg`,
      `${this.siftPath} stego detect --image "${imagePath}" --type png`,
      `${this.siftPath} stego meta --image "${imagePath}"`,
      `${this.siftPath} strings --encoding utf8 "${imagePath}"`,
    ];

    const results: unknown[] = [];
    for (const command of commands) {
      try {
        const { stdout } = await execAsync(command, { timeout: 60_000 });
        const parsed = this.safeJson(stdout);
        if (parsed) results.push(parsed);
      } catch {
        // Non-fatal: one failed module should not stop the rest.
      }
    }

    return this.processSIFTResults(results, imagePath);
  }

  async extractAndAnalyze(imagePath: string): Promise<SIFTAnalysisResult> {
    const extractDir = path.join(this.tempDir, `extracted_${Date.now()}`);

    try {
      const extractCmd = `${this.siftPath} extract --image "${imagePath}" --output "${extractDir}"`;
      await execAsync(extractCmd, { timeout: 300_000 });

      const analysisCmd = `${this.siftPath} stego batch --directory "${extractDir}"`;
      const { stdout } = await execAsync(analysisCmd, { timeout: 300_000 });
      const parsed = this.safeJson(stdout);

      if (!parsed) {
        return this.processSIFTResults([], imagePath);
      }
      return this.processSIFTResults([parsed], imagePath);
    } finally {
      setTimeout(() => {
        try {
          fs.rmSync(extractDir, { recursive: true, force: true });
        } catch {
          // Best-effort cleanup.
        }
      }, 10_000);
    }
  }

  private processSIFTResults(rawResults: unknown[], imagePath: string): SIFTAnalysisResult {
    const findings: SIFTFinding[] = [];
    let overallRisk = 0;

    rawResults.forEach((result, idx) => {
      const detections = this.getDetections(result);
      detections.forEach((detection) => {
        const confidence = this.toNumber(detection.confidence);
        findings.push({
          id: `${idx}_${String(detection.type ?? 'unknown')}`,
          type: String(detection.type ?? 'unknown'),
          confidence,
          location: String(detection.file ?? imagePath),
          details: (detection.details as Record<string, unknown>) ?? {},
          severity: this.calculateSeverity(confidence),
        });
        overallRisk = Math.max(overallRisk, confidence);
      });
    });

    const boundedRisk = Math.max(0, Math.min(100, overallRisk));
    return {
      timestamp: new Date().toISOString(),
      imagePath,
      findings,
      overallRisk: boundedRisk,
      riskLevel: this.mapRiskToLevel(boundedRisk),
      summary: this.generateSummary(findings),
    };
  }

  private getDetections(result: unknown): Array<Record<string, unknown>> {
    if (!result || typeof result !== 'object') return [];
    const maybe = (result as { detections?: unknown }).detections;
    if (!Array.isArray(maybe)) return [];
    return maybe.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object');
  }

  private calculateSeverity(confidence: number): SIFTSeverity {
    if (confidence >= 85) return 'critical';
    if (confidence >= 60) return 'high';
    if (confidence >= 30) return 'medium';
    return 'low';
  }

  private mapRiskToLevel(risk: number): SIFTRiskLevel {
    if (risk >= 85) return 'critical';
    if (risk >= 60) return 'high';
    if (risk >= 40) return 'medium';
    if (risk >= 15) return 'low';
    return 'safe';
  }

  private generateSummary(findings: SIFTFinding[]): string {
    const critical = findings.filter((f) => f.severity === 'critical').length;
    const high = findings.filter((f) => f.severity === 'high').length;
    const medium = findings.filter((f) => f.severity === 'medium').length;
    const low = findings.filter((f) => f.severity === 'low').length;
    return `Found ${findings.length} potential artifacts: ${critical} critical, ${high} high, ${medium} medium, ${low} low.`;
  }

  private safeJson(raw: string): unknown | null {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private toNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
}
