import type { ContentType, ScanResult, Severity } from './types';
import type { ActivityEvent, ActivityEventType } from './soc-types';
import { normalizeFindings } from './findings-normalizer';

export function getDetectionTypeDistribution(scans: ScanResult[]) {
  const counts = {
    'Zero-Width': 0,
    Homoglyph: 0,
    'Emoji Stego': 0,
    'Image LSB': 0,
    'BIDI Attack': 0,
    'AI Semantic': 0,
    SNOW: 0,
    'Prompt Injection': 0,
  };

  scans.forEach((scan) => {
    const n = normalizeFindings(scan.findings);
    if (n.zeroWidth) counts['Zero-Width']++;
    if (n.homoglyph || n.linkPhishing) counts.Homoglyph++;
    if (n.emojiStego) counts['Emoji Stego']++;
    if (n.imageLsb || n.imageStructural) counts['Image LSB']++;
    if (n.bidi) counts['BIDI Attack']++;
    if (n.aiSemantic) counts['AI Semantic']++;
    if (n.snow) counts.SNOW++;
    if (n.promptInjection) counts['Prompt Injection']++;
  });

  return Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
}

export function getSeverityDistribution(scans: ScanResult[]) {
  const counts: Record<Severity, number> = {
    Safe: 0,
    Low: 0,
    Medium: 0,
    High: 0,
    Critical: 0,
  };
  scans.forEach((scan) => {
    counts[scan.severity]++;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export function getTimelineData(scans: ScanResult[]) {
  return [...scans]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((scan) => ({
      time: new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      score: scan.score,
      severity: scan.severity,
    }));
}

export function getContentTypeDistribution(scans: ScanResult[]) {
  const counts: Record<ContentType, number> = { Text: 0, Image: 0, Emoji: 0 };
  scans.forEach((scan) => {
    counts[scan.content_type]++;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function inferActivityType(scan: ScanResult): ActivityEventType {
  const n = normalizeFindings(scan.findings);
  if (n.promptInjection) return 'prompt_injection';
  if (n.zeroWidth) return 'zero_width';
  if (n.bidi) return 'bidi';
  if (n.homoglyph || n.linkPhishing) return 'homoglyph';
  if (n.emojiStego) return 'emoji_stego';
  if (n.imageLsb || n.imageStructural) return 'image_lsb';
  if (n.aiSemantic) return 'ai_semantic';
  return 'safe';
}

export function deriveActivityEvents(scans: ScanResult[], maxEvents = 20): ActivityEvent[] {
  return [...scans]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, maxEvents)
    .map((scan) => ({
      id: `evt-${scan.id}`,
      timestamp: scan.timestamp,
      type: inferActivityType(scan),
      severity: scan.severity,
      message: scan.reasons?.[0] || scan.summary || `${scan.content_type} scan completed`,
      source: 'scanner',
    }));
}
