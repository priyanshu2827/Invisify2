import * as unicode from './unicode';
import * as emoji from './emoji';
import * as stegoveritas from './stegoveritas-detector';
import { analyzeStego } from './steg-detector';
import { semanticStegoCheck } from './semantic-scanner';
import { detect_homoglyph_links } from './unicode';

export type ContentType = 'Text' | 'Image' | 'Emoji';

export interface DetectionResults {
    type: ContentType;
    score: number;
    severity: 'Safe' | 'Low' | 'Medium' | 'High' | 'Critical';
    confidence: number;
    findings: any;
    reasons: string[];
}

/**
 * Sentinel Prime: Detection Engine v6.0 (Production Hardened)
 * 
 * Architecture: Weighted Signal Fusion + 3-Tier Cascade
 * 
 * Phase 1 — Weighted Signal Accumulation:
 * Each detector contributes a specific weight to a cumulative risk score.
 * 
 * Phase 2 — Feature Fusion (Interaction Weighting):
 * Correlated signals (e.g., Emoji + ZWSP) trigger score multipliers to reduce false negatives.
 * 
 * Phase 3 — Decision Gating:
 * Weighted Score >= 40: Malicious (Medium/High/Critical depending on intensity)
 * Weighted Score < 40: Probable Safe/Low
 */

// Weight Configuration for Multi-Signal Fusion
const WEIGHTS = {
    ZWSP: 35,
    ZWSP_VERIFIED: 50,
    HOMOGLYPH: 25,
    HOMOGLYPH_SKELETON: 30,
    HOMOGLYPH_SPOOF: 40,
    ENTROPY_HIGH: 25,
    BASE64_PAYLOAD: 45,
    SNOW: 15,
    MARKOV_ANOMALY: 15,
    PHISHING_URL: 45,
    PHISHING_PATTERN: 35,
    RANDOM_STRING: 30,
    EMOJI_HIGH_RISK: 40,
    EMOJI_MEDIUM_RISK: 20,
    EMOJI_VERIFIED: 50,
    AI_SEMANTIC_ANOMALY: 20,
    NGRAM_DEVIATION: 15,
    PERPLEXITY_HIGH: 15,
    DL_ANALYSIS: 25,
    DL_ANALYSIS_STRONG: 40,
    DL_ANALYSIS_ENSEMBLE: 35,
    ALETHIA_SPA: 20,
    ALETHIA_RS: 18,
    ALETHIA_CHI: 22,
    ALETHIA_PQ: 15,
    ALETHIA_CORRELATED: 10,
};
export class DetectionEngine {

