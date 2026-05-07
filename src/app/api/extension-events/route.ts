import { NextRequest, NextResponse } from 'next/server';
import { addExtensionEvent, listExtensionEvents } from '@/lib/extension-events-store';
import type { ExtensionEvent } from '@/lib/soc-types';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim());

function getCorsOrigin(reqOrigin: string | null): string {
  if (!reqOrigin) return ALLOWED_ORIGINS[0];
  if (ALLOWED_ORIGINS.includes('*')) return '*';
  if (ALLOWED_ORIGINS.includes(reqOrigin)) return reqOrigin;
  if (reqOrigin.startsWith('chrome-extension://')) return reqOrigin;
  return ALLOWED_ORIGINS[0];
}

function withCors(res: NextResponse, origin: string | null) {
  res.headers.set('Access-Control-Allow-Origin', getCorsOrigin(origin));
  return res;
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const limitRaw = req.nextUrl.searchParams.get('limit');
  const limit = limitRaw ? Number(limitRaw) : 100;
  const events = listExtensionEvents(Number.isFinite(limit) ? limit : 100);
  return withCors(NextResponse.json({ events }), origin);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  try {
    const body = (await req.json()) as Partial<ExtensionEvent>;
    if (!body) {
      return withCors(NextResponse.json({ error: 'Invalid payload' }, { status: 400 }), origin);
    }

    const event = addExtensionEvent({
      emailSubject: String(body.emailSubject || 'Unknown Subject'),
      sender: String(body.sender || 'unknown@sender'),
      threatType: String(body.threatType || 'None'),
      score: Number(body.score || 0),
      severity: (body.severity as ExtensionEvent['severity']) || 'Safe',
      action: (body.action as ExtensionEvent['action']) || 'allowed',
      fingerprint: String(body.fingerprint || ''),
      source: (body.source as ExtensionEvent['source']) || 'inbound',
      timestamp: body.timestamp,
      id: body.id,
    });

    return withCors(NextResponse.json({ ok: true, event }), origin);
  } catch (error: any) {
    return withCors(
      NextResponse.json({ error: error?.message || 'Failed to store extension event' }, { status: 500 }),
      origin
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': getCorsOrigin(origin),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
