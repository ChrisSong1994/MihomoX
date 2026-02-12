import { startKernel, stopKernel, getKernelStatus } from '@/lib/mihomo';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function GET() {
  const isRunning = getKernelStatus();
  let kernelConfig = null;
  let localConfig = null;

  // 1. Load local config from file first as baseline
  try {
    const configPath = path.join(process.cwd(), 'config', 'config.yaml');
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      localConfig = yaml.load(fileContent);
    }
  } catch (e) {
    console.error('Failed to read local config:', e);
  }

  // 2. Try to get current config from kernel if running
  if (isRunning) {
    try {
      const res = await fetch('http://127.0.0.1:9099/configs');
      if (res.ok) {
        kernelConfig = await res.json();
      }
    } catch (e) {
      // Kernel API might not be ready yet
    }
  }

  // 3. Merge configs: kernel config takes precedence if available
  const finalConfig = kernelConfig 
    ? { ...(localConfig as any), ...(kernelConfig as any) } 
    : localConfig;

  // 4. Ensure mixed-port is available in response for UI
  if (finalConfig && !finalConfig['mixed-port'] && finalConfig['port']) {
    finalConfig['mixed-port'] = finalConfig['port'];
  }

  return Response.json({ running: isRunning, config: finalConfig });
}

export async function POST(req: Request) {
  const { action } = await req.json();
  
  if (action === 'start') {
    startKernel();
    return Response.json({ success: true, message: 'Kernel starting' });
  } else if (action === 'stop') {
    stopKernel();
    return Response.json({ success: true, message: 'Kernel stopping' });
  }
  
  return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
}