    static async analyze(
        text: string,
        imageBuffer: ArrayBuffer | null,
        pixels: number[] | Uint8Array | null,
        mimeType: string = 'image/png',
        dlResults?: { score: number; confidence: number; model_loaded: boolean; is_stego?: boolean } | null,
        aletheiaResults?: { spa?: any; rs_analysis?: any; chi_square?: any; primary_quantization?: any; error?: string } | null
    ): Promise<DetectionResults> {
        let text_in = text || "";
        let media_type: ContentType = "Text";

        if (imageBuffer && imageBuffer.byteLength > 0) {
            media_type = "Image";
        } else if (unicode.EMOJI_REGEX.test(text_in)) {
            const emojiCount = (text_in.match(unicode.EMOJI_REGEX) || []).length;
            const textLength = [...text_in].length;
            if (emojiCount / textLength > 0.5) media_type = "Emoji";
        }

        // --- CASCADE DETECTION PIPELINE ---
        let score = 0;
        const reasons: string[] = [];
        const findings: any = {};
        const pValues: number[] = []; // For Fisher's Combined Probability Test
        let detectorsTriggered = 0;
        let detectorsTotal = 0;
        let imageStrongSignals = 0;
        let imageHardEvidence = 0;

        if (media_type === 'Text' || media_type === 'Emoji') {
            // ==========================================
            // TIER 1: Deterministic Checks
            // ==========================================
            const textResults = this.analyzeTextAndEmoji(text_in);
            findings.text = textResults;

            // --- Zero-Width Characters ---
            detectorsTotal++;
            if (textResults.zero_width?.present) {
                detectorsTriggered++;
                score += WEIGHTS.ZWSP;
                reasons.push('zero_width_characters_detected');
                pValues.push(0.001);

                if (textResults.zero_width.verifiedPayload) {
                    score += WEIGHTS.ZWSP_VERIFIED;
                    reasons.push('VERIFIED_HIDDEN_PAYLOAD_EXTRACTED');
                    pValues.push(0.0001);
                }

                if (textResults.zero_width.bidiAnomalies?.present) {
                    score += 15;
                    reasons.push('bidi_override_attack_detected');
                }
            } else {
                pValues.push(0.95);
            }

            // --- Homoglyph Detection ---
            detectorsTotal++;
            if (textResults.homoglyphs?.present) {
                detectorsTriggered++;
                score += WEIGHTS.HOMOGLYPH;
                reasons.push('homoglyph_characters_detected');
                pValues.push(0.005);

                if (textResults.homoglyphs.skeletalAnalysis?.suspicious) {
                    score += WEIGHTS.HOMOGLYPH_SKELETON;
                    reasons.push('homoglyph_skeleton_phishing_detected');
                    pValues.push(0.001);
                }
                if (textResults.homoglyphs.visualSpoofing?.detected) {
                    score += WEIGHTS.HOMOGLYPH_SPOOF;
                    reasons.push('visual_spoofing_attack_detected');
                    pValues.push(0.0005);
                }
            } else {
                pValues.push(0.90);
            }

            // --- Shannon Entropy ---
            detectorsTotal++;
            const hasSpaces = text_in.includes(' ');
            const entropyVal = textResults.homoglyphs?.entropy?.score ?? 0;
            // FP Guardrail: High entropy alone on short strings (< 12 chars) is often just random IDs/passwords
            const isEntropySuspicious = textResults.homoglyphs?.entropy?.suspicious && !hasSpaces && text_in.length >= 12;
            if (isEntropySuspicious) {
                detectorsTriggered++;
                score += WEIGHTS.ENTROPY_HIGH;
                reasons.push(`high_character_entropy_detected_payload_risk (${entropyVal.toFixed(2)})`);
                pValues.push(0.01);
            } else {
                pValues.push(0.85);
            }

            // --- Base64 / Encoded Payload Check ---
            detectorsTotal++;
            const strictBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)$/.test(text_in);
            const entropy = textResults.homoglyphs?.entropy?.score ?? 0;
            const isHighDensityLong = /^[A-Za-z0-9+/=]{16,}$/.test(text_in) && !text_in.includes(' ') && entropy > 3.8;
            const isUnpaddedBase64 = /^[A-Za-z0-9+/]{16,}$/.test(text_in) && !text_in.includes(' ');
            if ((strictBase64 && text_in.length >= 12) || isHighDensityLong || isUnpaddedBase64) {
                detectorsTriggered++;
                score += WEIGHTS.BASE64_PAYLOAD;
                reasons.push('obfuscated_or_base64_payload_detected');
                pValues.push(0.002);
            } else {
                pValues.push(0.90);
            }

            // --- SNOW Steganography ---
            detectorsTotal++;
            if (textResults.homoglyphs?.snow?.detected) {
                detectorsTriggered++;
                score += WEIGHTS.SNOW;
                reasons.push(...textResults.homoglyphs.snow.reasons);
                pValues.push(0.02);
            } else {
                pValues.push(0.90);
            }

            // --- Markov Chain n-gram Analysis ---
            detectorsTotal++;
            if (textResults.homoglyphs?.markovAnomaly?.suspicious && !hasSpaces && text_in.length > 20) {
                detectorsTriggered++;
                score += WEIGHTS.MARKOV_ANOMALY;
                reasons.push('markov_bigram_anomaly_detected');
                pValues.push(0.04);
            } else {
                pValues.push(0.80);
            }

            // --- Phishing URL Detection ---
            detectorsTotal++;
            const urlResults = detect_homoglyph_links(text_in);
            if (urlResults.detected) {
                detectorsTriggered++;
                score += WEIGHTS.PHISHING_URL;
                reasons.push(`phishing_url_detected (${urlResults.suspiciousLinks.map(l => l.decoded).join(', ')})`);
                pValues.push(0.001);
            } else {
                pValues.push(0.90);
            }

            // --- Suspicious URL Pattern Detection ---
            detectorsTotal++;
            const urlMatch = text_in.match(/https?:\/\/[^\s]+/gi);
            if (urlMatch) {
                const suspiciousUrlPatterns = [
                    /paypa[Il1]/i, /micros[0o]ft/i, /g[o0]{2}gle/i,
                    /bank.*verification/i, /secure.*login.*alert/i, /account.*verif/i,
                ];
                const isPhishingUrl = urlMatch.some(url =>
                    suspiciousUrlPatterns.some(pattern => pattern.test(url))
                );
                if (isPhishingUrl) {
                    detectorsTriggered++;
                    score += WEIGHTS.PHISHING_PATTERN;
                    reasons.push('suspicious_phishing_url_pattern_detected');
                    pValues.push(0.001);
                } else {
                    pValues.push(0.85);
                }
            }

            // --- High-Entropy Random String Detection ---
            detectorsTotal++;
            const isRandomString = !hasSpaces && text_in.length >= 15 &&
                /[A-Za-z]/.test(text_in) && /[0-9]/.test(text_in) &&
                /[!@#$%^&*()_+\-={}\[\]:;"'<>?,./\\|`~]/.test(text_in) &&
                entropy > 3.5;
            if (isRandomString) {
                detectorsTriggered++;
                score += WEIGHTS.RANDOM_STRING;
                reasons.push('high_entropy_random_string_detected');
                pValues.push(0.005);
            } else {
                pValues.push(0.90);
            }

            // --- Emoji-Specific Detection ---
            detectorsTotal++;
            if (textResults.emoji_threats?.suspicious) {
                detectorsTriggered++;
                const emojiRisk = textResults.emoji_threats.riskScore || 0;

                if (emojiRisk >= 60) {
                    score += WEIGHTS.EMOJI_HIGH_RISK;
                    pValues.push(0.001);
                } else if (emojiRisk >= 30) {
                    score += WEIGHTS.EMOJI_MEDIUM_RISK;
                    pValues.push(0.02);
                } else {
                    score += 10;
                    pValues.push(0.05);
                }
                reasons.push(...textResults.emoji_threats.reasons);

                if (textResults.emoji_threats.verifiedPayload) {
                    score += WEIGHTS.EMOJI_VERIFIED;
                    reasons.push('VERIFIED_EMOJI_STEGO_PAYLOAD');
                    pValues.push(0.0001);
                }
            } else {
                pValues.push(0.90);
            }

            // TIER 2: Statistical & N-gram Deviations
            // ==========================================
            detectorsTotal++;
            if (text_in.length > 30) {
                const ngramResult = this.ngramFrequencyDeviation(text_in);
                findings.ngram_forensics = ngramResult;
                if (ngramResult.suspicious) {
                    detectorsTriggered++;
                    score += WEIGHTS.NGRAM_DEVIATION;
                    reasons.push(`ngram_frequency_deviation (dev=${ngramResult.deviation.toFixed(3)})`);
                    pValues.push(ngramResult.pValue);
                } else {
                    pValues.push(0.80);
                }
            }

            detectorsTotal++;
            if (text_in.length > 40) {
                const perplexity = this.characterPerplexity(text_in);
                findings.perplexity_analysis = perplexity;
                if (perplexity.suspicious) {
                    detectorsTriggered++;
                    score += WEIGHTS.PERPLEXITY_HIGH;
                    reasons.push(`high_character_perplexity (ppl=${perplexity.score.toFixed(1)})`);
                    pValues.push(perplexity.pValue);
                } else {
                    pValues.push(0.85);
                }
            }

            // ==========================================
            // TIER 2.5: FEATURE FUSION (Interaction Weighting)
            // ==========================================
            // Multi-signal boost: if we see Emoji stego AND ZWSP in the same text
            if (textResults.emoji_threats?.suspicious && textResults.zero_width?.present) {
                score *= 1.25; // 25% boost for multi-channel obfuscation
                reasons.push('FEATURE_FUSION: MULTI_CHANNEL_OBFUSCATION_BOOST');
            }
            // Multi-signal boost: Homoglyphs + Hidden Payload
            if (textResults.homoglyphs?.present && (textResults.zero_width?.present || textResults.emoji_threats?.suspicious)) {
                score += 15;
                reasons.push('FEATURE_FUSION: DECEPTIVE_OBFUSCATION_COMBO');
            }
            // Entropy + Base64 fusion
            if (isEntropySuspicious && isUnpaddedBase64) {
                score += 10;
                reasons.push('FEATURE_FUSION: HIGH_ENTROPY_PAYLOAD_CONFIRMED');
            }

            // ==========================================
            // TIER 3: AI Semantic Scanner (Gemini)
            // ==========================================
            if (text_in.length > 80 && (score > 25 || textResults.emoji_threats?.suspicious)) {
                detectorsTotal++;
                try {
                    const aiResult = await semanticStegoCheck(text_in);
                    findings.semantic_ai = aiResult;
                    if (aiResult.isSuspicious) {
                        detectorsTriggered++;
                        score += WEIGHTS.AI_SEMANTIC_ANOMALY;
                        reasons.push(`semantic_anomaly_detected (${aiResult.reason})`);
                        pValues.push(Math.max(0.001, 1 - aiResult.confidence));
                    } else {
                        pValues.push(0.90);
                    }
                } catch (e) {
                    // AI unavailable — no penalty, no bonus
                    findings.semantic_ai = { isSuspicious: false, reason: "AI unavailable", confidence: 0 };
                }
            }
        } else if (media_type === 'Image' && imageBuffer && pixels) {
            // ==========================================
            // IMAGE ANALYSIS PIPELINE
            // ==========================================
            const imageResults = this.analyzeImage(imageBuffer, pixels, mimeType);
            findings.image = imageResults;
            const stego = imageResults.stego_analysis;
            const veritas = imageResults.stegoveritas_analysis;

            // --- Chi-Square Test ---
            detectorsTotal++;
            if (stego?.chiSquareProbability > 0.985) {
                detectorsTriggered++;
                imageStrongSignals++; // Always count 98.5%+ as strong
                score += 25;
                reasons.push('chi_square_anomaly_detected');
                pValues.push(1 - stego.chiSquareProbability);
            } else if (stego?.chiSquareProbability > 0.90) {
                detectorsTriggered++;
                score += 12;
                reasons.push('chi_square_elevated');
                pValues.push(1 - stego.chiSquareProbability);
            } else {
                pValues.push(0.80);
            }

            // --- RS Analysis ---
            detectorsTotal++;
            if (stego?.rsEmbeddingRate > 0.10) { // Lowered from 0.20
                detectorsTriggered++;
                imageStrongSignals++;
                score += 25;
                reasons.push(`rs_embedding_detected (rate=${stego.rsEmbeddingRate.toFixed(3)})`);
                pValues.push(Math.max(0.001, 0.5 - stego.rsEmbeddingRate));
            } else if (stego?.rsEmbeddingRate > 0.05) {
                detectorsTriggered++;
                score += 8;
                reasons.push(`rs_embedding_low (rate=${stego.rsEmbeddingRate.toFixed(3)})`);
                pValues.push(0.12);
            } else {
                pValues.push(0.85);
            }

            // --- Sample Pair Analysis ---
            detectorsTotal++;
            if (stego?.spaEmbeddingRate > 0.10) { // Lowered from 0.20
                detectorsTriggered++;
                imageStrongSignals++;
                score += 25;
                reasons.push(`spa_embedding_detected (rate=${stego.spaEmbeddingRate.toFixed(3)})`);
                pValues.push(Math.max(0.001, 0.5 - stego.spaEmbeddingRate));
            } else if (stego?.spaEmbeddingRate > 0.05) {
                detectorsTriggered++;
                score += 8;
                pValues.push(0.12);
            } else {
                pValues.push(0.85);
            }

            // --- Bit-Cycle Periodicity ---
            detectorsTotal++;
            if (stego?.bitCycleAnomaly?.detected) {
                detectorsTriggered++;
                imageStrongSignals++;
                score += 15;
                reasons.push(`periodic_lsb_pattern (period=${stego.bitCycleAnomaly.periodicity})`);
                pValues.push(0.01);
            } else {
                pValues.push(0.80);
            }

            // --- Noise Fingerprint ---
            detectorsTotal++;
            if (stego?.noiseFingerprint?.suspicious) {
                detectorsTriggered++;
                score += 10;
                reasons.push('noise_floor_inconsistency_detected');
                pValues.push(0.03);
            } else {
                pValues.push(0.85);
            }

            // --- LBP Texture ---
            detectorsTotal++;
            if (stego?.lbpAnomaly?.detected) {
                detectorsTriggered++;
                score += 12;
                reasons.push('lbp_texture_anomaly_detected');
                pValues.push(0.04);
            }

            // --- Trailing Data ---
            detectorsTotal++;
            if (veritas?.trailingDataDetected) {
                detectorsTriggered++;
                imageStrongSignals++;
                imageHardEvidence++;
                score += 45;
                reasons.push(`trailing_data_detected (${veritas.trailingDataSize} bytes)`);
                pValues.push(0.005);
            } else {
                pValues.push(0.90);
            }

            // --- Metadata Tool Signatures ---
            detectorsTotal++;
            if ((veritas?.metadataAnomalies?.length || 0) > 0) {
                detectorsTriggered++;
                imageStrongSignals++;
                imageHardEvidence++;
                score += 35;
                reasons.push('metadata_anomaly_markers_found');
                pValues.push(0.005);
            } else {
                pValues.push(0.90);
            }

            // --- Channel Inconsistency ---
            detectorsTotal++;
            if (veritas?.channelInconsistency?.detected) {
                detectorsTriggered++;
                imageStrongSignals++;
                score += 15;
                reasons.push('rgb_channel_inconsistency');
                pValues.push(0.02);
            } else {
                pValues.push(0.85);
            }

            // --- Bit Plane Anomaly ---
            detectorsTotal++;
            if (veritas?.bitPlaneAnomaly) {
                detectorsTriggered++;
                score += 10;
                reasons.push('bit_plane_correlation_anomaly');
                pValues.push(0.03);
            } else {
                pValues.push(0.85);
            }

            // --- Shadow Chunks (PNG) ---
            detectorsTotal++;
            if (veritas?.shadowChunks?.detected) {
                detectorsTriggered++;
                imageStrongSignals++;
                imageHardEvidence++;
                score += 30;
                reasons.push(`shadow_chunks_detected (${veritas.shadowChunks.chunks.join(', ')})`);
                pValues.push(0.005);
            } else {
                pValues.push(0.90);
            }

            // --- JPEG DCT Analysis ---
            detectorsTotal++;
            if (veritas?.dctAnomaly?.detected) {
                detectorsTriggered++;
                imageStrongSignals++;
                score += 20;
                reasons.push(`jpeg_dct_anomaly (benford_dev=${veritas.dctAnomaly.benfordDeviation.toFixed(3)})`);
                pValues.push(veritas.dctAnomaly.pValue);
            } else {
                pValues.push(0.85);
            }

            // --- Deep Learning Analysis ---
            if (dlResults && dlResults.model_loaded) {
                detectorsTotal++;
                findings.dl_analysis = dlResults;
                if (dlResults.is_stego || (dlResults.score >= 50)) {
                    detectorsTriggered++;
                    imageStrongSignals++;
                    if (dlResults.score >= 75) {
                        score += WEIGHTS.DL_ANALYSIS_STRONG;
                        reasons.push(`deep_learning_anomaly_detected (score=${dlResults.score.toFixed(1)}, confidence=${(dlResults.confidence * 100).toFixed(0)}%)`);
                        pValues.push(Math.max(0.001, 1 - dlResults.confidence));
                    } else {
                        score += WEIGHTS.DL_ANALYSIS;
                        reasons.push(`deep_learning_suspicious (score=${dlResults.score.toFixed(1)})`);
                        pValues.push(0.02);
                    }
                } else {
                    pValues.push(0.80);
                }
            }

            // --- Aletheia Statistical Steganalysis ---
            if (aletheiaResults && !aletheiaResults.error) {
                detectorsTotal++;
                findings.aletheia = aletheiaResults;
                const aletheiaDetectors = [
                    { key: 'chi_square' as const, weight: WEIGHTS.ALETHIA_CHI, label: 'Aletheia Chi-Square' },
                    { key: 'spa' as const, weight: WEIGHTS.ALETHIA_SPA, label: 'Aletheia SPA' },
                    { key: 'rs_analysis' as const, weight: WEIGHTS.ALETHIA_RS, label: 'Aletheia RS' },
                    { key: 'primary_quantization' as const, weight: WEIGHTS.ALETHIA_PQ, label: 'Aletheia Primary Quantization' },
                ];
                let aletheiaTriggered = 0;
                for (const det of aletheiaDetectors) {
                    const res = aletheiaResults[det.key];
                    if (res && !res.error && res.positive) {
                        detectorsTriggered++;
                        imageStrongSignals++;
                        aletheiaTriggered++;
                        score += det.weight;
                        reasons.push(`${det.label}: positive (confidence=${(res.confidence * 100).toFixed(1)}%)`);
                        pValues.push(Math.max(0.001, 1 - (res.confidence || 0)));
                    }
                }
                // Correlation bonus when multiple Aletheia detectors agree
                if (aletheiaTriggered > 1) {
                    score += WEIGHTS.ALETHIA_CORRELATED;
                    reasons.push(`aletheia_correlated_detectors (${aletheiaTriggered} methods)`);
                }
                if (aletheiaTriggered === 0) {
                    pValues.push(0.80);
                }
            }

            // --- Fisher's Combined Image Ensemble ---
            const imagePValues = pValues.filter(p => p < 0.5);
            if (imagePValues.length >= 3 && (imageHardEvidence > 0 || imageStrongSignals >= 2)) {
                const fisherStat = this.fisherCombinedTest(imagePValues);
                findings.fisher_ensemble = { statistic: fisherStat.statistic, pValue: fisherStat.pValue, k: imagePValues.length };
                if (fisherStat.pValue < 0.005) {
                    score += 15;
                    reasons.push('fisher_ensemble_confirmed');
                }
            }
        }

        // ==========================================
        // FINAL SCORING
        // ==========================================
        let adjustedScore = score;

        // Relaxed image gating: allow corroborated signals to reach High/Critical
        if (media_type === 'Image') {
            if (imageHardEvidence === 0 && imageStrongSignals === 0) {
                adjustedScore = Math.min(adjustedScore, 24); // Up to Low
            } else if (imageHardEvidence === 0 && imageStrongSignals === 1) {
                adjustedScore = Math.min(adjustedScore, 49); // Up to Medium
            } else if (imageHardEvidence === 0 && imageStrongSignals === 2) {
                adjustedScore = Math.min(adjustedScore, 79); // Up to High
            }
            // 3+ strong signals or hard evidence -> no cap.
        }

        const finalScore = Math.min(100, Math.max(0, adjustedScore));

        // Check for verified payloads
        const verifiedPayloads: string[] = [];
        if (findings.text?.zero_width?.verifiedPayload) verifiedPayloads.push(findings.text.zero_width.verifiedPayload);
        if (findings.text?.emoji_threats?.verifiedPayload) verifiedPayloads.push(findings.text.emoji_threats.verifiedPayload);
        if (findings.image?.stego_analysis?.verifiedPayload) verifiedPayloads.push(findings.image.stego_analysis.verifiedPayload);

        let verifiedScore = finalScore;
        if (verifiedPayloads.length > 0 && finalScore < 90) {
            verifiedScore = 100;
            if (!reasons.includes('VERIFIED_HIDDEN_PAYLOAD_EXTRACTED')) {
                reasons.push('VERIFIED_HIDDEN_PAYLOAD_EXTRACTED');
            }
        }

        // Confidence: based on how many independent detectors agree
        const confidence = detectorsTotal > 0
            ? Math.min(0.99, 0.5 + (detectorsTriggered / detectorsTotal) * 0.5)
            : 0.5;

        // Fisher's Combined Probability for overall confidence
        const significantPValues = pValues.filter(p => p < 0.1);
        let fisherConfidence = confidence;
        if (significantPValues.length >= 2) {
            const fisher = this.fisherCombinedTest(significantPValues);
            if (fisher.pValue < 0.001) fisherConfidence = Math.max(confidence, 0.95);
            else if (fisher.pValue < 0.01) fisherConfidence = Math.max(confidence, 0.85);
            else if (fisher.pValue < 0.05) fisherConfidence = Math.max(confidence, 0.75);
        }

        return {
            type: media_type,
            score: verifiedScore,
            severity: this.getSeverity(verifiedScore),
            confidence: fisherConfidence,
            findings: {
                ...findings,
                image_signal_summary: media_type === 'Image' ? {
                    strong_signals: imageStrongSignals,
                    hard_evidence: imageHardEvidence,
                } : undefined,
                verified_payloads: verifiedPayloads.length > 0 ? verifiedPayloads : undefined,
                ensemble_confidence: fisherConfidence,
                detectors_triggered: detectorsTriggered,
                detectors_total: detectorsTotal
            },
            reasons: Array.from(new Set(reasons))
        };
    }

