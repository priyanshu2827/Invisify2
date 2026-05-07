"use strict";
/**
 * Steg-Detector Library
 * Port of core heuristics from StegExpose (Java) to TypeScript
 * Detects LSB steganography using statistical analysis.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.chiSquareAttack = chiSquareAttack;
exports.samplePairAnalysis = samplePairAnalysis;
exports.rsAnalysis = rsAnalysis;
exports.analyzeBitCycle = analyzeBitCycle;
exports.analyzeNoiseFingerprint = analyzeNoiseFingerprint;
exports.analyzeLBP = analyzeLBP;
exports.extractLSBPayload = extractLSBPayload;
exports.analyzeStego = analyzeStego;
function chiSquareAttack(pixelData) {
    if (pixelData.length === 0)
        return 0;
    var frequencies = new Array(256).fill(0);
    for (var _i = 0, pixelData_1 = pixelData; _i < pixelData_1.length; _i++) {
        var pixel = pixelData_1[_i];
        frequencies[pixel]++;
    }
    var chiSquareSum = 0;
    var df = 0;
    for (var i = 0; i < 128; i++) {
        var obs1 = frequencies[2 * i];
        var obs2 = frequencies[2 * i + 1];
        var totalPoV = obs1 + obs2;
        if (totalPoV > 10) {
            var expected = totalPoV / 2;
            chiSquareSum += Math.pow(obs1 - expected, 2) / expected;
            df++;
        }
    }
    if (df === 0)
        return 0;
    var x = chiSquareSum / 2;
    var k = df / 2;
    var sum = 1.0;
    var term = 1.0;
    for (var i = 1; i < k; i++) {
        term *= x / i;
        sum += term;
    }
    // Survival function: probability that a random distribution would be MORE unequal than this.
    // If chiSquareSum is small (equal frequencies), pValue is high (near 1.0).
    var pValue = Math.exp(-x) * sum;
    return Math.max(0, Math.min(1, pValue));
}
function samplePairAnalysis(pixelData) {
    if (pixelData.length < 128)
        return 0;
    var r0 = 0, s0 = 0, r1 = 0, s1 = 0;
    for (var i = 0; i < pixelData.length - 1; i += 2) {
        var u = pixelData[i];
        var v = pixelData[i + 1];
        var isX = (v % 2 === 0 && u < v) || (v % 2 !== 0 && u > v);
        var isY = (v % 2 === 0 && u > v) || (v % 2 !== 0 && u < v);
        if (isX)
            r0++;
        if (isY)
            s0++;
        if (u % 2 === v % 2)
            r1++;
        else
            s1++;
    }
    var a = 2 * (r1 + s1);
    var b = (s0 - r0) - (2 * r1 + s1);
    var c = r0 - s0;
    if (Math.abs(a) < 0.001)
        return 0;
    var discriminant = b * b - 4 * a * c;
    if (discriminant < 0)
        return 0;
    var p1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    var p2 = (-b - Math.sqrt(discriminant)) / (2 * a);
    var results = [p1, p2].filter(function (v) { return v > 0 && v <= 0.5; }); // Capped at 0.5 for realistic LSB
    var p = results.length > 0 ? Math.min.apply(Math, results) : 0;
    // Homogeneity check: if the image is too smooth, SPA is unreliable.
    if ((r0 + s0) < (r1 + s1) * 0.1)
        return 0;
    return p;
}
function rsAnalysis(pixelData) {
    if (pixelData.length < 256)
        return 0;
    var flip = function (x) { return (x % 2 === 0 ? x + 1 : x - 1); };
    var invert = function (x) { return (x === 255 ? 254 : (x === 0 ? 1 : (x % 2 === 0 ? x - 1 : x + 1))); };
    var calculateF = function (group, m) {
        var score = 0;
        var flipped = group.map(function (x, i) {
            if (m[i] === 1)
                return flip(x);
            if (m[i] === -1)
                return invert(x);
            return x;
        });
        for (var i = 0; i < flipped.length - 1; i++)
            score += Math.abs(flipped[i] - flipped[i + 1]);
        return score;
    };
    var Rm = 0, Sm = 0, R_m = 0, S_m = 0;
    var groupSize = 4;
    var mask = [0, 1, 1, 0];
    var inverseMask = [0, -1, -1, 0];
    for (var i = 0; i <= pixelData.length - groupSize; i += groupSize) {
        var group = Array.from(pixelData.slice(i, i + groupSize));
        var f0 = calculateF(group, [0, 0, 0, 0]);
        var fm = calculateF(group, mask);
        if (fm > f0)
            Rm++;
        else if (fm < f0)
            Sm++;
        var f_m = calculateF(group, inverseMask);
        if (f_m > f0)
            R_m++;
        else if (f_m < f0)
            S_m++;
    }
    var n = Math.floor(pixelData.length / groupSize);
    var d0 = (Rm - Sm) / n;
    var d1 = (R_m - S_m) / n;
    // Homogeneity check for RS: discard if groups are too uniform or too noisy
    if (Math.abs(d0) < 0.001 && Math.abs(d1) < 0.001)
        return 0;
    var z = d1 - d0;
    if (Math.abs(z) < 0.001)
        return 0;
    var rate = Math.abs(d0 / z);
    return Math.max(0, Math.min(0.5, rate));
}
function analyzeBitCycle(pixelData) {
    var lsb = Array.from(pixelData, function (p) { return p & 1; });
    var maxLag = 32;
    var correlations = [];
    for (var lag = 1; lag <= maxLag; lag++) {
        var matches = 0;
        var trials = 0;
        for (var i = 0; i < lsb.length - lag; i++) {
            if (lsb[i] === lsb[i + lag])
                matches++;
            trials++;
        }
        correlations.push(matches / trials);
    }
    var maxCorr = 0, period = 0;
    for (var i = 0; i < correlations.length; i++) {
        if (correlations[i] > maxCorr) {
            maxCorr = correlations[i];
            period = i + 1;
        }
    }
    // Lowered threshold to 0.72 for higher sensitivity
    return { detected: maxCorr > 0.72, periodicity: period };
}
function analyzeNoiseFingerprint(pixelData) {
    if (pixelData.length < 4096)
        return { suspicious: false, varianceSpread: 0 };
    var blockSize = 1024;
    var variances = [];
    var _loop_1 = function (i) {
        var block = Array.from(pixelData.slice(i, i + blockSize));
        var lsb = block.map(function (p) { return p & 1; });
        var mean = lsb.reduce(function (a, b) { return a + b; }, 0) / lsb.length;
        var variance = lsb.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / lsb.length;
        variances.push(variance);
    };
    for (var i = 0; i < pixelData.length; i += blockSize) {
        _loop_1(i);
    }
    var max = Math.max.apply(Math, variances), min = Math.min.apply(Math, variances);
    var spread = max - min;
    // Lowered thresholds for higher sensitivity
    return { suspicious: spread > 0.18 && max > 0.22, varianceSpread: spread };
}
/**
 * Local Binary Pattern (LBP) variance analysis.
 * Detects unnatural texture smoothing or noise injection in local neighborhoods.
 */
