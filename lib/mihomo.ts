import { spawn, ChildProcess, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { getSettings } from './store';

/**
 * 更新并持久化写入 config.yaml 配置
 */
export const updateConfigFile = (updates: Record<string, any>) => {
  const configPath = path.join(process.cwd(), 'config', 'config.yaml');
  try {
    let config: any = {};
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      config = yaml.load(fileContent) || {};
    }

    // 深度合并或简单覆盖
    const newConfig = { ...config, ...updates };
    
    fs.writeFileSync(configPath, yaml.dump(newConfig), 'utf8');
    return { success: true };
  } catch (e: any) {
    console.error('[Mihomo] Failed to save config file:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Mihomo 内核管理类
 * 负责二进制启动、关闭、状态检测以及日志流管理
 */

let mihomoProcess: ChildProcess | null = null;
let trafficInterval: NodeJS.Timeout | null = null;
const PID_FILE = path.join(process.cwd(), 'config', 'mihomo.pid');

/**
 * 根据 PID 检查进程是否正在运行
 */
const isProcessRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * 将 PID 保存到本地文件
 */
const savePid = (pid: number) => {
  try {
    fs.writeFileSync(PID_FILE, pid.toString(), 'utf8');
  } catch (e) {
    console.error('[Mihomo] Failed to save PID file:', e);
  }
};

/**
 * 移除 PID 文件
 */
const clearPid = () => {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch (e) {
    // 若文件不存在则忽略错误
  }
};

/**
 * 从文件中读取 PID
 */
const getSavedPid = (): number | null => {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pidStr = fs.readFileSync(PID_FILE, 'utf8').trim();
      return parseInt(pidStr, 10);
    }
  } catch (e) {
    console.error('[Mihomo] Failed to read PID file:', e);
  }
  return null;
};
// 存储近期日志，供前端调试视图使用
let kernelLogs: string[] = [];
const MAX_LOG_LINES = 1000;

// 存储流量历史（最近 1 小时，每 2 秒记录一次，共约 1800 条）
let trafficHistory: Array<{ time: number; up: number; down: number }> = [];
const MAX_TRAFFIC_POINTS = 1800;

/**
 * 更新流量历史
 */
const updateTrafficHistory = (up: number, down: number) => {
  const now = Date.now();
  trafficHistory.push({ time: now, up, down });
  if (trafficHistory.length > MAX_TRAFFIC_POINTS) {
    trafficHistory.shift();
  }
};

/**
 * 获取流量历史
 */
export const getTrafficHistory = () => {
  return trafficHistory;
};

/**
 * 启动流量监控
 */
const startTrafficMonitor = async () => {
  if (trafficInterval) return;
  
  console.log('[Mihomo] Starting traffic monitor...');
  
  const controller = new AbortController();
  
  const runMonitor = async () => {
    try {
      const res = await fetch('http://127.0.0.1:9099/traffic', {
        signal: controller.signal
      });
      
      const reader = res.body?.getReader();
      if (!reader) {
        console.error('[Mihomo] Failed to get traffic reader');
        return;
      }

      console.log('[Mihomo] Traffic monitor connected');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        const chunks = text.split('\n');
        
        for (const chunk of chunks) {
          if (!chunk.trim()) continue;
          try {
            // 部分版本可能会在前缀添加 "data: "
            const jsonStr = chunk.startsWith('data: ') ? chunk.slice(6) : chunk;
            const data = JSON.parse(jsonStr);
            updateTrafficHistory(data.up, data.down);
          } catch (e) {
            // 跳过无效的 JSON 或不完整数据片段
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      
      console.error('[Mihomo] Traffic monitor error:', e.message);
      // 5 秒后重试
      trafficInterval = setTimeout(() => {
        trafficInterval = null;
        if (getKernelStatus()) runMonitor();
      }, 5000);
    }
  };

  runMonitor();
  
  // 设置标志避免重复定时器（当前采用递归/定时器方式）
  trafficInterval = true as any; 
};

/**
 * 根据当前平台获取匹配的二进制文件名
 * 支持 Windows（.exe）、macOS、Linux 及其 amd64/arm64 架构
 */
const getBinaryName = () => {
  const platform = process.platform;
  const arch = process.arch === 'x64' ? 'amd64' : process.arch;
  let name = `mihomo-${platform}-${arch}`;

  if (platform === 'win32') {
    name += '.exe';
  }
  return name;
};

/**
 * 启动 Mihomo 内核
 * 包含二进制文件检查、权限设置、进程创建与日志捕获
 */
export const startKernel = () => {
  if (mihomoProcess) return;

  const binName = getBinaryName();
  const bin = path.join(process.cwd(), 'bin', binName);
  const configDir = path.join(process.cwd(), 'config');

  // 确保配置目录存在
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // 检查二进制文件是否存在
  if (!fs.existsSync(bin)) {
    console.error(`[Mihomo] Binary not found: ${bin}`);
    // 兜底：若缺少特定架构版本，尝试通用 amd64 版本
    const fallbackBin = path.join(process.cwd(), 'bin', process.platform === 'win32' ? 'mihomo-windows-amd64.exe' : `mihomo-${process.platform}-amd64`);
    if (fs.existsSync(fallbackBin)) {
      console.log(`[Mihomo] Using fallback binary: ${fallbackBin}`);
      runKernel(fallbackBin, configDir);
    } else {
      return;
    }
  } else {
    runKernel(bin, configDir);
  }
};

/**
 * 内部函数：执行二进制并配置进程监控
 * @param bin 二进制文件路径
 * @param configDir 配置目录路径
 */
const runKernel = (bin: string, configDir: string) => {
  // 在类 Unix 系统上确保可执行权限
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(bin, '755');
    } catch (err) {
      console.error(`[Mihomo] Failed to set execution permissions: ${err}`);
    }
  }

  console.log(`[Mihomo] Starting kernel: ${bin} -d ${configDir}`);
  
  // 清空历史日志
  kernelLogs = [];

  // 使用 spawn 启动进程
  mihomoProcess = spawn(bin, ['-d', configDir], {
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'] // 捕获标准输出与标准错误
  });

  if (mihomoProcess.pid) {
    savePid(mihomoProcess.pid);
    startTrafficMonitor();
    // 若为分离进程，需要取消引用以便父进程独立退出
    if (process.platform !== 'win32') {
      mihomoProcess.unref();
    }
  }

  // 处理标准输出日志
  mihomoProcess.stdout?.on('data', (data) => {
    const line = data.toString().trim();
    if (line) {
      addLog(`[STDOUT] ${line}`);
    }
  });

  // 处理标准错误日志
  mihomoProcess.stderr?.on('data', (data) => {
    const line = data.toString().trim();
    if (line) {
      addLog(`[STDERR] ${line}`);
    }
  });

  mihomoProcess.on('close', (code) => {
    console.log(`[Mihomo] Kernel process exited with code: ${code}`);
    addLog(`[SYSTEM] Kernel process exited with code: ${code}`);
    mihomoProcess = null;
    clearPid();
  });

  mihomoProcess.on('error', (err) => {
    console.error(`[Mihomo] Kernel failed to start: ${err}`);
    addLog(`[ERROR] Kernel failed to start: ${err.message}`);
    mihomoProcess = null;
  });
};

/**
 * 将日志写入内存缓冲并追加到当天日志文件
 */
const addLog = (msg: string) => {
  const now = new Date();
  const timestamp = now.toLocaleTimeString();
  const dateStr = now.toISOString().split('T')[0]; // 日期格式：YYYY-MM-DD
  const formattedMsg = `[${timestamp}] ${msg}`;
  
  // 内存缓冲
  kernelLogs.push(formattedMsg);
  if (kernelLogs.length > MAX_LOG_LINES) {
    kernelLogs.shift();
  }

  // 持久化
  try {
    const settings = getSettings();
    const logDir = settings.logPath || path.join(process.cwd(), 'logs');
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `mihomo-${dateStr}.log`);
    fs.appendFileSync(logFile, formattedMsg + '\n', 'utf8');
  } catch (e) {
    console.error('[Mihomo] Failed to persist log:', e);
  }
};

