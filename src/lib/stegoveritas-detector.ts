/**
 * stegoVeritas-Detector Library
 * Port of core heuristics from stegoVeritas (Python) to TypeScript.
 * Focuses on non-LSB anomalies and channel inconsistencies.
 */

export interface StegoVeritasResult {
    suspicious: boolean;
    trailingDataDetected: boolean;
    trailingDataSize: number;
    metadataAnomalies: string[];
    bitPlaneAnomaly: boolean;
    channelInconsistency: {
        detected: boolean;
        scores: { r: number; g: number; b: number };
    };
    shadowChunks: {
        detected: boolean;
        chunks: string[];
    };
    entropyMap: number[];
    filterAnomaly: boolean;
    frameDelayAnomaly: {
        detected: boolean;
        variance: number;
    };
    dctAnomaly: {
        detected: boolean;
        benfordDeviation: number;
        pValue: number;
    };
    gaborAnomaly: {
        detected: boolean;
        deviation: number;
    };
    reasons: string[];
}

export function detectTrailingData(buffer: ArrayBufferLike, mimeType: string): { detected: boolean; size: number } {
    const bytes = new Uint8Array(buffer);
    let eofIndex = -1;
    if (mimeType.includes('png')) {
        const iend = [0x49, 0x45, 0x4E, 0x44];
        for (let i = bytes.length - 8; i >= 0; i--) {
            if (bytes[i] === iend[0] && bytes[i + 1] === iend[1] && bytes[i + 2] === iend[2] && bytes[i + 3] === iend[3]) {
                eofIndex = i + 8;
                break;
            }
        }
    } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        for (let i = bytes.length - 2; i >= 0; i--) {
            if (bytes[i] === 0xFF && bytes[i + 1] === 0xD9) {
                eofIndex = i + 2;
                break;
            }
        }
    }
    if (eofIndex !== -1 && eofIndex < bytes.length - 4) return { detected: true, size: bytes.length - eofIndex };
    return { detected: false, size: 0 };
}

export function detectMetadataAnomalies(buffer: ArrayBufferLike): string[] {
    const bytes = new Uint8Array(buffer);
    const anomalies: string[] = [];
    const sampleSize = Math.min(bytes.length, 4096);
    // Use TextDecoder instead of String.fromCharCode(...spread) to avoid stack overflow on large arrays
    const headerContent = new TextDecoder('ascii', { fatal: false }).decode(bytes.slice(0, sampleSize));
    const suspiciousMarkers = [/stegHide/i, /OutGuess/i, /JPHIDE/i, /f5[-_\s]?stego/i, /f5[-_\s]?steganography/i];
    for (const marker of suspiciousMarkers) {
        if (marker.test(headerContent)) anomalies.push(`Known tool signature detected: ${marker.source}`);
    }
    return anomalies;
}

export function detectShadowChunks(buffer: ArrayBufferLike): { detected: boolean; chunks: string[] } {
    const bytes = new Uint8Array(buffer);
    const standardChunks = new Set([
        'IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'cHRM', 'gAMA', 'iCCP', 'sBIT',
        'sRGB', 'pHYs', 'sPLT', 'tIME', 'iTXt', 'tEXt', 'zTXt', 'bKGD', 'hIST',
        // APNG standard chunks
        'acTL', 'fcTL', 'fdAT'
    ]);
    const found: string[] = [];
    let pos = 8;
    while (pos < bytes.length - 8) {
        // Use unsigned shift to prevent negative chunk lengths
        const length = ((bytes[pos] << 24) >>> 0) + (bytes[pos + 1] << 16) + (bytes[pos + 2] << 8) + bytes[pos + 3];
        // Bounds check: prevent infinite loop on malformed chunks
        if (length < 0 || length > bytes.length - pos) break;
        const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
        if (!/^[a-zA-Z]{4}$/.test(type)) break;
        if (!standardChunks.has(type)) found.push(type);
        pos += 12 + length;
    }
    return { detected: found.length > 0, chunks: found };
}

