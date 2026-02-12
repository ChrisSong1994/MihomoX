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
  const usedMem = totalMem - freeMem;
  const memUsage = (usedMem / totalMem) * 100;

  // Get current traffic from history
  const history = getTrafficHistory();
  const currentTraffic = history.length > 0 ? history[history.length - 1] : { up: 0, down: 0 };

  return Response.json({
    cpu: (cpuUsage * 100).toFixed(2),
    memory: {
      percent: memUsage.toFixed(2),
      used: usedMem.toFixed(0),
      total: totalMem.toFixed(0)
    },
    network: {
      up: currentTraffic.up,
      down: currentTraffic.down
    },
    uptime: osUtils.sysUptime(),
    platform: process.platform,
  });
}