/**
 * 停止 Mihomo 内核
 * 在 Windows 与类 Unix 平台采取不同策略
 */
export const stopKernel = () => {
  const currentPid = mihomoProcess?.pid || getSavedPid();
  
  if (currentPid) {
    if (process.platform === 'win32') {
      try {
        // Windows 上使用 taskkill 结束进程树
        execSync(`taskkill /pid ${currentPid} /f /t`);
      } catch (e) {
        if (mihomoProcess) mihomoProcess.kill();
      }
    } else {
      try {
        // 尝试结束指定进程或进程组
        process.kill(currentPid, 'SIGTERM');
        // 等待片刻检查是否仍在运行，然后强制结束
        setTimeout(() => {
          if (isProcessRunning(currentPid)) {
            process.kill(currentPid, 'SIGKILL');
          }
        }, 1000);
      } catch (e) {
        if (mihomoProcess) mihomoProcess.kill();
      }
    }
    mihomoProcess = null;
    clearPid();
    if (trafficInterval) {
      if (typeof trafficInterval !== 'boolean') {
        clearTimeout(trafficInterval);
      }
      trafficInterval = null;
    }
    addLog(`[SYSTEM] Kernel stopped by user`);
  }
};

/**
 * 获取内核运行状态
 */
export const getKernelStatus = () => {
  // 1. 优先检查内存中的进程实例
  if (mihomoProcess) {
    if (!trafficInterval) startTrafficMonitor();
    return true;
  }

  // 2. 若进程重启，则检查已保存的 PID
  const savedPid = getSavedPid();
  if (savedPid && isProcessRunning(savedPid)) {
    if (!trafficInterval) startTrafficMonitor();
    return true;
  }

  return false;
};

/**
 * 从内存中获取内核日志
 */
export const getKernelLogs = () => {
  return kernelLogs;
};