export function calculateEntropyMap(buffer: ArrayBufferLike): number[] {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 1024;
    const map: number[] = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const slice = bytes.slice(i, i + chunkSize);
        const freq = new Array(256).fill(0);
        for (const b of slice) freq[b]++;
        let entropy = 0;
        for (const f of freq) {
            if (f > 0) {
                const p = f / slice.length;
                entropy -= p * Math.log2(p);
            }
        }
        map.push(entropy / 8);
    }
    return map;
}

export function detectFilterAnomaly(buffer: ArrayBufferLike): boolean {
    const bytes = new Uint8Array(buffer);
    let idatContent: number[] = [];
    let pos = 8;
    while (pos < bytes.length - 8) {
        // Use unsigned shift to prevent negative chunk lengths
        const length = ((bytes[pos] << 24) >>> 0) + (bytes[pos + 1] << 16) + (bytes[pos + 2] << 8) + bytes[pos + 3];
        if (length < 0 || length > bytes.length - pos) break;
        const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
        if (type === 'IDAT') for (let i = 0; i < Math.min(length, 100); i++) idatContent.push(bytes[pos + 8 + i]);
        if (!/^[a-zA-Z]{4}$/.test(type)) break;
        pos += 12 + length;
    }
    if (idatContent.length < 50) return false;
    const freq = new Array(256).fill(0);
    for (const b of idatContent) freq[b]++;
    const variance = freq.reduce((sum, f) => sum + Math.pow(f - (idatContent.length / 256), 2), 0) / 256;
    // Only flag extremely uniform filter byte distributions (actual steganographic signature).
    // Normal compressed images have low variance too; threshold must be tight,
    // but not so tight it misses real stego (like 0.005). 0.02 is a better balance.
    return variance < 0.02;
}

export function analyzeFrameDelays(buffer: ArrayBufferLike): { detected: boolean; variance: number } {
    const bytes = new Uint8Array(buffer);
    const delays: number[] = [];
    for (let i = 0; i < bytes.length - 5; i++) {
        if (bytes[i] === 0x21 && bytes[i + 1] === 0xF9) {
            const delay = bytes[i + 4] | (bytes[i + 5] << 8);
            if (delay > 0) delays.push(delay);
        }
    }
    for (let i = 0; i < bytes.length - 28; i++) {
        if (String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]) === 'fcTL') delays.push(bytes[i + 20] | (bytes[i + 21] << 8));
    }
    if (delays.length < 5) return { detected: false, variance: 0 };
    const mean = delays.reduce((a, b) => a + b, 0) / delays.length;
    const variance = delays.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / delays.length;
    return { detected: variance > 0.5, variance };
}

export function analyzeRGBInconsistency(pixelData: number[] | Uint8Array): { detected: boolean; scores: { r: number; g: number; b: number } } {
    if (pixelData.length < 4) return { detected: false, scores: { r: 0, g: 0, b: 0 } };
    const channels = { r: [] as number[], g: [] as number[], b: [] as number[] };
    // sharp outputs RGBA (4 bytes per pixel), so stride is 4
    const stride = 4;
    for (let i = 0; i < pixelData.length - 2; i += stride) {
        channels.r.push(pixelData[i]);
        channels.g.push(pixelData[i + 1]);
        channels.b.push(pixelData[i + 2]);
    }
    const getLsbEntropy = (arr: number[]) => {
        if (arr.length === 0) return 0;
        const p1 = arr.reduce((sum, val) => sum + (val & 1), 0) / arr.length;
        if (p1 === 0 || p1 === 1) return 0;
        return -(p1 * Math.log2(p1) + (1 - p1) * Math.log2(1 - p1));
    };
    const scores = { r: getLsbEntropy(channels.r), g: getLsbEntropy(channels.g), b: getLsbEntropy(channels.b) };
    const max = Math.max(scores.r, scores.g, scores.b);
    const min = Math.min(scores.r, scores.g, scores.b);
    // Raise the max threshold to 0.92: natural photos have LSB entropy ~0.9-0.95;
    // only flag when one channel is near-perfectly noisy (steganographic embedding).
    return { detected: (max - min) > 0.15 && max > 0.92, scores };
}

