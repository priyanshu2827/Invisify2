import { NextRequest, NextResponse } from 'next/server';
import { performScan } from '@/lib/scan-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text : '';

    if (!text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const scan = await performScan({ text, mimeType: 'text/plain' });
    return NextResponse.json({
      success: true,
      riskLevel: scan.score,
      severity: scan.severity,
      findings: scan.reasons ?? [],
      details: scan,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to scan text' },
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
