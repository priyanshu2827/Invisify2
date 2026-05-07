// This file contains a port of the text analysis logic from 
// https://github.com/lorossi/invisify/blob/main/app.py
// and combines it with variation selector logic inspired by
// https://github.com/lewislovelock/UnicodeVariationSelectorTool

const ESC_RE = /\\u([0-9A-Fa-f]{4})|\\U([0-9A-Fa-f]{8})/g;
import { zeroWidth } from './zerowidth';

export function expand_unicode_escapes(s: string): string {
    if (!s) return s;
    return s.replace(ESC_RE, (_, hex4, hex8) => {
        const code = parseInt(hex4 || hex8, 16);
        try {
            return String.fromCodePoint(code);
        } catch {
            return '';
        }
    });
}

export const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

// BIDI Control Characters (Sentinel Prime: Final 10)
export const BIDI_CHARS = new Set([
    '\u202A', '\u202B', '\u202C', '\u202D', '\u202E', // LRE, RLE, PDF, LRO, RLO
    '\u2066', '\u2067', '\u2068', '\u2069'           // LRI, RLI, FSI, PDI
]);

export const ZERO_WIDTH_CHARS = new Set([
    '\u200B', // ZERO WIDTH SPACE
    '\u200C', // ZERO WIDTH NON-JOINER
    '\u200D', // ZERO WIDTH JOINER
    '\uFEFF', // ZERO WIDTH NO-BREAK SPACE
    '\u200E', // LEFT-TO-RIGHT MARK
    '\u200F', // RIGHT-TO-LEFT MARK
    '\u180E', // MONGOLIAN VOWEL SEPARATOR
]);

// Extended invisible characters for deeper stego detection
export const EXTENDED_INVISIBLE_CHARS = new Set([
    '\u00AD',   // SOFT HYPHEN
    '\u034F',   // COMBINING GRAPHEME JOINER
    '\u061C',   // ARABIC LETTER MARK
    '\u115F',   // HANGUL CHOSEONG FILLER
    '\u1160',   // HANGUL JUNGSEONG FILLER
    '\u17B4',   // KHMER VOWEL INHERENT AQ
    '\u17B5',   // KHMER VOWEL INHERENT AA
    '\u2060',   // WORD JOINER
    '\u2061',   // FUNCTION APPLICATION
    '\u2062',   // INVISIBLE TIMES
    '\u2063',   // INVISIBLE SEPARATOR
    '\u2064',   // INVISIBLE PLUS
    '\u206A',   // INHIBIT SYMMETRIC SWAPPING
    '\u206B',   // ACTIVATE SYMMETRIC SWAPPING
    '\u206C',   // INHIBIT ARABIC FORM SHAPING
    '\u206D',   // ACTIVATE ARABIC FORM SHAPING
    '\u206E',   // NATIONAL DIGIT SHAPES
    '\u206F',   // NOMINAL DIGIT SHAPES
]);

// Combined set for detection
export const ALL_INVISIBLE_CHARS = new Set([...ZERO_WIDTH_CHARS, ...EXTENDED_INVISIBLE_CHARS]);

export const ZWSP_TOOL_CHARS = [
    '\u200B', '\u200C', '\u200D', '\u200E', '\u200F', '\u180E', '\ufeff',
];

/**
 * Detect Unicode Tag Characters (U+E0001-U+E007F)
 * Used by advanced stego tools to embed ASCII text invisibly
 */
export function detectTagCharacters(text: string): { detected: boolean; decoded: string; count: number } {
    let decoded = '';
    let count = 0;
    for (const char of text) {
        const cp = char.codePointAt(0) || 0;
        if (cp >= 0xE0001 && cp <= 0xE007F) {
            decoded += String.fromCharCode(cp - 0xE0000);
            count++;
        }
    }
    return { detected: count > 0, decoded, count };
}

export const VARIATION_SELECTORS = new Set([
    '\uFE00', '\uFE01', '\uFE02', '\uFE03', '\uFE04', '\uFE05', '\uFE06', '\uFE07',
    '\uFE08', '\uFE09', '\uFE0A', '\uFE0B', '\uFE0C', '\uFE0D', '\uFE0E', '\uFE0F'
]);

export function contains_zero_width(s: string): boolean {
    for (const char of s) {
        if (ZERO_WIDTH_CHARS.has(char)) return true;
    }
    return false;
}

export function get_grapheme_clusters(s: string): string[] {
    return s.match(/(\P{Mark}\p{Mark}*)/gu) || [];
}