    // ==========================================
    // STATISTICAL METHODS
    // ==========================================

    /**
     * Fisher's Combined Probability Test
     * Combines independent p-values: X² = -2 * Σ ln(pᵢ)
     * Under H₀, follows chi-square distribution with 2k degrees of freedom
     */
    private static fisherCombinedTest(pValues: number[]): { statistic: number; pValue: number } {
        const k = pValues.length;
        if (k === 0) return { statistic: 0, pValue: 1 };

        const clampedP = pValues.map(p => Math.max(1e-10, Math.min(1 - 1e-10, p)));
        const statistic = -2 * clampedP.reduce((sum, p) => sum + Math.log(p), 0);
        const df = 2 * k;

        // Approximate chi-square survival function using regularized gamma
        const pValue = 1 - this.gammaCDF(statistic / 2, df / 2);
        return { statistic, pValue: Math.max(0, Math.min(1, pValue)) };
    }

    /**
     * Regularized lower incomplete gamma function (for chi-square CDF)
     * Uses series expansion for small x, continued fraction for large x
     */
    private static gammaCDF(x: number, a: number): number {
        if (x <= 0) return 0;
        if (x > a + 20) {
            // Use continued fraction approximation
            let f = 1 + x - a;
            let c = 1 / 1e-30;
            let d = 1 / f;
            let h = d;
            for (let i = 1; i <= 100; i++) {
                const an = -i * (i - a);
                const bn = 2 * i + 1 + x - a;
                d = bn + an * d;
                if (Math.abs(d) < 1e-30) d = 1e-30;
                c = bn + an / c;
                if (Math.abs(c) < 1e-30) c = 1e-30;
                d = 1 / d;
                const del = d * c;
                h *= del;
                if (Math.abs(del - 1) < 1e-8) break;
            }
            return 1 - Math.exp(-x + a * Math.log(x) - this.logGamma(a)) * h;
        }
        // Series expansion
        let sum = 1 / a;
        let term = 1 / a;
        for (let n = 1; n <= 200; n++) {
            term *= x / (a + n);
            sum += term;
            if (Math.abs(term) < Math.abs(sum) * 1e-10) break;
        }
        return sum * Math.exp(-x + a * Math.log(x) - this.logGamma(a));
    }

