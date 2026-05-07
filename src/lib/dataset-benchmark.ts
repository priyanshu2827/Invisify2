/**
 * Sentinel Prime: Dataset Benchmark Harness
 * Tests the DetectionEngine against all 4 real-world labeled datasets.
 * Computes per-category accuracy, precision, recall, and false positive rate.
 */

import { DetectionEngine } from './detection-engine';
import * as fs from 'fs';
import * as path from 'path';

const MALICIOUS_THRESHOLD = 20; // score >= this = classified as MALICIOUS

interface BenchmarkResult {
    dataset: string;
    total: number;
    tp: number;
    tn: number;
    fp: number;
    fn: number;
    accuracy: number;
    precision: number;
    recall: number;
    fpRate: number;
    f1: number;
}

interface CategoryResult extends BenchmarkResult {
    category: string;
}

interface SampleResult {
    text: string;
    expectedLabel: string;
    actualScore: number;
    actualSeverity: string;
    classified: string;
    correct: boolean;
    reasons: string[];
}

// ─── Dataset Parsers ─────────────────────────────────────────

function parseStegTestSamples(filePath: string): Array<{ text: string; label: string; category: string }> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    return lines.map(line => ({
        text: line.trim(),
        label: 'MALICIOUS',  // All samples in this file are malicious
        category: guessCategory(line.trim())
    }));
}

function parseAdvancedDataset(filePath: string): Array<{ text: string; label: string; category: string }> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    return lines.map(line => {
        const parts = line.split(' | ');
        if (parts.length < 2) return { text: line.trim(), label: 'MALICIOUS', category: 'UNKNOWN' };
        const label = parts[0].trim();
        const text = parts.slice(1).join(' | ').trim();
        return {
            text,
            label: label === 'CLEAN' ? 'SAFE' : 'MALICIOUS',
            category: label === 'CLEAN' ? 'SAFE' : guessCategory(text)
        };
    });
}

function parseMulticategoryDataset(filePath: string): Array<{ text: string; label: string; category: string }> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    return lines.map(line => {
        const parts = line.split(' | ');
        if (parts.length < 2) return { text: line.trim(), label: 'MALICIOUS', category: 'UNKNOWN' };
        const category = parts[0].trim();
        const text = parts.slice(1).join(' | ').trim();
        return {
            text,
            label: category === 'SAFE' ? 'SAFE' : 'MALICIOUS',
            category
        };
    });
}

function parseProductionDataset(filePath: string): Array<{ text: string; label: string; category: string }> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    return lines.map(line => {
        const parts = line.split(' | ');
        if (parts.length < 2) return { text: line.trim(), label: 'MALICIOUS', category: 'UNKNOWN' };
        const label = parts[0].trim();
        const text = parts.slice(1).join(' | ').trim();
        return {
            text,
            label: label === 'SAFE' ? 'SAFE' : 'MALICIOUS',
            category: label === 'SAFE' ? 'SAFE' : guessCategory(text)
        };
    });
}

// ─── Category Guesser ────────────────────────────────────────

const EMOJI_REGEX_GLOBAL = /\p{Extended_Pictographic}/gu;
const ZERO_WIDTH_CHARS = new Set(['\u200B', '\u200C', '\u200D', '\uFEFF', '\u200E', '\u200F', '\u180E']);
const HOMOGLYPH_SAMPLES: Record<string, string> = {
    'а': 'a', 'с': 'c', 'е': 'e', 'о': 'o', 'р': 'p', 'х': 'x', 'у': 'y',
    'і': 'i', 'ј': 'j', 'ѕ': 's', '․': '.', '−': '-',
};