export const HOMOGLYPH_CATEGORIES = {
    CYRILLIC: {
        'а': 'a', 'с': 'c', 'ԁ': 'd', 'е': 'e', 'һ': 'h', 'і': 'i',
        'ј': 'j', 'о': 'o', 'р': 'p', 'ѕ': 's', 'ѵ': 'v', 'х': 'x', 'у': 'y',
        'А': 'A', 'в': 'B', 'В': 'B', 'С': 'C', 'Е': 'E', 'ғ': 'F', 'Ғ': 'F',
        'ԍ': 'G', 'Ԍ': 'G', 'н': 'H', 'Н': 'H', 'І': 'I', 'Ј': 'J', 'к': 'K',
        'К': 'K', 'м': 'M', 'М': 'M', 'О': 'O', 'Р': 'P', 'Ѕ': 'S', 'т': 'T',
        'Т': 'T', 'Х': 'X', 'У': 'Y',
        'З': '3', 'Ч': '4', 'б': '6', 'Ъ': 'B', 'ӏ': 'l',
        'ɑ': 'a', 'ɡ': 'g', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ᴍ': 'm',
        'ᴏ': 'o', 'ᴘ': 'p', 'ᴛ': 't', 'ᴜ': 'u',
        'ꮪ': 'S', 'ꮤ': 'W', 'ꮶ': 'K', 'ꮹ': 'G', 'ꮻ': 'W', 'ꭰ': 'D',
        'ꭺ': 'A', 'ꭼ': 'E', 'ꮃ': 'W', 'ꮇ': 'M', 'ꮋ': 'H', 'ꮐ': 'G',
    },
    GREEK: {
        'ϲ': 'c', 'ί': 'i', 'ο': 'o', 'ρ': 'p', 'ω': 'w', 'ν': 'v',
        'Α': 'A', 'Β': 'B', 'Ϲ': 'C', 'Ε': 'E', 'Η': 'H', 'Ι': 'I', 'Ϳ': 'J',
        'Κ': 'K', 'κ': 'k', 'Μ': 'M', 'Ϻ': 'M', 'Ν': 'N', 'Ο': 'O', 'Τ': 'T',
        'υ': 'U', 'Χ': 'X', 'Υ': 'Y', 'Ζ': 'Z',
        'α': 'a', 'β': 'b', 'γ': 'y', 'δ': 'd', 'ε': 'e', 'η': 'n',
        'ι': 'i', 'μ': 'u', 'π': 'n', 'τ': 't', 'χ': 'x',
    },
    ARMENIAN: {
        'ց': 'g', 'օ': 'o', 'յ': 'j', 'հ': 'h', 'ո': 'n', 'ս': 'u', 'զ': 'q',
        'Լ': 'L', 'Օ': 'O', 'Ս': 'U', 'Տ': 'S',
        'Ձ': '2', 'շ': '2', 'Յ': '3', 'վ': '4',
        'ա': 'a', 'ǝ': 'e', 'ɛ': 'e', 'ɩ': 'i', 'ʝ': 'j', 'ʟ': 'L',
    },
    HEBREW: { 'וֹ': 'i', 'ח': 'n', 'ס': 'O' },
    SCRIPT: { 'í': 'i' },
    LATIN_EXTENDED: {
        'ɑ': 'a', 'ɓ': 'b', 'ƈ': 'c', 'ɗ': 'd', 'ɛ': 'e', 'ƒ': 'f',
        'ɠ': 'g', 'ɦ': 'h', 'ɨ': 'i', 'ʝ': 'j', 'ƙ': 'k', 'ɭ': 'l',
        'ɱ': 'm', 'ɲ': 'n', 'ɵ': 'o', 'ρ': 'p', 'ʠ': 'q', 'ɾ': 'r',
        'ʂ': 's', 'ƭ': 't', 'ʋ': 'v', 'ɯ': 'w', 'ʏ': 'y', 'ʐ': 'z',
        'Ɑ': 'A', 'Ɓ': 'B', 'Ƈ': 'C', 'Ɗ': 'D', 'Ɛ': 'E', 'Ƒ': 'F',
        'Ɠ': 'G', 'Ɦ': 'H', 'Ɨ': 'I', 'Ƙ': 'K', 'Ɲ': 'N', 'Ɵ': 'O',
        'Ʈ': 'T', 'Ʊ': 'U', 'Ʋ': 'V', 'Ɯ': 'W', 'Ƴ': 'Y', 'Ȥ': 'Z',
    },
    MATHEMATICAL: {
        '𝐚': 'a', '𝐛': 'b', '𝐜': 'c', '𝐝': 'd', '𝐞': 'e', '𝐟': 'f',
        '𝐠': 'g', '𝐡': 'h', '𝐢': 'i', '𝐣': 'j', '𝐤': 'k', '𝐥': 'l',
        '𝐦': 'm', '𝐧': 'n', '𝐨': 'o', '𝐩': 'p', '𝐪': 'q', '𝐫': 'r',
        '𝐬': 's', '𝐭': 't', '𝐮': 'u', '𝐯': 'v', '𝐰': 'w', '𝐱': 'x',
        '𝐲': 'y', '𝐳': 'z',
        '𝐀': 'A', '𝐁': 'B', '𝐂': 'C', '𝐃': 'D', '𝐄': 'E', '𝐅': 'F',
        '𝐆': 'G', '𝐇': 'H', '𝐈': 'I', '𝐉': 'J', '𝐊': 'K', '𝐋': 'L',
        '𝐌': 'M', '𝐍': 'N', '𝐎': 'O', '𝐏': 'P', '𝐐': 'Q', '𝐑': 'R',
        '𝐒': 'S', '𝐓': 'T', '𝐔': 'U', '𝐕': 'V', '𝐖': 'W', '𝐗': 'X',
        '𝐘': 'Y', '𝐙': 'Z',
    },
    FULLWIDTH: {
        'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f',
        'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l',
        'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r',
        'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x',
        'ｙ': 'y', 'ｚ': 'z',
        'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E', 'Ｆ': 'F',
        'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J', 'Ｋ': 'K', 'Ｌ': 'L',
        'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O', 'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R',
        'Ｓ': 'S', 'Ｔ': 'T', 'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X',
        'Ｙ': 'Y', 'Ｚ': 'Z',
    },
    PUNCTUATION: {
        '․': '.', '．': '.', '。': '.', '…': '...',
        '−': '-', '–': '-', '—': '-', '―': '-', '‐': '-', '‑': '-', '‒': '-',
        '∕': '/', '／': '/', '⧵': '\\', '＼': '\\', '：': ':', '；': ';',
        '？': '?', '！': '!', '，': ',', '（': '(', '）': ')', '［': '[', '］': ']',
        '｛': '{', '｝': '}', '“': '"', '”': '"', '‘': "'", '’': "'",
    },
} as const;