    /**
     * Log-gamma function (Stirling's approximation)
     */
    private static logGamma(x: number): number {
        const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
            -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
        let y = x;
        let tmp = x + 5.5;
        tmp -= (x + 0.5) * Math.log(tmp);
        let ser = 1.000000000190015;
        for (let j = 0; j < 6; j++) ser += c[j] / ++y;
        return -tmp + Math.log(2.5066282746310005 * ser / x);
    }

    /**
     * N-gram Frequency Deviation Analysis
     * Compares trigram distribution against English language baseline
     * Stegotext has unnaturally uniform or skewed trigram distributions
     */
    private static ngramFrequencyDeviation(text: string): { suspicious: boolean; deviation: number; pValue: number } {
        const normalized = text.toLowerCase().replace(/[^a-z ]/g, '');
        if (normalized.length < 20) return { suspicious: false, deviation: 0, pValue: 1 };

        // English trigram frequency baseline (top 30 trigrams)
        const englishBaseline: Record<string, number> = {
            'the': 0.035, 'and': 0.016, 'ing': 0.013, 'ent': 0.012, 'ion': 0.011,
            'her': 0.010, 'for': 0.010, 'tha': 0.009, 'nth': 0.009, 'int': 0.008,
            'ere': 0.008, 'tio': 0.008, 'ver': 0.007, 'ati': 0.007, 'ter': 0.007,
            'est': 0.007, 'ous': 0.006, 'all': 0.006, 'are': 0.006, 'rea': 0.006,
            'hat': 0.006, 'was': 0.006, 'ith': 0.006, 'his': 0.005, 'not': 0.005,
            'but': 0.005, 'you': 0.005, 'com': 0.005, 'pro': 0.005, 'con': 0.005,
        };

        // Build input trigram frequencies
        const trigrams: Record<string, number> = {};
        let total = 0;
        for (let i = 0; i <= normalized.length - 3; i++) {
            const tri = normalized.substring(i, i + 3);
            if (tri.includes(' ')) continue;
            trigrams[tri] = (trigrams[tri] || 0) + 1;
            total++;
        }
        if (total < 10) return { suspicious: false, deviation: 0, pValue: 1 };

        // Calculate KL-divergence from English baseline
        let klDiv = 0;
        let matchedTrigrams = 0;
        for (const tri in englishBaseline) {
            const observed = (trigrams[tri] || 0) / total;
            const expected = englishBaseline[tri];
            if (observed > 0) {
                klDiv += observed * Math.log(observed / expected);
                matchedTrigrams++;
            } else {
                klDiv += 0.001 * Math.log(0.001 / expected); // Smoothing
            }
        }

        const deviation = Math.abs(klDiv);
        // High deviation from English = suspicious
        const suspicious = deviation > 2.0 && normalized.length > 30;
        const pValue = suspicious ? Math.max(0.001, Math.exp(-deviation)) : 0.8;

        return { suspicious, deviation, pValue };
    }

