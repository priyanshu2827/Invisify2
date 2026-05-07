import { POST, OPTIONS } from '../src/app/api/scan/route';
import { NextRequest } from 'next/server';

jest.mock('../src/lib/scan-service', () => {
    return {
        ALLOWED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'],
        MAX_IMAGE_SIZE: 10 * 1024 * 1024,
        performScan: jest.fn().mockImplementation(({ text }) => {
            if (text && text.includes('\u200B')) {
                return Promise.resolve({
                    id: 'scan-1',
                    timestamp: new Date().toISOString(),
                    type: 'Text',
                    content_type: 'Text',
                    score: 30,
                    confidence: 0.8,
                    summary: 'Suspicious text',
                    severity: 'Medium',
                    findings: '{}',
                    reasons: ['zero_width_characters_detected'],
                });
            }
            return Promise.resolve({
                id: 'scan-2',
                timestamp: new Date().toISOString(),
                type: 'Text',
                content_type: 'Text',
                score: 0,
                confidence: 0.5,
                summary: 'Safe text',
                severity: 'Safe',
                findings: '{}',
                reasons: [],
            });
        }),
    };
});

describe('POST /api/scan', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns 400 for empty body', async () => {
        const req = new NextRequest('http://localhost:3000/api/scan', {
            method: 'POST',
            body: '{}',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Pass the request to the Next.js route handler
        const res = await POST(req);
        
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('No content provided');
    });

    test('returns 413 for oversized image', async () => {
        const formData = new FormData();
        const bigBuffer = new ArrayBuffer(11 * 1024 * 1024); // 11MB
        const blob = new Blob([bigBuffer], { type: 'image/png' });
        formData.append('image', blob, 'big.png');

        const req = new NextRequest('http://localhost:3000/api/scan', {
            method: 'POST',
            body: formData,
        });

        const res = await POST(req);

        expect(res.status).toBe(413);
        const data = await res.json();
        expect(data.error).toContain('too large');
    });

    test('returns 415 for unsupported image format', async () => {
        const formData = new FormData();
        const buffer = new ArrayBuffer(1024);
        const blob = new Blob([buffer], { type: 'application/pdf' });
        formData.append('image', blob, 'doc.pdf');

        const req = new NextRequest('http://localhost:3000/api/scan', {
            method: 'POST',
            body: formData,
        });

        const res = await POST(req);

        expect(res.status).toBe(415);
        const data = await res.json();
        expect(data.error).toContain('Unsupported image format');
    });

    test('detects zero-width in text payload', async () => {
        const formData = new FormData();
        formData.append('text', 'hello\u200Bworld');

        const req = new NextRequest('http://localhost:3000/api/scan', {
            method: 'POST',
            body: formData,
        });

        const res = await POST(req);
        
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.score).toBeGreaterThan(0);
        expect(data.reasons).toContain('zero_width_characters_detected');
    });

    test('returns 429 when rate limit exceeded', async () => {
        // Pre-fill rate limit map
        const ip = '192.168.1.1';
        
        // Mock enough requests
        const requests = [];
        for(let i=0; i<101; i++) {
            const req = new NextRequest('http://localhost:3000/api/scan', {
                method: 'POST',
                headers: {
                    'x-forwarded-for': ip,
                },
                body: new FormData()
            });
            requests.push(POST(req));
        }

        // Run concurrently or sequentially
        const responses = [];
        for (const req of requests) {
            responses.push(await req);
        }

        // The 101st request should be a 429
        expect(responses[100].status).toBe(429);
    });

    test('OPTIONS request returns correct CORS headers', async () => {
        const req = new NextRequest('http://localhost:3000/api/scan', {
            method: 'OPTIONS',
            headers: {
                'origin': 'chrome-extension://abcdefghijklmnop',
            }
        });
        const res = await OPTIONS(req);
        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('chrome-extension://abcdefghijklmnop');
    });
});
