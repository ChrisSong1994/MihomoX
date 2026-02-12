import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/store';

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = saveSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
