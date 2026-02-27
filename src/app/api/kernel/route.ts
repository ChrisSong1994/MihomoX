import { startKernel, stopKernel, getKernelStatus, getKernelMemoryUsage } from '@/lib/mihomo';
import { getKernelLogs } from '@/lib/mihomo';
import { getTrafficHistory } from '@/lib/mihomo';
import fs from 'fs';
import yaml from 'js-yaml';
import { getPaths, ensureDirectories } from '@/lib/paths';
import { handleApiError, validateBody } from '@/lib/api-utils';
import { kernelActionSchema } from '@/server/types';
import type { MihomoConfig, TrafficData } from '@/server/types';

/**
 * 获取内核状态和配置
 */
export async function GET() {
  try {
    const paths = getPaths();
    ensureDirectories();

    const isRunning = getKernelStatus();
    let kernelConfig: MihomoConfig | null = null;
    let localConfig: MihomoConfig | null = null;

    // 1. 从本地文件加载配置
    try {
      const configPath = paths.mihomoConfig;
      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        localConfig = yaml.load(fileContent) as MihomoConfig;
      }
    } catch (e) {
      console.error('Failed to read local config:', e);
    }

    // 2. 如果内核运行，尝试从内核获取当前配置
    if (isRunning) {
      try {
        const { getSettings } = require('@/lib/store');
        const settings = getSettings();
        const controllerPort = settings.controller_port || 9099;
        const res = await fetch(`http://127.0.0.1:${controllerPort}/configs`);
        if (res.ok) {
          kernelConfig = await res.json();
        }
      } catch {
        // 内核 API 可能尚未就绪
      }
    }

    // 3. 合并配置
    const finalConfig = kernelConfig 
      ? { ...localConfig, ...kernelConfig } 
      : localConfig;

    // 4. 确保响应中包含 mixed-port
    if (finalConfig && !finalConfig['mixed-port'] && finalConfig['port']) {
      finalConfig['mixed-port'] = finalConfig['port'];
    }

    // 5. 获取流量数据（如果运行中）
    let trafficData: TrafficData[] = [];
    if (isRunning) {
      trafficData = getTrafficHistory();
    }

    // 6. 获取日志（如果运行中）
    let logs: string[] = [];
    if (isRunning) {
      logs = getKernelLogs().slice(-50); // 最近 50 条日志
    }

    return Response.json({
      running: isRunning,
      config: finalConfig,
      traffic: trafficData,
      logs,
      memory: isRunning ? getKernelMemoryUsage() : 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 内核操作：启动/停止
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 验证输入
    const validation = validateBody(kernelActionSchema, body);
    if (!validation.success) {
      return handleApiError(validation.error);
    }

    const { action } = validation.data;
    const currentStatus = getKernelStatus();

    if (action === 'start') {
      if (currentStatus) {
        return Response.json({ 
          success: false, 
          error: 'Kernel is already running' 
        }, { status: 400 });
      }
      
      startKernel();
      
      // 等待内核启动
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return Response.json({ 
        success: true, 
        message: 'Kernel starting',
        running: getKernelStatus()
      });
    } 
    
    if (action === 'stop') {
      if (!currentStatus) {
        return Response.json({ 
          success: false, 
          error: 'Kernel is not running' 
        }, { status: 400 });
      }
      
      stopKernel();
      
      return Response.json({ 
        success: true, 
        message: 'Kernel stopping',
        running: getKernelStatus()
      });
    }
    
    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
