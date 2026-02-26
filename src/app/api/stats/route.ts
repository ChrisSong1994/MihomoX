import osUtils from 'os-utils';
import os from 'os';
import { getTrafficHistory, getKernelMemoryUsage } from '@/lib/mihomo';
import { loadEffectivePorts, getSettings, getInitialConfig } from '@/lib/store';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  if (type === 'history') {
    return Response.json(getTrafficHistory());
  }

  const cpuUsage = await new Promise<number>((resolve) => {
    osUtils.cpuUsage((v) => resolve(v));
  });
  
  // 系统内存 (单位: MB)
  const totalMem = os.totalmem() / 1024 / 1024;
  const freeMem = os.freemem() / 1024 / 1024;
  const usedMem = totalMem - freeMem;
  const memUsage = (usedMem / totalMem) * 100;

  // 内核内存 (直接从操作系统获取进程内存占用)
  const kernelMem = getKernelMemoryUsage();

  // 从历史记录中获取当前流量
  const history = getTrafficHistory();
  const currentTraffic = history.length > 0 ? history[history.length - 1] : { up: 0, down: 0 };

  return Response.json({
    cpu: (cpuUsage * 100).toFixed(2),
    memory: {
      percent: memUsage.toFixed(2),
      used: usedMem.toFixed(0),
      total: totalMem.toFixed(0),
      kernel: kernelMem.toFixed(2)
    },
    network: {
      up: currentTraffic.up,
      down: currentTraffic.down
    },
    uptime: osUtils.sysUptime(),
    platform: process.platform,
  });
}
