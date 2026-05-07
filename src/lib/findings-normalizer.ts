type FindingsInput = string | Record<string, any> | null | undefined;

export interface NormalizedFindings {
  zeroWidth: boolean;
  homoglyph: boolean;
  bidi: boolean;
  snow: boolean;
  promptInjection: boolean;
  emojiStego: boolean;
  imageLsb: boolean;
  imageStructural: boolean;
  aiSemantic: boolean;
  linkPhishing: boolean;
}

export function parseFindings(findings: FindingsInput): Record<string, any> {
  if (!findings) return {};
  if (typeof findings === 'string') {
    try {
      return JSON.parse(findings);
    } catch {
      return {};
    }
  }
  return findings;
}

export function normalizeFindings(findings: FindingsInput): NormalizedFindings {
  const f = parseFindings(findings);
  const text = f.text || {};
  const image = f.image || {};
  const reasons = Array.isArray(f.reasons) ? f.reasons : [];

  const zeroWidth = !!(text.zero_width?.present || text.zero_width?.found);
  const homoglyph = !!text.homoglyphs?.present;
  const bidi = !!(text.zero_width?.bidiAnomalies?.present || text.bidi?.found);
  const snow = !!(text.homoglyphs?.snow?.detected || text.snow?.found);
  const promptInjection = !!(
    text.prompt_injection?.detected ||
    reasons.some((r: string) => String(r).toLowerCase().includes('prompt'))
  );
  const emojiStego = !!(
    text.emoji_threats?.suspicious ||
    f.emoji?.threats?.nibble_stego?.detected ||
    f.emoji?.threats?.encoding_pattern?.detected ||
    f.emoji?.threats?.zwj_abuse?.detected
  );
  const imageLsb = !!(
    image.stego_analysis?.suspicious ||
    image.stego_analysis?.chiSquareProbability > 0.95 ||
    image.chi_square?.suspicious ||
    image.spa?.suspicious
  );
  const imageStructural = !!(
    image.stegoveritas_analysis?.trailingDataDetected ||
    image.stegoveritas_analysis?.metadataAnomalies?.length ||
    image.stegoveritas_analysis?.shadowChunks?.detected ||
    image.stegoveritas_analysis?.channelInconsistency?.detected ||
    image.stegoveritas_analysis?.bitPlaneAnomaly
  );
  const aiSemantic = !!f.semantic_ai?.isSuspicious;
  const linkPhishing = !!f.link_analysis?.detected;

  return {
    zeroWidth,
    homoglyph,
    bidi,
    snow,
    promptInjection,
    emojiStego,
    imageLsb,
    imageStructural,
    aiSemantic,
    linkPhishing,
  };
}
