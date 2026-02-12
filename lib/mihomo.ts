import { spawn, ChildProcess, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

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
// Store recent logs for frontend debug view
let kernelLogs: string[] = [];
const MAX_LOG_LINES = 1000;

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
  });

  mihomoProcess.on('error', (err) => {
    console.error(`[Mihomo] Kernel failed to start: ${err}`);
    addLog(`[ERROR] Kernel failed to start: ${err.message}`);
    mihomoProcess = null;
  });
};

/**
 * Add log line to memory buffer with fixed size
 */
const addLog = (msg: string) => {
  const timestamp = new Date().toLocaleTimeString();
  const formattedMsg = `[${timestamp}] ${msg}`;
  kernelLogs.push(formattedMsg);
  if (kernelLogs.length > MAX_LOG_LINES) {
    kernelLogs.shift();
  }
};

/**
 * Stop Mihomo Kernel
 * Different strategies for Windows and Unix platforms
 */
export const stopKernel = () => {
  if (mihomoProcess) {
    if (process.platform === 'win32') {
      try {
        // Use taskkill on Windows to end process tree
        execSync(`taskkill /pid ${mihomoProcess.pid} /f /t`);
      } catch (e) {
        mihomoProcess.kill();
      }
    } else {
      if (mihomoProcess.pid) {
        try {
          // Use negative PID to kill process group on Unix
          process.kill(-mihomoProcess.pid);
        } catch (e) {
          mihomoProcess.kill();
        }
      } else {
        mihomoProcess.kill();
      }
    }
    mihomoProcess = null;
    addLog(`[SYSTEM] Kernel stopped by user`);
  }
};

/**
 * Get kernel running status
 */
export const getKernelStatus = () => {
  return mihomoProcess !== null;
};

/**
 * Get kernel logs from memory
 */
export const getKernelLogs = () => {
  return kernelLogs;
};
