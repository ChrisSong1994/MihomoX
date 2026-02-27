import { getSettings, getInitialConfig } from '@/lib/store';
import { getKernelStatus } from '@/lib/mihomo';

/**
 * 获取配置信息（安全版本，不返回 secret）
 */
export async function GET() {
  const settings = getSettings();
  const initialResult = getInitialConfig();
  const initial = initialResult.success ? initialResult.data : {};
  const isRunning = getKernelStatus();

  // 安全：只返回必要的配置信息，不返回 secret
  return Response.json({
    hostname: '127.0.0.1',
    port: settings.controller_port || (initial.controller_port as number) || 9099,
    // 注意：secret 不应该返回给前端
    // 如果需要让前端知道是否配置了 secret，可以返回布尔值
    hasSecret: !!(settings.secret || (initial.secret as string) || process.env.MIHOMO_SECRET),
  });
}
