import { getKernelLogs } from '@/lib/mihomo';

/**
 * Kernel Logs API Route
 * Used by the frontend to fetch stdout/stderr output from the Mihomo process
 */
export async function GET() {
  try {
    const logs = getKernelLogs();
    return Response.json({ success: true, logs });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
