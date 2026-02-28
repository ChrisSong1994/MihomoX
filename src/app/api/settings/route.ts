import { NextResponse } from 'next/server';
import { getSettings, saveSettings, hotUpdatePorts } from '@/lib/store';
import { generateFullConfig, getKernelStatus, updateConfigFile } from '@/lib/mihomo';
import { handleApiError, validateBody } from '@/lib/api-utils';
import { appSettingsSchema, portUpdateSchema } from '@/server/types';

/**
 * 获取当前设置
 */
export async function GET() {
  try {
    const settings = getSettings();
    // 安全：不返回 secret
    const safeSettings = { ...settings };
    delete (safeSettings as Record<string, unknown>).secret;
    
    return NextResponse.json({
      success: true,
      data: safeSettings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 更新设置
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    
    // 验证输入
    const validation = validateBody(appSettingsSchema, body);
    if (!validation.success) {
      return handleApiError(validation.error);
    }

    const settings = saveSettings(validation.data);
    
    // 如果端口有变化，尝试热更新
    if (body.mixed_port || body.controller_port) {
      await hotUpdatePorts({
        mixed_port: body.mixed_port,
        controller_port: body.controller_port,
      });
    }
    
    // 重新生成配置文件
    generateFullConfig();
    
    // 返回更新后的设置
    const safeSettings = { ...settings };
    delete (safeSettings as Record<string, unknown>).secret;
    
    return NextResponse.json({
      success: true,
      data: safeSettings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 快速端口更新（专用端点）
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    
    // 验证输入
    const validation = validateBody(portUpdateSchema, body);
    if (!validation.success) {
      return handleApiError(validation.error);
    }

    const { mixed_port, controller_port } = validation.data;
    const settings = getSettings();
    const isRunning = getKernelStatus();
    
    // 端口唯一性检查
    if (mixed_port && controller_port && mixed_port === controller_port) {
      return NextResponse.json(
        { success: false, error: 'Ports must be different' },
        { status: 400 }
      );
    }

    // 如果内核正在运行，尝试热更新
    if (isRunning) {
      const controllerPort = settings.controller_port || 9099;
      
      try {
        // 尝试通过 API 热更新混合端口
        if (mixed_port) {
          await fetch(`http://127.0.0.1:${controllerPort}/configs`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 'mixed-port': mixed_port }),
          });
        }
      } catch (e) {
        console.warn('[Settings] Hot update failed, config will apply after restart');
      }
    }

    // 保存设置
    const updated = await hotUpdatePorts({
      mixed_port,
      controller_port,
    });

    // 重新生成配置
    generateFullConfig();

    return NextResponse.json({
      success: true,
      message: isRunning 
        ? 'Port updated. Note: Controller port change requires kernel restart.' 
        : 'Ports updated successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