export const HOMOGLYPHS: Record<string, string> = {
    ...HOMOGLYPH_CATEGORIES.CYRILLIC,
    ...HOMOGLYPH_CATEGORIES.GREEK,
    ...HOMOGLYPH_CATEGORIES.ARMENIAN,
    ...HOMOGLYPH_CATEGORIES.HEBREW,
    ...HOMOGLYPH_CATEGORIES.SCRIPT,
    ...HOMOGLYPH_CATEGORIES.LATIN_EXTENDED,
    ...HOMOGLYPH_CATEGORIES.MATHEMATICAL,
    ...HOMOGLYPH_CATEGORIES.FULLWIDTH,
    ...HOMOGLYPH_CATEGORIES.PUNCTUATION,
};

export interface ZeroWidthDetection {
    present: boolean;
    chars: string[];
    verifiedPayload?: string;
    bidiAnomalies?: {
        present: boolean;
        chars: string[];
    };
}

export function detect_zero_width(text: string): ZeroWidthDetection {
    const found = [...ZERO_WIDTH_CHARS].filter(c => text.includes(c));
    const extendedFound = [...EXTENDED_INVISIBLE_CHARS].filter(c => text.includes(c));
    const bidiFound = [...BIDI_CHARS].filter(c => text.includes(c));
    const tagChars = detectTagCharacters(text);
    const verified = bruteForceDecodeZeroWidth(text);

    const allFound = [...found, ...extendedFound];

    return {
        present: allFound.length > 0 || bidiFound.length > 0 || tagChars.detected,
        chars: allFound,
        verifiedPayload: verified || (tagChars.detected && tagChars.decoded.length >= 4 ? `[TAG_CHARS]: ${tagChars.decoded}` : undefined),
        bidiAnomalies: { present: bidiFound.length > 0, chars: bidiFound }
    };
}

export interface HomoglyphDetection {
    char: string;
    looksLike: string;
    position: number;
    category: string;
}

