import type { ContentType, Severity } from './types';

export function generateLocalSummary(input: {
  findings: string;
  type: ContentType | string;
  severity: Severity | string;
}): string {
  try {
    const findings = JSON.parse(input.findings);
    const parts: string[] = [];
    const contentType = String(input.type).toLowerCase();

    if (input.severity === 'Safe') {
      return `No steganographic threats were detected in this ${contentType} content. Statistical and structural checks look normal.`;
    }

    if (findings.text) {
      if (findings.text.zero_width?.present) {
        const count = findings.text.zero_width.chars?.length ?? 0;
        parts.push(`Zero-width control characters detected (${count}).`);
        if (findings.text.zero_width.verifiedPayload) {
          parts.push(`Verified hidden payload extracted.`);
        }
      }
      if (findings.text.homoglyphs?.present) {
        const total = findings.text.homoglyphs?.detailed?.totalCount ?? findings.text.homoglyphs?.samples?.length ?? 0;
        parts.push(`Homoglyph spoofing indicators detected (${total} confusable characters).`);
      }
      if (findings.text.emoji_threats?.suspicious) {
        parts.push(`Emoji steganography indicators were detected.`);
      }
      if (findings.text.homoglyphs?.entropy?.suspicious) {
        parts.push(`Character entropy suggests encoded or obfuscated payloads.`);
      }
    }

    if (findings.image) {
      if (findings.image.stego_analysis?.chiSquareProbability > 0.95) {
        parts.push(`Image LSB chi-square test is elevated.`);
      }
      if (findings.image.stegoveritas_analysis?.trailingDataDetected) {
        const trailing = findings.image.stegoveritas_analysis.trailingDataSize ?? 0;
        parts.push(`Trailing data found after image EOF marker (${trailing} bytes).`);
      }
      if (findings.image.stegoveritas_analysis?.metadataAnomalies?.length) {
        parts.push(`Known stego-tool metadata markers were found.`);
      }
      if (findings.image.stegoveritas_analysis?.shadowChunks?.detected) {
        parts.push(`Non-standard PNG chunks detected.`);
      }
    }

    if (findings.ensemble_confidence != null) {
      const conf = Number(findings.ensemble_confidence) * 100;
      parts.push(`Model confidence is ${conf.toFixed(1)}%.`);
    }

    if (parts.length === 0) {
      return `${input.severity} risk level detected in ${contentType} content. Review findings for detector-level details.`;
    }

    return parts.join(' ');
  } catch {
    return `${input.severity} risk level detected. Detailed findings are available in the scan report.`;
  }
}
