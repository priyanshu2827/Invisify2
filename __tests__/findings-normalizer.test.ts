import { normalizeFindings } from '../src/lib/findings-normalizer';

describe('findings normalizer', () => {
  test('normalizes modern detection-engine findings shape', () => {
    const findings = {
      text: {
        zero_width: { present: true },
        homoglyphs: { present: true, snow: { detected: true } },
        emoji_threats: { suspicious: true },
      },
      semantic_ai: { isSuspicious: true },
      link_analysis: { detected: true },
    };

    const normalized = normalizeFindings(findings);
    expect(normalized.zeroWidth).toBe(true);
    expect(normalized.homoglyph).toBe(true);
    expect(normalized.snow).toBe(true);
    expect(normalized.emojiStego).toBe(true);
    expect(normalized.aiSemantic).toBe(true);
    expect(normalized.linkPhishing).toBe(true);
  });

  test('normalizes legacy/dummy findings shape compatibility', () => {
    const findings = {
      text: {
        zero_width: { found: true },
      },
      image: {
        chi_square: { suspicious: true },
        spa: { suspicious: true },
        stegoveritas_analysis: {
          trailingDataDetected: true,
        },
      },
    };

    const normalized = normalizeFindings(JSON.stringify(findings));
    expect(normalized.zeroWidth).toBe(true);
    expect(normalized.imageLsb).toBe(true);
    expect(normalized.imageStructural).toBe(true);
  });
});