export interface HomoglyphResult {
    present: boolean;
    samples: Array<{ char: string; looks_like: string }>;
    detailed?: {
        byCategory: Record<string, HomoglyphDetection[]>;
        totalCount: number;
        categories: string[];
    };
    markovAnomaly?: {
        score: number;
        suspicious: boolean;
    };
    visualSpoofing?: {
        detected: boolean;
        pairs: Array<{ original: string; spoof: string; similarity: number }>;
    };
    skeletalAnalysis?: {
        suspicious: boolean;
        skeleton: string;
        issues: number;
    };
    entropy?: {
        score: number;
        suspicious: boolean;
    };
    snow?: {
        detected: boolean;
        reasons: string[];
    };
}

/**
 * Sentinel Prime: Unicode NFKC Normalization
 * Bypasses normalization-based evasion by standardizing text
 */
export function normalizeText(text: string): string {
    return text.normalize('NFKC');
}

/**
 * Sentinel Prime: Shannon Entropy Calculation
 * Flag high-entropy Unicode blocks that may contain hidden data
 */
export function calculateShannonEntropy(text: string): { score: number; suspicious: boolean } {
    if (text.length === 0) return { score: 0, suspicious: false };
    const freqs: Record<string, number> = {};
    for (const char of text) freqs[char] = (freqs[char] || 0) + 1;
    let entropy = 0;
    const len = text.length;
    for (const char in freqs) {
        const p = freqs[char] / len;
        entropy -= p * Math.log2(p);
    }
    
    // Normalize entropy based on string length. Max possible entropy for length N is log2(N).
    // Highly compressed or encrypted data approaches a normalized ratio of 1.0.
    const maxEntropy = Math.log2(len);
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
    
    // Suspicious if it is extremely dense or highly entropic overall.
    // Thresholds are tuned to avoid flagging natural-language sentences.
    const suspicious = (normalizedEntropy > 0.90 && text.length >= 12) || (entropy > 4.8 && text.length >= 24);
    
    return { score: entropy, suspicious };
}

/**
 * Sentinel Prime: SNOW Steganography Detection
 * Detects trailing whitespaces (spaces/tabs) used in SNOW-style schemes
 */
export function detectSnowSteganography(text: string): { detected: boolean; reasons: string[] } {
    const lines = text.split('\n');
    const reasons: string[] = [];
    let trailingCount = 0;

    for (const line of lines) {
        if (/[ \t]+$/.test(line)) {
            trailingCount++;
        }
    }

    if (trailingCount > 3 || (trailingCount > 0 && trailingCount === lines.length)) {
        reasons.push(`detected_trailing_whitespace_on_${trailingCount}_lines`);
    }

    return { detected: reasons.length > 0, reasons };
}

export function detect_homoglyphs(text: string, detailed: boolean = false): HomoglyphResult {
    // Apply NFKC normalization to catch normalization-evasion attacks
    const normalized = normalizeText(text);
    const found: { char: string, looks_like: string }[] = [];
    const byCategory: Record<string, HomoglyphDetection[]> = {};
    const usedScripts = new Set<string>();
    const markov = analyzeMarkovChain(normalized);
    const visualSpoofs: Array<{ original: string; spoof: string; similarity: number }> = [];
    const entropy = calculateShannonEntropy(normalized);
    const snow = detectSnowSteganography(text); // Use original text for SNOW check

    for (let i = 0; i < normalized.length; i++) {
        const ch = normalized[i];
        if (HOMOGLYPHS[ch]) {
            const looksLike = HOMOGLYPHS[ch];
            found.push({ char: ch, looks_like: looksLike });

            // Level 8: Visual Similarity Heuristic (High-risk pairs)
            const highRiskChars = ['З', 'б', 'ѵ', 'օ', 'Տ', 'Ձ'];
            if (highRiskChars.includes(ch)) {
                visualSpoofs.push({ original: looksLike, spoof: ch, similarity: 0.99 });
            }

            if (detailed) {
                const category = Object.keys(HOMOGLYPH_CATEGORIES).find(cat =>
                    (HOMOGLYPH_CATEGORIES as any)[cat][ch]
                ) || 'UNKNOWN';
                usedScripts.add(category);
                if (!byCategory[category]) byCategory[category] = [];
                byCategory[category].push({ char: ch, looksLike, position: i, category });
            }
        }
    }

    return {
        present: found.length > 0,
        samples: found,
        detailed: detailed ? {
            byCategory,
            totalCount: found.length,
            categories: Array.from(usedScripts)
        } : undefined,
        markovAnomaly: markov,
        visualSpoofing: {
            detected: visualSpoofs.length > 0,
            pairs: visualSpoofs
        },
        skeletalAnalysis: analyzeSkeletalMapping(normalized),
        entropy,
        snow
    };
}