export function detectBitPlaneAnomaly(pixelData: number[] | Uint8Array): boolean {
    if (pixelData.length < 5000) return false;
    const effectiveData = extractNonAlphaBytes(pixelData);
    if (effectiveData.length < 1000) return false;
    let correlationBit01 = 0;
    const sampleSize = Math.min(effectiveData.length, 10000);
    for (let i = 0; i < sampleSize; i++) if ((effectiveData[i] & 1) === ((effectiveData[i] >> 1) & 1)) correlationBit01++;
    const density = correlationBit01 / sampleSize;
    // Random/noisy images naturally cluster around ~0.5; flag only strong deviation.
    return density < 0.40 || density > 0.60;
}

/**
 * JPEG DCT Coefficient Analysis (JRM-Lite)
 * Analyzes the first-digit distribution of DCT coefficients against Benford's Law.
 * Steganography tools like JSteg, F5, OutGuess disturb the natural DCT distribution.
 */
export function analyzeJpegDCT(buffer: ArrayBufferLike, mimeType: string): { detected: boolean; benfordDeviation: number; pValue: number } {
    if (!mimeType.includes('jpeg') && !mimeType.includes('jpg')) {
        return { detected: false, benfordDeviation: 0, pValue: 1 };
    }

    const bytes = new Uint8Array(buffer);
    // Extract quantized DCT values from JPEG scan data (after SOS marker)
    let sosStart = -1;
    for (let i = 0; i < bytes.length - 2; i++) {
        if (bytes[i] === 0xFF && bytes[i + 1] === 0xDA) {
            // Skip SOS header length
            const headerLen = (bytes[i + 2] << 8) | bytes[i + 3];
            sosStart = i + 2 + headerLen;
            break;
        }
    }

    if (sosStart === -1 || sosStart >= bytes.length - 100) {
        return { detected: false, benfordDeviation: 0, pValue: 1 };
    }

    // Collect first digits of scan data bytes (proxy for DCT coefficients)
    const firstDigits = new Array(9).fill(0); // digits 1-9
    let total = 0;
    const scanData = bytes.slice(sosStart, Math.min(sosStart + 50000, bytes.length));

    for (const b of scanData) {
        if (b === 0 || b === 0xFF) continue; // Skip stuffed bytes and zeros
        const firstDigit = parseInt(b.toString()[0]);
        if (firstDigit >= 1 && firstDigit <= 9) {
            firstDigits[firstDigit - 1]++;
            total++;
        }
    }

    if (total < 100) return { detected: false, benfordDeviation: 0, pValue: 1 };

    // Benford's Law expected distribution
    const benford = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

    // Chi-square goodness-of-fit test against Benford's Law
    let chiSquare = 0;
    for (let i = 0; i < 9; i++) {
        const observed = firstDigits[i] / total;
        const expected = benford[i];
        chiSquare += Math.pow(observed - expected, 2) / expected;
    }

    const benfordDeviation = chiSquare;
    // df = 8 (9 categories - 1). Critical value at α=0.05 is 15.507
    const detected = chiSquare > 25;
    const pValue = detected ? Math.max(0.001, Math.exp(-chiSquare / 4)) : 0.8;

    return { detected, benfordDeviation, pValue };
}

/**
 * Gabor Filter Response (SCA-GFR Equivalent)
 * Computes texture energy variance across pixel blocks.
 * Stego embedding disrupts local texture consistency.
 */