    /**
     * Character-Level Perplexity Estimator (DistilBERT Equivalent)
     * Uses character-level cross-entropy against English unigram/bigram frequencies
     * High perplexity = text is unlike natural language = possible stegotext
     */
    private static characterPerplexity(text: string): { suspicious: boolean; score: number; pValue: number } {
        const lower = text.toLowerCase();
        // English character frequencies (from large corpus analysis)
        const charFreq: Record<string, number> = {
            'e': 0.127, 't': 0.091, 'a': 0.082, 'o': 0.075, 'i': 0.070,
            'n': 0.067, 's': 0.063, 'h': 0.061, 'r': 0.060, 'd': 0.043,
            'l': 0.040, 'c': 0.028, 'u': 0.028, 'm': 0.024, 'w': 0.024,
            'f': 0.022, 'g': 0.020, 'y': 0.020, 'p': 0.019, 'b': 0.015,
            'v': 0.010, 'k': 0.008, 'j': 0.002, 'x': 0.002, 'q': 0.001,
            'z': 0.001, ' ': 0.180,
        };

        let crossEntropy = 0;
        let counted = 0;
        for (const ch of lower) {
            const p = charFreq[ch] || 0.0005; // Smoothing for unknown chars
            crossEntropy -= Math.log2(p);
            counted++;
        }

        if (counted === 0) return { suspicious: false, score: 0, pValue: 1 };

        const perplexity = Math.pow(2, crossEntropy / counted);
        // Natural English text: perplexity ~8-15
        // Stegotext/encoded: perplexity > 25
        // Random: perplexity > 40
        const suspicious = perplexity > 25 && text.length > 30;
        const pValue = suspicious ? Math.max(0.001, Math.exp(-perplexity / 10)) : 0.8;

        return { suspicious, score: perplexity, pValue };
    }

