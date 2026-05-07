import { deriveActivityEvents, getDetectionTypeDistribution, getTimelineData } from '../src/lib/soc-analytics';
import type { ScanResult } from '../src/lib/types';

const scans: ScanResult[] = [
  {
    id: 's1',
    timestamp: '2026-04-25T10:00:00.000Z',
    content_type: 'Text',
    severity: 'High',
    score: 72,
    summary: 'Zero-width and homoglyph found',
    findings: JSON.stringify({
      text: {
        zero_width: { present: true },
        homoglyphs: { present: true },
      },
    }),
    reasons: ['zero_width_characters_detected'],
  },
  {
    id: 's2',
    timestamp: '2026-04-25T11:00:00.000Z',
    content_type: 'Image',
    severity: 'Safe',
    score: 4,
    summary: 'Clean image',
    findings: JSON.stringify({}),
    reasons: [],
  },
];

describe('soc analytics', () => {
  test('builds detection type distribution from normalized findings', () => {
    const data = getDetectionTypeDistribution(scans);
    const zeroWidth = data.find((item) => item.name === 'Zero-Width');
    const homoglyph = data.find((item) => item.name === 'Homoglyph');
    expect(zeroWidth?.value).toBe(1);
    expect(homoglyph?.value).toBe(1);
  });

  test('builds timeline in ascending order', () => {
    const data = getTimelineData(scans);
    expect(data[0].score).toBe(72);
    expect(data[1].score).toBe(4);
  });

  test('derives live activity events from real scans', () => {
    const events = deriveActivityEvents(scans, 10);
    expect(events.length).toBe(2);
    expect(events[0].id).toBe('evt-s2');
    expect(events[1].type).toBe('zero_width');
  });
});