function analyzeLBP(pixelData) {
    if (pixelData.length < 1000)
        return { detected: false, variance: 0 };
    var patterns = [];
    var width = Math.floor(Math.sqrt(pixelData.length));
    // Simple 1D LBP as proxy for 2D
    for (var i = 1; i < pixelData.length - 1; i++) {
        var pattern = 0;
        if (pixelData[i - 1] >= pixelData[i])
            pattern |= 1;
        if (pixelData[i + 1] >= pixelData[i])
            pattern |= 2;
        patterns.push(pattern);
    }
    var freq = new Array(4).fill(0);
    for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
        var p = patterns_1[_i];
        freq[p]++;
    }
    var mean = patterns.length / 4;
    var variance = freq.reduce(function (sum, f) { return sum + Math.pow(f - mean, 2); }, 0) / patterns.length;
    // Natural images have high LBP variance. Stego embedding makes LBP more uniform.
    return { detected: variance < 0.1, variance: variance };
}
/**
 * Attempts to extract a payload from LSBs.
 * Checks for valid UTF-8 strings or common file magic bytes.
 */
function extractLSBPayload(pixelData) {
    if (pixelData.length < 64)
        return undefined;
    var bits = [];
    for (var i = 0; i < Math.min(pixelData.length, 8000); i++) {
        bits.push(pixelData[i] & 1);
    }
    var bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (var i = 0; i < bytes.length; i++) {
        var byte = 0;
        for (var j = 0; j < 8; j++) {
            byte = (byte << 1) | bits[i * 8 + j];
        }
        bytes[i] = byte;
    }
    // Check for common magic bytes
    var magic = [
        { name: 'ZIP/DOCX', bytes: [0x50, 0x4B, 0x03, 0x04] },
        { name: 'PNG', bytes: [0x89, 0x50, 0x4E, 0x47] },
        { name: 'PDF', bytes: [0x25, 0x50, 0x44, 0x46] },
    ];
    for (var _i = 0, magic_1 = magic; _i < magic_1.length; _i++) {
        var m = magic_1[_i];
        var match = true;
        for (var i = 0; i < m.bytes.length; i++) {
            if (bytes[i] !== m.bytes[i]) {
                match = false;
                break;
            }
        }
        if (match)
            return "EXTRACTED_FILE_HEADER (".concat(m.name, ")");
    }
    // Check if it's a readable ASCII string
    var content = '';
    for (var _a = 0, bytes_1 = bytes; _a < bytes_1.length; _a++) {
        var b = bytes_1[_a];
        if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
            content += String.fromCharCode(b);
        }
        else if (b === 0 && content.length > 8) {
            // Found a null terminator after a decent string
            break;
        }
        else if (content.length > 8) {
            // Non-printable char after a decent string - probably end of payload
            break;
        }
        else {
            // Not a readable sequence yet
            content = '';
        }
    }
    if (content.length > 10) {
        return "EXTRACTED_TEXT_PAYLOAD: \"".concat(content.substring(0, 40)).concat(content.length > 40 ? '...' : '', "\"");
    }
    return undefined;
}
function analyzeStego(pixelData) {
    var prob = chiSquareAttack(pixelData);
    var rate_spa = samplePairAnalysis(pixelData);
    var rate_rs = rsAnalysis(pixelData);
    var bitCycle = analyzeBitCycle(pixelData);
    var noisePrint = analyzeNoiseFingerprint(pixelData);
    var lbp = analyzeLBP(pixelData);
    var payload = extractLSBPayload(pixelData);
    var reasons = [];
    if (prob > 0.95)
        reasons.push('chi_square_anomaly_detected');
    if (rate_spa > 0.15)
        reasons.push('lsb_embedding_detected (spa)');
    if (rate_rs > 0.15)
        reasons.push('lsb_embedding_detected (rs)');
    if (bitCycle.detected)
        reasons.push("periodic_lsb_pattern_detected (period: ".concat(bitCycle.periodicity, ")"));
    if (noisePrint.suspicious)
        reasons.push('noise_floor_inconsistency_detected');
    if (lbp.detected)
        reasons.push('lbp_texture_anomaly_detected');
    if (payload)
        reasons.push('VERIFIED_HIDDEN_PAYLOAD_EXTRACTED');
    var isSuspicious = (payload !== undefined) ||
        (prob > 0.99) ||
        (prob > 0.90 && (rate_rs > 0.10 || rate_spa > 0.10)) ||
        (rate_rs > 0.15 && rate_spa > 0.10) ||
        (rate_rs > 0.25) ||
        (rate_spa > 0.15 && prob > 0.75) ||
        (bitCycle.detected && prob > 0.80) ||
        lbp.detected ||
        noisePrint.suspicious;
    return {
        suspicious: isSuspicious,
        chiSquareProbability: prob,
        spaEmbeddingRate: rate_spa,
        rsEmbeddingRate: rate_rs,
        bitCycleAnomaly: bitCycle,
        noiseFingerprint: noisePrint,
        lbpAnomaly: lbp,
        verifiedPayload: payload,
        reasons: reasons
    };
}