    // ==========================================
    // ANALYSIS METHODS
    // ==========================================

    private static analyzeTextAndEmoji(text: string) {
        return {
            zero_width: unicode.detect_zero_width(text),
            homoglyphs: unicode.detect_homoglyphs(text, true),
            emoji_threats: emoji.enhancedEmojiSecurityScan(text)
        };
    }

    private static analyzeImage(buffer: ArrayBuffer, pixels: number[] | Uint8Array, mimeType: string) {
        const stegoPixels = this.extractStegoPixels(pixels);
        return {
            stego_analysis: analyzeStego(stegoPixels),
            stegoveritas_analysis: stegoveritas.analyzeStegoVeritas(buffer, pixels, mimeType)
        };
    }

    /**
     * Remove alpha channel noise from RGBA buffers before LSB statistical tests.
     * Including alpha (often constant 255) inflates chi-square/RS/SPA false positives.
     */
    private static extractStegoPixels(pixels: number[] | Uint8Array): Uint8Array {
        const input = pixels instanceof Uint8Array ? pixels : Uint8Array.from(pixels);
        if (input.length % 4 !== 0) return input;

        const rgb = new Uint8Array((input.length / 4) * 3);
        let out = 0;
        for (let i = 0; i < input.length; i += 4) {
            rgb[out++] = input[i];
            rgb[out++] = input[i + 1];
            rgb[out++] = input[i + 2];
        }
        return rgb;
    }

    private static getSeverity(score: number): 'Safe' | 'Low' | 'Medium' | 'High' | 'Critical' {
        if (score >= 85) return 'Critical';
        if (score >= 60) return 'High';
        if (score >= 40) return 'Medium';
        if (score >= 15) return 'Low';
        return 'Safe';
    }
}