function guessCategory(text: string): string {
    // Check zero-width
    for (const ch of text) {
        if (ZERO_WIDTH_CHARS.has(ch)) return 'ZERO_WIDTH';
    }
    // Check homoglyphs
    for (const ch of text) {
        if (HOMOGLYPH_SAMPLES[ch]) return 'HOMOGLYPH';
    }
    // Check emoji-heavy
    const emojis = text.match(EMOJI_REGEX_GLOBAL) || [];
    const chars = [...text];
    if (emojis.length > 0 && emojis.length / chars.length > 0.5) return 'EMOJI_STEGO';
    // Check base64
    if (/^[A-Za-z0-9+/=]{12,}$/.test(text) && !text.includes(' ')) return 'BASE64';
    // Check high entropy random string
    if (/^[A-Za-z0-9!@#$%^&*()_+\-={}\[\]:;"'<>?,./\\|`~]{10,}$/.test(text) && !text.includes(' ')) return 'HIGH_ENTROPY';
    // Check phishing URL
    if (text.startsWith('http://') || text.startsWith('https://')) return 'PHISHING_URL';
    return 'UNKNOWN';
}

// ─── Benchmark Runner ────────────────────────────────────────

async function benchmarkDataset(
    name: string,
    samples: Array<{ text: string; label: string; category: string }>,
    verbose: boolean = false
): Promise<{ overall: BenchmarkResult; byCategory: CategoryResult[]; failures: SampleResult[] }> {

    let tp = 0, tn = 0, fp = 0, fn = 0;
    const catStats: Record<string, { tp: number; tn: number; fp: number; fn: number; total: number }> = {};
    const failures: SampleResult[] = [];

    const batchSize = 50;
    for (let batchStart = 0; batchStart < samples.length; batchStart += batchSize) {
        const batch = samples.slice(batchStart, batchStart + batchSize);
        const results = await Promise.all(batch.map(async (sample) => {
            const result = await DetectionEngine.analyze(sample.text, null, null);
            const classified = result.score >= MALICIOUS_THRESHOLD ? 'MALICIOUS' : 'SAFE';
            const correct = classified === sample.label;

            return { sample, result, classified, correct };
        }));

        for (const { sample, result, classified, correct } of results) {
            // Overall stats
            if (sample.label === 'MALICIOUS' && classified === 'MALICIOUS') tp++;
            else if (sample.label === 'SAFE' && classified === 'SAFE') tn++;
            else if (sample.label === 'SAFE' && classified === 'MALICIOUS') fp++;
            else if (sample.label === 'MALICIOUS' && classified === 'SAFE') fn++;

            // Per-category stats
            const cat = sample.category;
            if (!catStats[cat]) catStats[cat] = { tp: 0, tn: 0, fp: 0, fn: 0, total: 0 };
            catStats[cat].total++;
            if (sample.label === 'MALICIOUS' && classified === 'MALICIOUS') catStats[cat].tp++;
            else if (sample.label === 'SAFE' && classified === 'SAFE') catStats[cat].tn++;
            else if (sample.label === 'SAFE' && classified === 'MALICIOUS') catStats[cat].fp++;
            else if (sample.label === 'MALICIOUS' && classified === 'SAFE') catStats[cat].fn++;

            if (!correct) {
                failures.push({
                    text: sample.text.substring(0, 60) + (sample.text.length > 60 ? '...' : ''),
                    expectedLabel: sample.label,
                    actualScore: result.score,
                    actualSeverity: result.severity,
                    classified,
                    correct,
                    reasons: result.reasons
                });
            }
        }

        // Progress
        const progress = Math.min(batchStart + batchSize, samples.length);
        process.stdout.write(`\r  Processing: ${progress}/${samples.length}`);
    }
    console.log(''); // newline after progress

    const total = tp + tn + fp + fn;
    const accuracy = total > 0 ? (tp + tn) / total : 0;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const fpRate = (fp + tn) > 0 ? fp / (fp + tn) : 0;
    const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;

    const overall: BenchmarkResult = { dataset: name, total, tp, tn, fp, fn, accuracy, precision, recall, fpRate, f1 };

    const byCategory: CategoryResult[] = Object.entries(catStats).map(([cat, s]) => {
        const catTotal = s.tp + s.tn + s.fp + s.fn;
        const catAcc = catTotal > 0 ? (s.tp + s.tn) / catTotal : 0;
        const catPrec = (s.tp + s.fp) > 0 ? s.tp / (s.tp + s.fp) : 0;
        const catRec = (s.tp + s.fn) > 0 ? s.tp / (s.tp + s.fn) : 0;
        const catFpRate = (s.fp + s.tn) > 0 ? s.fp / (s.fp + s.tn) : 0;
        const catF1 = (catPrec + catRec) > 0 ? 2 * catPrec * catRec / (catPrec + catRec) : 0;
        return { dataset: name, category: cat, ...s, accuracy: catAcc, precision: catPrec, recall: catRec, fpRate: catFpRate, f1: catF1 };
    });

    return { overall, byCategory, failures };
}

// ─── Report Printer ──────────────────────────────────────────

function printReport(result: BenchmarkResult) {
    console.log(`  Accuracy:  ${(result.accuracy * 100).toFixed(2)}%`);
    console.log(`  Precision: ${(result.precision * 100).toFixed(2)}%`);
    console.log(`  Recall:    ${(result.recall * 100).toFixed(2)}%`);
    console.log(`  F1 Score:  ${(result.f1 * 100).toFixed(2)}%`);
    console.log(`  FP Rate:   ${(result.fpRate * 100).toFixed(2)}%`);
    console.log(`  [TP: ${result.tp} | TN: ${result.tn} | FP: ${result.fp} | FN: ${result.fn}]`);
}

function printCategoryReport(cats: CategoryResult[]) {
    const sorted = cats.sort((a, b) => b.total - a.total);
    console.log('\n  Per-Category Breakdown:');
    console.log('  ' + '-'.repeat(90));
    console.log(`  ${'Category'.padEnd(18)} ${'Total'.padStart(6)} ${'Acc'.padStart(8)} ${'Prec'.padStart(8)} ${'Recall'.padStart(8)} ${'F1'.padStart(8)} ${'FP Rate'.padStart(8)} ${'TP'.padStart(5)} ${'FN'.padStart(5)}`);
    console.log('  ' + '-'.repeat(90));
    for (const c of sorted) {
        console.log(`  ${c.category.padEnd(18)} ${String(c.total).padStart(6)} ${(c.accuracy * 100).toFixed(1).padStart(7)}% ${(c.precision * 100).toFixed(1).padStart(7)}% ${(c.recall * 100).toFixed(1).padStart(7)}% ${(c.f1 * 100).toFixed(1).padStart(7)}% ${(c.fpRate * 100).toFixed(1).padStart(7)}% ${String(c.tp).padStart(5)} ${String(c.fn).padStart(5)}`);
    }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
    console.log('\n🛰️  SENTINEL PRIME — DATASET BENCHMARK HARNESS\n');
    console.log('='.repeat(60));

    const baseDir = path.resolve(__dirname, '../../test sample');
    const datasets: Array<{ name: string; file: string; parser: (f: string) => Array<{ text: string; label: string; category: string }> }> = [
        { name: 'stego_test_samples', file: 'stego_test_samples.txt', parser: parseStegTestSamples },
        { name: 'advanced_stego_dataset', file: 'advanced_stego_dataset.txt', parser: parseAdvancedDataset },
        { name: 'multicategory_stego_dataset', file: 'multicategory_stego_dataset.txt', parser: parseMulticategoryDataset },
        { name: 'production_stego_dataset', file: 'production_stego_dataset.txt', parser: parseProductionDataset },
    ];

    const allResults: BenchmarkResult[] = [];
    let totalFN: SampleResult[] = [];

    for (const ds of datasets) {
        const filePath = path.join(baseDir, ds.file);
        if (!fs.existsSync(filePath)) {
            console.log(`\n⚠️  SKIP: ${ds.file} not found at ${filePath}`);
            continue;
        }

        console.log(`\n📊 Dataset: ${ds.name}`);
        console.log('-'.repeat(60));

        const samples = ds.parser(filePath);
        console.log(`  Loaded ${samples.length} samples`);

        const { overall, byCategory, failures } = await benchmarkDataset(ds.name, samples);
        allResults.push(overall);

        printReport(overall);
        printCategoryReport(byCategory);

        // Show sample false negatives (up to 10)
        const fnSamples = failures.filter(f => f.expectedLabel === 'MALICIOUS' && f.classified === 'SAFE');
        const fpSamples = failures.filter(f => f.expectedLabel === 'SAFE' && f.classified === 'MALICIOUS');

        if (fnSamples.length > 0) {
            console.log(`\n  ❌ Sample False Negatives (${fnSamples.length} total, showing up to 10):`);
            for (const f of fnSamples.slice(0, 10)) {
                console.log(`     Score=${f.actualScore} | "${f.text}"`);
            }
        }
        if (fpSamples.length > 0) {
            console.log(`\n  ⚠️  Sample False Positives (${fpSamples.length} total, showing up to 5):`);
            for (const f of fpSamples.slice(0, 5)) {
                console.log(`     Score=${f.actualScore} | "${f.text}" | Reasons: ${f.reasons.join(', ')}`);
            }
        }

        totalFN = totalFN.concat(fnSamples);
    }

    // ─── GRAND SUMMARY ───────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    console.log('🚀 GRAND SUMMARY');
    console.log('='.repeat(60));

    let grandTP = 0, grandTN = 0, grandFP = 0, grandFN = 0;
    for (const r of allResults) {
        grandTP += r.tp;
        grandTN += r.tn;
        grandFP += r.fp;
        grandFN += r.fn;
    }
    const grandTotal = grandTP + grandTN + grandFP + grandFN;
    const grandAcc = grandTotal > 0 ? (grandTP + grandTN) / grandTotal : 0;
    const grandPrec = (grandTP + grandFP) > 0 ? grandTP / (grandTP + grandFP) : 0;
    const grandRec = (grandTP + grandFN) > 0 ? grandTP / (grandTP + grandFN) : 0;
    const grandFPRate = (grandFP + grandTN) > 0 ? grandFP / (grandFP + grandTN) : 0;
    const grandF1 = (grandPrec + grandRec) > 0 ? 2 * grandPrec * grandRec / (grandPrec + grandRec) : 0;

    console.log(`\n  Total Samples:  ${grandTotal}`);
    console.log(`  Overall Accuracy:  ${(grandAcc * 100).toFixed(2)}%`);
    console.log(`  Overall Precision: ${(grandPrec * 100).toFixed(2)}%`);
    console.log(`  Overall Recall:    ${(grandRec * 100).toFixed(2)}%`);
    console.log(`  Overall F1 Score:  ${(grandF1 * 100).toFixed(2)}%`);
    console.log(`  Overall FP Rate:   ${(grandFPRate * 100).toFixed(2)}%`);
    console.log(`  [TP: ${grandTP} | TN: ${grandTN} | FP: ${grandFP} | FN: ${grandFN}]`);

    // FN Category breakdown
    const fnByCat: Record<string, number> = {};
    for (const f of totalFN) {
        const cat = guessCategory(f.text);
        fnByCat[cat] = (fnByCat[cat] || 0) + 1;
    }
    if (Object.keys(fnByCat).length > 0) {
        console.log('\n  False Negative Breakdown by Category:');
        for (const [cat, count] of Object.entries(fnByCat).sort((a, b) => b[1] - a[1])) {
            console.log(`    ${cat}: ${count}`);
        }
    }

    console.log('\n✅ Benchmark Complete.\n');
}

main().catch(console.error);
