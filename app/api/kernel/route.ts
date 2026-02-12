import { startKernel, stopKernel, getKernelStatus } from '@/lib/mihomo';

export async function GET() {
  const isRunning = getKernelStatus();
  let config = null;

  if (isRunning) {
    try {
      // Try to get current config from kernel
      const res = await fetch('http://127.0.0.1:9099/configs');
      if (res.ok) {
        config = await res.json();
      }
    } catch (e) {
      // Kernel API might not be ready yet
    }
  }

  return Response.json({ running: isRunning, config });
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
