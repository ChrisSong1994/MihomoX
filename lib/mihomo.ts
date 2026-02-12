import { spawn, ChildProcess, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { getSettings } from './store';

/**
 * Update and persist config.yaml configuration
 */
export const updateConfigFile = (updates: Record<string, any>) => {
  const configPath = path.join(process.cwd(), 'config', 'config.yaml');
  try {
    let config: any = {};
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      config = yaml.load(fileContent) || {};
    }

    // Deep merge or simple overwrite
    const newConfig = { ...config, ...updates };
    
    fs.writeFileSync(configPath, yaml.dump(newConfig), 'utf8');
    return { success: true };
  } catch (e: any) {
    console.error('[Mihomo] Failed to save config file:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Mihomo Kernel Management Class
 * Handles binary startup, shutdown, status detection, and log stream management
 */

let mihomoProcess: ChildProcess | null = null;
let trafficInterval: NodeJS.Timeout | null = null;
const PID_FILE = path.join(process.cwd(), 'config', 'mihomo.pid');

/**
 * Check if a process is actually running by PID
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
 * Save PID to local file
 */
const savePid = (pid: number) => {
  try {
    fs.writeFileSync(PID_FILE, pid.toString(), 'utf8');
  } catch (e) {
    console.error('[Mihomo] Failed to save PID file:', e);
  }
};

/**
 * Remove PID file
 */
const clearPid = () => {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch (e) {
    // Ignore error if file doesn't exist
  }
};

/**
 * Get PID from file
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
// Store recent logs for frontend debug view
let kernelLogs: string[] = [];
const MAX_LOG_LINES = 1000;

// Store traffic history (last 1 hour, every 2 seconds = 1800 points)
let trafficHistory: Array<{ time: number; up: number; down: number }> = [];
const MAX_TRAFFIC_POINTS = 1800;

/**
 * Update traffic history
 */
const updateTrafficHistory = (up: number, down: number) => {
  const now = Date.now();
  trafficHistory.push({ time: now, up, down });
  if (trafficHistory.length > MAX_TRAFFIC_POINTS) {
    trafficHistory.shift();
  }
};

/**
 * Get traffic history
 */
export const getTrafficHistory = () => {
  return trafficHistory;
};

/**
 * Start Traffic Monitor
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
            // Some versions might prefix with "data: "
            const jsonStr = chunk.startsWith('data: ') ? chunk.slice(6) : chunk;
            const data = JSON.parse(jsonStr);
            updateTrafficHistory(data.up, data.down);
          } catch (e) {
            // Skip invalid JSON or partial chunks
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      
      console.error('[Mihomo] Traffic monitor error:', e.message);
      // Retry after 5s
      trafficInterval = setTimeout(() => {
        trafficInterval = null;
        if (getKernelStatus()) runMonitor();
      }, 5000);
    }
  };

  runMonitor();
  
  // Set a flag to avoid multiple intervals, though we use recursion/timeout now
  trafficInterval = true as any; 
};

/**
 * Get matching binary name based on current platform
 * Supports Windows (.exe), macOS, Linux and their amd64/arm64 architectures
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
 * Start Mihomo Kernel
 * Includes binary check, permission settings, process creation, and log capture
 */
export const startKernel = () => {
  if (mihomoProcess) return;

  const binName = getBinaryName();
  const bin = path.join(process.cwd(), 'bin', binName);
  const configDir = path.join(process.cwd(), 'config');

  // Ensure config directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Check if binary exists
  if (!fs.existsSync(bin)) {
    console.error(`[Mihomo] Binary not found: ${bin}`);
    // Fallback: try universal amd64 version if architecture-specific is missing
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
 * Internal function: execute binary and configure process monitoring
 * @param bin Binary file path
 * @param configDir Config directory path
 */
const runKernel = (bin: string, configDir: string) => {
  // Ensure executable permissions on Unix systems
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(bin, '755');
    } catch (err) {
      console.error(`[Mihomo] Failed to set execution permissions: ${err}`);
    }
  }

  console.log(`[Mihomo] Starting kernel: ${bin} -d ${configDir}`);
  
  // Clear previous logs
  kernelLogs = [];

  // Start process using spawn
  mihomoProcess = spawn(bin, ['-d', configDir], {
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'] // Capture stdout and stderr
  });

  if (mihomoProcess.pid) {
    savePid(mihomoProcess.pid);
    startTrafficMonitor();
    // If detached, we need to unref so the parent can exit independently
    if (process.platform !== 'win32') {
      mihomoProcess.unref();
    }
  }

  // Handle stdout logs
  mihomoProcess.stdout?.on('data', (data) => {
    const line = data.toString().trim();
    if (line) {
      addLog(`[STDOUT] ${line}`);
    }
  });

  // Handle stderr logs
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
 * Add log line to memory buffer and persist to daily file
 */
const addLog = (msg: string) => {
  const now = new Date();
  const timestamp = now.toLocaleTimeString();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const formattedMsg = `[${timestamp}] ${msg}`;
  
  // Memory buffer
  kernelLogs.push(formattedMsg);
  if (kernelLogs.length > MAX_LOG_LINES) {
    kernelLogs.shift();
  }

  // Persistence
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
 * Stop Mihomo Kernel
 * Different strategies for Windows and Unix platforms
 */
export const stopKernel = () => {
  const currentPid = mihomoProcess?.pid || getSavedPid();
  
  if (currentPid) {
    if (process.platform === 'win32') {
      try {
        // Use taskkill on Windows to end process tree
        execSync(`taskkill /pid ${currentPid} /f /t`);
      } catch (e) {
        if (mihomoProcess) mihomoProcess.kill();
      }
    } else {
      try {
        // Try to kill the specific process or process group
        process.kill(currentPid, 'SIGTERM');
        // Wait a bit and check if still running, then force kill
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
 * Get kernel running status
 */
export const getKernelStatus = () => {
  // 1. Check in-memory process first
  if (mihomoProcess) {
    if (!trafficInterval) startTrafficMonitor();
    return true;
  }

  // 2. Check saved PID if process restarted
  const savedPid = getSavedPid();
  if (savedPid && isProcessRunning(savedPid)) {
    if (!trafficInterval) startTrafficMonitor();
    return true;
  }

  return false;
};

/**
 * Get kernel logs from memory
 */
export const getKernelLogs = () => {
  return kernelLogs;
};
