import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'config', 'config.yaml');
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ success: false, error: 'Config file not found' }, { status: 404 });
    }
    const content = fs.readFileSync(configPath, 'utf8');
    return NextResponse.json({ success: true, content });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
