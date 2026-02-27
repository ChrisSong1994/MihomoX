import { NextResponse } from 'next/server';
import { getKernelStatus, getKernelMemoryUsage } from '@/lib/mihomo';
import { getSettings } from '@/lib/store';

/**
 * 健康检查端点
 * 用于服务监控和负载均衡器探测
 */

// 基础健康检查
export async function GET() {
  try {
    const kernelRunning = getKernelStatus();
    const memoryUsage = getKernelMemoryUsage();
    const settings = getSettings();
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      kernel: {
        running: kernelRunning,
        memory: memoryUsage > 0 ? `${memoryUsage.toFixed(1)} MB` : 'N/A',
      },
      ports: {
        controller: settings.controller_port || 9099,
        mixed: settings.mixed_port || 7890,
      },
      version: process.env.APP_VERSION || '1.0.0',
    };

    return NextResponse.json(health, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'X-Health-Check': 'ok',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

// 详细健康检查（可选）
export async function POST() {
  try {
    const kernelRunning = getKernelStatus();
    const memoryUsage = getKernelMemoryUsage();
    const settings = getSettings();
    
    // 进行更详细的检查
    const detailedHealth = {
      status: kernelRunning ? 'healthy' : 'degraded',
      checks: {
        kernel: kernelRunning ? 'pass' : 'fail',
        memory: memoryUsage > 0 ? 'pass' : 'warn',
        ports: settings.controller_port ? 'pass' : 'warn',
      },
      metrics: {
        uptime: process.uptime(),
        memoryUsage: `${memoryUsage.toFixed(1)} MB`,
        cpuUsage: process.cpuUsage(),
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    const statusCode = detailedHealth.status === 'healthy' ? 200 : 206;
    
    return NextResponse.json(detailedHealth, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Health check failed' },
      { status: 503 }
    );
  }
}