export function analyzeGaborResponse(pixelData: number[] | Uint8Array): { detected: boolean; deviation: number } {
    const effectiveData = extractNonAlphaBytes(pixelData);
    if (effectiveData.length < 4096) return { detected: false, deviation: 0 };

    const blockSize = 64;
    const energies: number[] = [];

    // Compute local texture energy per block (simplified Gabor via gradient magnitude)
    for (let i = 0; i < effectiveData.length - blockSize; i += blockSize) {
        let energy = 0;
        for (let j = 0; j < blockSize - 1; j++) {
            const idx = i + j;
            const diff = Math.abs(effectiveData[idx] - effectiveData[idx + 1]);
            energy += diff * diff;
        }
        energies.push(energy / blockSize);
    }

    if (energies.length < 10) return { detected: false, deviation: 0 };

    // Compute coefficient of variation
    const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
    const variance = energies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / energies.length;
    const cv = Math.sqrt(variance) / Math.max(mean, 0.001);

    // Natural images: CV ~0.3-0.8. Stego-embedded: CV often < 0.2 (smoothed) or > 1.0 (noisy).
    // Smoothness threshold of 0.12 avoids flagging logos / UI screenshots but catches stego.
    const detected = cv < 0.12 || cv > 1.2;

    return { detected, deviation: cv };
}

function extractNonAlphaBytes(pixelData: number[] | Uint8Array): Uint8Array {
    const bytes = pixelData instanceof Uint8Array ? pixelData : Uint8Array.from(pixelData);
    if (bytes.length % 4 !== 0) return bytes;

    const rgb = new Uint8Array((bytes.length / 4) * 3);
    let out = 0;
    for (let i = 0; i < bytes.length; i += 4) {
        rgb[out++] = bytes[i];
        rgb[out++] = bytes[i + 1];
        rgb[out++] = bytes[i + 2];
    }
    return rgb;
}

export function analyzeStegoVeritas(buffer: ArrayBufferLike, pixelData: number[] | Uint8Array, mimeType: string): StegoVeritasResult {
    const trailing = detectTrailingData(buffer, mimeType);
    const anomalies = detectMetadataAnomalies(buffer);
    const inconsistency = analyzeRGBInconsistency(pixelData);
    const bitPlaneAnomaly = detectBitPlaneAnomaly(pixelData);
    const shadowChunks = detectShadowChunks(buffer);
    const entropyMap = calculateEntropyMap(buffer);
    const filterAnomaly = detectFilterAnomaly(buffer);
    const frameDelay = analyzeFrameDelays(buffer);
    const dct = analyzeJpegDCT(buffer, mimeType);
    const gabor = analyzeGaborResponse(pixelData);
    const reasons: string[] = [];
    if (trailing.detected) reasons.push(`trailing_data_detected (${trailing.size} bytes)`);
    if (anomalies.length > 0) reasons.push('metadata_anomaly_markers_found');
    if (inconsistency.detected) reasons.push('rgb_channel_inconsistency_detected');
    if (bitPlaneAnomaly) reasons.push('bit_plane_noise_anomaly_detected');
    if (shadowChunks.detected) reasons.push(`shadow_chunks_detected (${shadowChunks.chunks.join(', ')})`);
    if (filterAnomaly) reasons.push('png_filter_structure_anomaly');
    if (frameDelay.detected) reasons.push('multi_frame_delay_anomaly_detected');
    if (dct.detected) reasons.push(`jpeg_dct_benford_anomaly (dev=${dct.benfordDeviation.toFixed(3)})`);
    if (gabor.detected) reasons.push(`gabor_texture_anomaly (cv=${gabor.deviation.toFixed(3)})`);

    return {
        suspicious: reasons.length > 0,
        trailingDataDetected: trailing.detected,
        trailingDataSize: trailing.size,
        metadataAnomalies: anomalies,
        bitPlaneAnomaly,
        channelInconsistency: inconsistency,
        shadowChunks,
        entropyMap,
        filterAnomaly,
        frameDelayAnomaly: frameDelay,
        dctAnomaly: dct,
        gaborAnomaly: gabor,
        reasons
    };
}
