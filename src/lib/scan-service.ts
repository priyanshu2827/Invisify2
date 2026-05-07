import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { DetectionEngine } from './detection-engine';
import { generateLocalSummary } from './scan-summary';
import type { ScanApiResponse, Severity } from './types';
import * as unicode from './unicode';
import { analyzeWithDeepLearning, type DLAnalyzeResponse } from './dl-client';
import { analyzeWithAletheia, type AletheiaResult } from './aletheia-client';

export const MAX_TEXT_LENGTH = 50_000;
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1600;
export const MAX_IMAGE_PIXELS = 1_500_000;
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'];

export type ScanServiceInput = {
  text?: string;
  imageBuffer?: ArrayBuffer | null;
  mimeType?: string;
};

export type UnifiedScanResult = ScanApiResponse;

function normalizeText(text?: string): string {
  if (!text) return '';
  const trimmed = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
  return trimmed.replace(/\\u([0-9a-fA-F]{4})/g, (_match, grp) => String.fromCharCode(parseInt(grp, 16)));
}

export async function decodeImagePixels(
  imageBuffer: ArrayBuffer,
): Promise<Uint8Array> {
  const source = Buffer.from(imageBuffer);
  const meta = await sharp(source, { failOn: 'none' }).metadata();
  let pipeline = sharp(source, { failOn: 'none' }).rotate();

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    pipeline = pipeline.resize({
      width: MAX_IMAGE_DIMENSION,
      height: MAX_IMAGE_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const { data } = await pipeline
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return data;
}

export async function performScan(input: ScanServiceInput): Promise<UnifiedScanResult> {
  const text = normalizeText(input.text);
  const imageBuffer = input.imageBuffer ?? null;
  const mimeType = input.mimeType || 'text/plain';

  if (!text && !imageBuffer) {
    throw new Error('No content provided');
  }

  const linkAnalysis = unicode.detect_homoglyph_links(text);

  let imagePixels: Uint8Array | null = null;
  let dlResults: DLAnalyzeResponse | null = null;
  let aletheiaResults: AletheiaResult | null = null;
  if (imageBuffer) {
    // Run image decoding and external analyses all in parallel
    const [pixelsRes, dlRes, aleRes] = await Promise.allSettled([
      decodeImagePixels(imageBuffer),
      analyzeWithDeepLearning(imageBuffer, mimeType, false),
      analyzeWithAletheia(imageBuffer, mimeType),
    ]);

    if (pixelsRes.status === 'fulfilled') imagePixels = pixelsRes.value;
    if (dlRes.status === 'fulfilled') dlResults = dlRes.value;
    if (aleRes.status === 'fulfilled') aletheiaResults = aleRes.value;
  }

  const detection = await DetectionEngine.analyze(
    text,
    imageBuffer,
    imagePixels,
    mimeType,
    dlResults
      ? {
          score: dlResults.score,
          confidence: dlResults.confidence,
          model_loaded: dlResults.model_loaded,
          is_stego: dlResults.is_stego,
        }
      : null,
    aletheiaResults
  );

  let severity = detection.severity as Severity;
  if (linkAnalysis.detected && (severity === 'Safe' || severity === 'Low')) {
    severity = 'Medium';
  }

  const findings = {
    ...detection.findings,
    link_analysis: linkAnalysis,
  };

  const reasons = [
    ...detection.reasons,
    ...(linkAnalysis.detected ? ['homoglyph_links_detected'] : []),
  ];

  const summary = generateLocalSummary({
    findings: JSON.stringify(findings),
    type: detection.type,
    severity,
  });

  const timestamp = new Date().toISOString();
  const result: UnifiedScanResult = {
    id: randomUUID(),
    timestamp,
    type: detection.type,
    content_type: detection.type,
    severity,
    score: detection.score,
    confidence: detection.confidence,
    summary,
    findings: JSON.stringify(findings),
    reasons: Array.from(new Set(reasons)),
  };

  return result;
}
