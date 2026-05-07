import { DetectionEngine } from './detection-engine';
import * as unicode from './unicode';
import * as emoji from './emoji';
import { zeroWidth, Position, SteganographyMode } from './zerowidth';

async function runBenchmark() {
    console.log('🛰️ Starting Sentinel Prime - FINAL ACCURACY BENCHMARK...\n');

    const results = {
        text: { tp: 0, fp: 0, tn: 0, fn: 0 },
        emoji: { tp: 0, fp: 0, tn: 0, fn: 0 },
        image: { tp: 0, fp: 0, tn: 0, fn: 0 }
    };

    // 1. Text Domain
    console.log('--- Domain: Text ---');
    const cleanTexts = [
        "The quick brown fox jumps over the lazy dog.",
        "In the heart of the city, life moves fast.",
        "Sentinel Prime is active and monitoring."
    ];

    for (const text of cleanTexts) {
        const d = await DetectionEngine.analyze(text, null, null);
        if (d.score < 20) results.text.tn++; else results.text.fp++;

        // Binary verification
        const enc1 = zeroWidth.zeroEncode(text, "SECRET MESSAGE", Position.BOTTOM, 1, SteganographyMode.BINARY);
        const d1 = await DetectionEngine.analyze(enc1, null, null);
        if (d1.score === 100) results.text.tp++; else results.text.fn++;

        // ZWSP-Tool verification
        const enc2 = zeroWidth.zeroEncode(text, "Forensic Proof", Position.BOTTOM, 1, SteganographyMode.ZWSP_TOOL);
        const d2 = await DetectionEngine.analyze(enc2, null, null);
        if (d2.score === 100) results.text.tp++; else results.text.fn++;
    }

    // 2. Emoji Domain
    console.log('--- Domain: Emoji ---');
    const cleanEmojiStrings = ["😀🔥🚀🎨🌈", "🤖👻💡🔮🧿", "🎭🎪🎢🎡🎠"];
    for (const ces of cleanEmojiStrings) {
        const d = await DetectionEngine.analyze(ces, null, null);
        if (d.score < 20) results.emoji.tn++; else results.emoji.fp++;

        const encoded = emoji.encode("SENTINEL_PRIME_VERIFIED_100", "");
        const d2 = await DetectionEngine.analyze(encoded, null, null);
        // Verified Alphabet Decoder should trigger 100%
        if (d2.score === 100) results.emoji.tp++; else {
            console.log(`  Emoji FN - Score: ${d2.score}, Reasons: ${d2.reasons.join(', ')}`);
            results.emoji.fn++;
        }
    }

    // 3. Image Domain
    console.log('--- Domain: Image ---');
    const generateRealisticPixels = () => {
        const p = new Array(20000 * 4); // 20k pixels * 4 channels
        for (let i = 0; i < 20000; i++) {
            // Natural gradient + realistic sensor noise (Standard deviation ~4.3)
            // This prevents artificial patterns that trigger RS/SPA false positives.
            const base = 128 + Math.sin(i / 200) * 40 + Math.cos(i / 500) * 20;
            const noise = (Math.random() - 0.5) * 15;
            const val = Math.floor(Math.max(0, Math.min(255, base + noise)));
            p[i * 4] = val;     // R
            p[i * 4 + 1] = val; // G
            p[i * 4 + 2] = val; // B
            p[i * 4 + 3] = 255; // A (Solid)
        }
        return p;
    };

    const applyLSB = (pixels: number[], message: string) => {
        const newPixels = [...pixels];
        const bytes = new TextEncoder().encode(message);
        const bits: number[] = [];
        for (const b of bytes) {
            // MSB first
            for (let j = 7; j >= 0; j--) bits.push((b >> j) & 1);
        }
        let bitIdx = 0;
        for (let i = 0; i < pixels.length && bitIdx < bits.length; i++) {
            if ((i + 1) % 4 === 0) continue; // Skip Alpha channel
            newPixels[i] = (newPixels[i] & ~1) | bits[bitIdx++];
        }
        return newPixels;
    };

    for (let i = 0; i < 10; i++) {
        const clean = generateRealisticPixels();
        const d = await DetectionEngine.analyze("", new ArrayBuffer(clean.length), clean);
        if (d.score < 35) results.image.tn++; else {
            console.log(`  Image FP - Score: ${d.score}, Reasons: ${d.reasons.join(', ')}`);
            results.image.fp++;
        }

        // Hide a real secret message
        const secret = "SENTINEL_PRIME_SECRET_PAYLOAD_VERIFICATION_" + i;
        const stego = applyLSB(clean, secret);
        const d2 = await DetectionEngine.analyze("", new ArrayBuffer(stego.length), stego);
        
        // If it's a verified payload, it should be score 100
        if (d2.score === 100) results.image.tp++; else {
            console.log(`  Image FN - Score: ${d2.score}, Reasons: ${d2.reasons.join(', ')}`);
            results.image.fn++;
        }
    }

    // Final Statistics
    const finalReport = (s: any, label: string) => {
        const acc = (s.tp + s.tn) / (s.tp + s.tn + s.fp + s.fn);
        console.log(`\n> ${label} Accuracy: ${(acc * 100).toFixed(2)}%`);
        console.log(`  [TP: ${s.tp}, TN: ${s.tn}, FP: ${s.fp}, FN: ${s.fn}]`);
        return acc;
    };

    const a1 = finalReport(results.text, "Text");
    const a2 = finalReport(results.emoji, "Emoji");
    const a3 = finalReport(results.image, "Image");

    console.log(`\n🚀 PRACTICAL SYSTEM ACCURACY: ${((a1 + a2 + a3) / 3 * 100).toFixed(2)}%`);
}

runBenchmark().catch(console.error);
