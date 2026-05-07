import { NextRequest, NextResponse } from 'next/server';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  performScan,
} from '@/lib/scan-service';

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;
const MAX_TRACKED_IPS = 10_000;

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

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (valid.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, valid);
    return true;
  }
  valid.push(now);
  rateLimitMap.set(ip, valid);
  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, valid);
    }
  }
  if (rateLimitMap.size > MAX_TRACKED_IPS) {
    const toDelete = rateLimitMap.size - MAX_TRACKED_IPS;
    let deleted = 0;
    for (const key of rateLimitMap.keys()) {
      if (deleted >= toDelete) break;
      rateLimitMap.delete(key);
      deleted++;
    }
  }
}, 60_000);

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const corsOrigin = getCorsOrigin(origin);

  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (isRateLimited(ip)) {
      const res = NextResponse.json(
        { error: 'Rate limit exceeded. Max 100 requests/minute.' },
        { status: 429 }
      );
      res.headers.set('Access-Control-Allow-Origin', corsOrigin);
      return res;
    }

    const contentType = req.headers.get('content-type') || '';
    let text = '';
    let imageBuffer: ArrayBuffer | null = null;
    let mimeType = 'text/plain';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      text =
        (formData.get('text') as string) ||
        (formData.get('textInput') as string) ||
        '';

      const imageFile =
        (formData.get('image') as File | null) ||
        (formData.get('imageInput') as File | null);

      if (imageFile && imageFile.size > 0) {
        if (imageFile.size > MAX_IMAGE_SIZE) {
          const res = NextResponse.json(
            { error: 'Image too large. Maximum 10MB.' },
            { status: 413 }
          );
          res.headers.set('Access-Control-Allow-Origin', corsOrigin);
          return res;
        }
        if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
          const res = NextResponse.json(
            { error: 'Unsupported image format. Allowed: PNG, JPEG, GIF, WebP, BMP.' },
            { status: 415 }
          );
          res.headers.set('Access-Control-Allow-Origin', corsOrigin);
          return res;
        }
        imageBuffer = await imageFile.arrayBuffer();
        mimeType = imageFile.type;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      text = body.text || body.textInput || '';
      mimeType = body.mimeType || 'text/plain';
    }

    if (!text && !imageBuffer) {
      const res = NextResponse.json({ error: 'No content provided' }, { status: 400 });
      res.headers.set('Access-Control-Allow-Origin', corsOrigin);
      return res;
    }

    const result = await performScan({ text, imageBuffer, mimeType });
    const res = NextResponse.json(result);
    res.headers.set('Access-Control-Allow-Origin', corsOrigin);
    res.headers.set('X-Content-Type-Options', 'nosniff');
    return res;
  } catch (error: any) {
    console.error('API Scan Error:', error);
    const res = NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
    res.headers.set('Access-Control-Allow-Origin', corsOrigin);
    return res;
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': getCorsOrigin(origin),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
