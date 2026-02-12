import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/store';
import { getDefaultLogPath } from '@/lib/mihomo';

export async function GET() {
  const settings = getSettings();
  return NextResponse.json({
    ...settings,
    defaultLogPath: getDefaultLogPath()
  });
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
