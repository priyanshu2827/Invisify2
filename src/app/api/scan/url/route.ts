import { NextRequest, NextResponse } from 'next/server';
import { detect_homoglyph_links } from '@/lib/unicode';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = typeof body.url === 'string' ? body.url : '';

    if (!url.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const result = detect_homoglyph_links(url);
    return NextResponse.json({
      success: true,
      isSuspicious: result.detected,
      details: result.suspiciousLinks.map((link) => `Possible homoglyph domain: ${link.domain} -> ${link.decoded}`),
      suspiciousLinks: result.suspiciousLinks,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to scan URL' },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
