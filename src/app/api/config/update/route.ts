import { updateConfigFile } from '@/lib/mihomo';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const updates = await req.json();
    const result = updateConfigFile(updates);
    
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Configuration persisted successfully' });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}
