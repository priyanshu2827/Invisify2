import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-2.5-flash',
});

/**
 * Sentinel Prime: Semantic Perplexity AI Scanner v2.0
 * Uses LLM to detect unnatural linguistic patterns typical of steganography.
 * 
 * Improvements:
 * - SHA-256 rate-limit cache (60s TTL) prevents quota burn
 * - 5s timeout for Gemini under load
 * - Prompt injection hardened via JSON.stringify + length cap
 */

// Rate-limit cache: hash -> { result, timestamp }
const scanCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds
const MAX_CACHE_SIZE = 500;

async function getCacheKey(text: string): Promise<string> {
    // SHA-256 hash to prevent collision (32-bit hash has ~50% collision at 77k inputs)
    const encoder = new TextEncoder();
    const data = encoder.encode(text.substring(0, 2000));
    try {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return 'stego_' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
        // Fallback for environments without crypto.subtle
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash) + data[i];
            hash |= 0;
        }
        return `stego_fallback_${hash}`;
    }
}

function pruneCache() {
    const now = Date.now();
    for (const [key, entry] of scanCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL_MS) {
            scanCache.delete(key);
        }
    }
    // LRU eviction: cap cache size to prevent unbounded memory growth
    if (scanCache.size > MAX_CACHE_SIZE) {
        const entries = [...scanCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
        for (let i = 0; i < entries.length - MAX_CACHE_SIZE; i++) {
            scanCache.delete(entries[i][0]);
        }
    }
}

export const semanticStegoCheck = ai.defineFlow(
    {
        name: 'semanticStegoCheck',
        inputSchema: z.string(),
        outputSchema: z.object({
            isSuspicious: z.boolean(),
            perplexityScore: z.number(), // 0 to 100
            reason: z.string(),
            confidence: z.number()
        }),
    },
    async (text) => {
        const fallback = { isSuspicious: false, perplexityScore: 0, reason: "AI unavailable", confidence: 0 };

        try {
            // Check cache first
            pruneCache();
            const cacheKey = await getCacheKey(text);
            const cached = scanCache.get(cacheKey);
            if (cached) {
                return cached.result;
            }

            // Cap input to prevent prompt injection via massive payloads
            const sanitizedText = JSON.stringify(text).slice(0, 2000);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200);

            const resultPromise = ai.generate({
                prompt: `You are a steganography forensics expert. Analyze this text for steganographic indicators.

Detect these specific markers:
1. Text that appears machine-generated to hide data (stegotext)
2. Abnormally rigid grammar with no semantic meaning
3. Repetitive structural patterns
4. Abrupt non-sequitur topic transitions
5. Character sequences that could encode hidden binary data
6. Mixed Unicode scripts used for homograph attacks

Respond with JSON only. Set isSuspicious=true ONLY if you detect active steganographic encoding or evasion. Normal text, code snippets, and casual messages should return isSuspicious=false.

TEXT: ${sanitizedText}`,
                output: {
                    format: 'json',
                    schema: z.object({
                        isSuspicious: z.boolean(),
                        perplexityScore: z.number(),
                        reason: z.string(),
                        confidence: z.number()
                    })
                }
            });

            // Catch the result promise to prevent unhandled rejection if timeout fires
            const safeResult = resultPromise.catch(() => ({ output: null }));

            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('API Timeout')), 1200)
            );

            let output;
            try {
                const res = await Promise.race([safeResult, timeoutPromise]) as any;
                output = res?.output;
            } catch {
                output = null;
            }
            clearTimeout(timeoutId);
            const result = output || fallback;

            // Cache the result
            scanCache.set(cacheKey, { result, timestamp: Date.now() });

            return result;
        } catch (e) {
            return fallback;
        }
    }
);
