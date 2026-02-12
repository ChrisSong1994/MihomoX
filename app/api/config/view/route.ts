import { NextResponse } from 'next/server';
import fs from 'fs';
import { getPaths } from '@/lib/paths';

export async function GET() {
  try {
    const paths = getPaths();
    const configPath = paths.mihomoConfig;
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ success: false, error: 'Config file not found' }, { status: 404 });
    }
    const content = fs.readFileSync(configPath, 'utf8');
    return NextResponse.json({ success: true, content });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
