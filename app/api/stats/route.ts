import osUtils from 'os-utils';
import os from 'os';
import { getTrafficHistory } from '@/lib/mihomo';
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

  // 内核内存 (从 Mihomo API 获取)
  let kernelMem = 0;
  try {
    const ports = loadEffectivePorts();
    const settings = getSettings();
    const initial = getInitialConfig();
    const secret = process.env.MIHOMO_SECRET || settings.secret || initial.secret || "";

    const controllerRes = await fetch(`http://127.0.0.1:${ports.controller_port}/memory`, {
      headers: secret ? { 'Authorization': `Bearer ${secret}` } : {},
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(1000) // 1秒超时
    });
    
    if (controllerRes.ok) {
      const data = await controllerRes.json();
      kernelMem = (data.inuse || 0) / 1024 / 1024; // 转为 MB
    }
  } catch (e) {
    // 内核未启动或无法连接
  }

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