/**
 * Sentinel Prime: TR39 Skeletal Mapping
 * Converts text to a skeletal form to detect hidden homoglyph usage
 */
export function analyzeSkeletalMapping(text: string): { suspicious: boolean; skeleton: string; issues: number } {
    let skeleton = '';
    let issues = 0;

    for (const char of text) {
        if (HOMOGLYPHS[char]) {
            skeleton += HOMOGLYPHS[char];
            issues++;
        } else {
            skeleton += char;
        }
    }

    // Check for "mixed-script" confusables (TR39)
    // suspicious if has issues but skeleton isn't purely composed of confusables
    const suspicious = issues > 0 && issues < [...text].length * 0.8;

    return {
        suspicious,
        skeleton,
        issues
    };
}

/**
 * Sentinel Prime: Brute-Force Decoder
 */
function bruteForceDecodeZeroWidth(text: string): string | null {
    const stream = [...text].filter(c => ZERO_WIDTH_CHARS.has(c)).join('');
    if (stream.length < 8) return null;
    const binary = stream.replace(/\u200B/g, '0').replace(/\uFEFF/g, '1');
    if (/^[01]+$/.test(binary)) {
        const decoded = binaryToText(binary);
        if (isValidPayload(decoded)) return decoded;
    }
    const base7Codes = stream.split('').map(c => ZWSP_TOOL_CHARS.indexOf(c)).filter(idx => idx !== -1);
    if (base7Codes.length > 20) {
        try {
            const decoded = zeroWidth._zwspBaseDecode(text);
            if (isValidPayload(decoded)) return decoded;
        } catch (e) {
            // failed to decode
        }
    }
    return null;
}

function binaryToText(bin: string): string {
    let result = '';
    for (let i = 0; i < bin.length; i += 8) {
        const byte = bin.substring(i, i + 8);
        if (byte.length === 8) result += String.fromCharCode(parseInt(byte, 2));
    }
    return result;
}

function isValidPayload(s: string): boolean {
    if (!s) return false;
    return /^[\x20-\x7E\s]{4,}$/.test(s);
}

/**
 * Sentinel Prime (Final 10): Markov n-gram Statistical Analysis
 */
export function analyzeMarkovChain(text: string): { score: number; suspicious: boolean } {
    if (text.length < 20) return { score: 0, suspicious: false };
    const chars = [...text];
    const transitions: Record<string, number> = {};
    let total = 0;
    for (let i = 0; i < chars.length - 1; i++) {
        const key = chars[i] + chars[i + 1];
        transitions[key] = (transitions[key] || 0) + 1;
        total++;
    }
    let entropy = 0;
    for (const key in transitions) {
        const p = transitions[key] / total;
        entropy -= p * Math.log2(p);
    }
    const score = entropy / Math.max(1, Math.log2(total));
    const suspicious = score > 0.95 || (score < 0.3 && text.length > 50); // increased upper bound to avoid false positives on short strings
    return { score, suspicious };
}

/**
 * Sentinel Prime: Homoglyph Link Detection
 * Detects if URLs in the text contain homoglyph-based phishing attempts.
 */
export function detect_homoglyph_links(text: string): { detected: boolean; suspiciousLinks: Array<{ original: string; decoded: string; domain: string }> } {
    const urlRegex = /https?:\/\/[^\s/$.?#][^\s]*/gi;
    const links = text.match(urlRegex) || [];
    const suspiciousLinks: Array<{ original: string; decoded: string; domain: string }> = [];

    for (const link of links) {
        // Extract domain manually to handle homoglyphs that make URL constructor throw
        const match = link.match(/https?:\/\/([^/:\s]+)/i);
        if (!match) continue;

        const domain = match[1];
        let decodedDomain = '';
        let isSuspicious = false;

        for (const char of domain) {
            if (HOMOGLYPHS[char]) {
                isSuspicious = true;
                decodedDomain += HOMOGLYPHS[char];
            } else {
                decodedDomain += char;
            }
        }

        if (isSuspicious) {
            suspiciousLinks.push({ original: link, decoded: decodedDomain, domain });
        }
    }

    return {
        detected: suspiciousLinks.length > 0,
        suspiciousLinks
    };
}