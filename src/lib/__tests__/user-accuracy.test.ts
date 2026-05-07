import { DetectionEngine } from '../detection-engine';
import * as fs from 'fs';
import * as path from 'path';

describe('Sentinel Prime User Dataset Accuracy Benchmark', () => {
    const filePath = path.join(process.cwd(), 'test sample', 'advanced_stego_dataset.txt');
    
    if (!fs.existsSync(filePath)) {
        console.warn('Dataset file not found, skipping benchmark.');
        return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.includes('|'));

    test(`Should achieve >90% accuracy on advanced stego dataset (${lines.length} samples)`, async () => {
        let tp = 0, fp = 0, tn = 0, fn = 0;

        for (const line of lines) {
            const [label, data] = line.split('|').map(s => s.trim());
            const result = await DetectionEngine.analyze(data, null, null);
            
            // Threshold >= 40 is malicious (Medium severity+)
            const isMalicious = result.score >= 40;

            if (label === 'MALICIOUS') {
                if (isMalicious) tp++; else fn++;
            } else {
                if (isMalicious) fp++; else tn++;
            }
        }

        const accuracy = (tp + tn) / (tp + tn + fp + fn);
        const precision = tp / (tp + fp) || 0;
        const recall = tp / (tp + fn) || 0;

        console.log(`\n--- BENCHMARK RESULTS ---`);
        console.log(`Total Samples: ${lines.length}`);
        console.log(`TP: ${tp}, TN: ${tn}, FP: ${fp}, FN: ${fn}`);
        console.log(`Accuracy: ${(accuracy * 100).toFixed(2)}%`);
        console.log(`Precision: ${(precision * 100).toFixed(2)}%`);
        console.log(`Recall: ${(recall * 100).toFixed(2)}%`);

        expect(accuracy).toBeGreaterThanOrEqual(0.90);
    }, 60000); // 60s timeout for large dataset
});
