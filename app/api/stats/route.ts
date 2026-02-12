import osUtils from 'os-utils';
import { getTrafficHistory } from '@/lib/mihomo';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  if (type === 'history') {
    return Response.json(getTrafficHistory());
  }

  const cpuUsage = await new Promise<number>((resolve) => {
    osUtils.cpuUsage((v) => resolve(v));
  });
  
  const freeMem = osUtils.freemem(); // MB
  const totalMem = osUtils.totalmem(); // MB
  const memUsage = (1 - freeMem / totalMem) * 100;

  return Response.json({
    cpu: (cpuUsage * 100).toFixed(2),
    memory: memUsage.toFixed(2),
    uptime: osUtils.sysUptime(),
    platform: process.platform,
  });
}
