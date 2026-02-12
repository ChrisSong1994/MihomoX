import { startKernel, stopKernel, getKernelStatus } from '@/lib/mihomo';
import fs from 'fs';
import yaml from 'js-yaml';
import { getPaths, ensureDirectories } from '@/lib/paths';

export async function GET() {
  const paths = getPaths();
  // 确保目录存在
  ensureDirectories();

  const isRunning = getKernelStatus();
  let kernelConfig = null;
  let localConfig = null;

  // 1. 先从本地文件加载配置作为基础
  try {
    const configPath = paths.mihomoConfig;
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      localConfig = yaml.load(fileContent);
    }
  } catch (e) {
    console.error('Failed to read local config:', e);
  }

  // 2. 如果内核运行，尝试从内核获取当前配置
  if (isRunning) {
    try {
      const res = await fetch('http://127.0.0.1:9099/configs');
      if (res.ok) {
        kernelConfig = await res.json();
      }
    } catch (e) {
      // 内核 API 可能尚未就绪
    }
  }

  // 3. 合并配置：若存在内核配置，则以其为准
  const finalConfig = kernelConfig 
    ? { ...(localConfig as any), ...(kernelConfig as any) } 
    : localConfig;

  // 4. 确保响应中包含 mixed-port 以供前端 UI 使用
  if (finalConfig && !finalConfig['mixed-port'] && finalConfig['port']) {
    finalConfig['mixed-port'] = finalConfig['port'];
  }

  return Response.json({ running: isRunning, config: finalConfig });
}

export async function POST(req: Request) {
  const { action } = await req.json();
  
  if (action === 'start') {
    startKernel();
    return Response.json({ success: true, message: 'Kernel starting' });
  } else if (action === 'stop') {
    stopKernel();
    return Response.json({ success: true, message: 'Kernel stopping' });
  }
  
  return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
}
