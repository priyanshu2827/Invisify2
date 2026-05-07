import { GET, OPTIONS, POST } from '../src/app/api/extension-events/route';
import { NextRequest } from 'next/server';

describe('extension events api', () => {
  test('stores event via POST and returns it via GET', async () => {
    const postReq = new NextRequest('http://localhost:3000/api/extension-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'evt-test-1',
        timestamp: new Date().toISOString(),
        emailSubject: 'Test Subject',
        sender: 'attacker@example.com',
        threatType: 'Homoglyph Phishing',
        score: 82,
        severity: 'High',
        action: 'blocked',
        fingerprint: 'abc123',
        source: 'inbound',
      }),
    });

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(200);

    const getReq = new NextRequest('http://localhost:3000/api/extension-events?limit=20', {
      method: 'GET',
    });
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(200);
    const data = await getRes.json();
    expect(Array.isArray(data.events)).toBe(true);
    expect(data.events.some((event: any) => event.id === 'evt-test-1')).toBe(true);
  });

  test('supports CORS preflight', async () => {
    const req = new NextRequest('http://localhost:3000/api/extension-events', {
      method: 'OPTIONS',
      headers: { origin: 'chrome-extension://abcdefghijklmnop' },
    });
    const res = await OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('chrome-extension://abcdefghijklmnop');
  });
});
