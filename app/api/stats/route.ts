import osUtils from 'os-utils';

export async function GET() {
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
