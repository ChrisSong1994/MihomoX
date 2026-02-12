import fs from 'fs';
import path from 'path';
import { getPaths, ensureDirectories } from './paths';

const paths = getPaths();
const SUBS_FILE = paths.subsFile;
const SETTINGS_FILE = paths.settingsFile;

export interface Subscription {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  lastUpdate?: string;
  nodeCount?: number;
  trafficUsed?: number;
  trafficTotal?: number;
  expireDate?: string;
  status: 'active' | 'expired' | 'error' | 'idle';
}

// 确保配置目录存在
const ensureDir = () => {
  ensureDirectories();
};

export interface AppSettings {
  logPath: string;
  locale: string;
  web_port?: number;
  mixed_port?: number;
  controller_port?: number;
  secret?:string
}

const INITIAL_CONFIG_FILE = path.join(process.cwd(), 'config', 'inital.json');

const defaultSettings: AppSettings = {
  logPath: paths.logs,
  locale: 'zh'
};

/**
 * 获取初始默认配置
 */
export const getInitialConfig = () => {
  if (fs.existsSync(INITIAL_CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(INITIAL_CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Read initial config error:', e);
    }
  }
  return {};
};

/**
 * 加载最终生效的端口配置
 * 优先级：环境变量 > settings.json > initial.json
 */
export const loadEffectivePorts = () => {
  const envWebPort = process.env.WEB_PORT ? parseInt(process.env.WEB_PORT) : null;
  const envMixedPort = process.env.MIXED_PORT ? parseInt(process.env.MIXED_PORT) : null;
  const envControllerPort = process.env.CONTROLLER_PORT ? parseInt(process.env.CONTROLLER_PORT) : null;

  const settings = getSettings();
  const initial = getInitialConfig();

  const finalWebPort = envWebPort || settings.web_port || initial.web_port || 9090;
  const finalMixedPort = envMixedPort || settings.mixed_port || initial.mixed_port || 7890;
  
  // 处理 external-controller 格式 "127.0.0.1:9099"
  let initialControllerPort = 9099;
  if (initial['external-controller']) {
    const parts = initial['external-controller'].split(':');
    if (parts.length > 1) {
      initialControllerPort = parseInt(parts[parts.length - 1]);
    }
  }
  const finalControllerPort = envControllerPort || settings.controller_port || initialControllerPort;

  // 记录日志
  console.log('[Config] Effective Ports Loaded:');
  console.log(`- WEB_PORT: ${finalWebPort} (Source: ${envWebPort ? 'Env' : settings.web_port ? 'Settings' : 'Initial'})`);
  console.log(`- MIXED_PORT: ${finalMixedPort} (Source: ${envMixedPort ? 'Env' : settings.mixed_port ? 'Settings' : 'Initial'})`);
  console.log(`- CONTROLLER_PORT: ${finalControllerPort} (Source: ${envControllerPort ? 'Env' : settings.controller_port ? 'Settings' : 'Initial'})`);

  // 唯一性检查
  const ports = [finalWebPort, finalMixedPort, finalControllerPort];
  const uniquePorts = new Set(ports);
  if (uniquePorts.size !== ports.length) {
    console.warn('[Config] Warning: Port conflict detected! Please check your configuration.');
  }

  // 持久化到 settings.json
  saveSettings({
    web_port: finalWebPort,
    mixed_port: finalMixedPort,
    controller_port: finalControllerPort
  });

  // 热加载支持：如果内核正在运行，且端口发生变化，则通知内核（这里主要由 startKernel 在下次启动时应用）
  // 实际上可以通过 PATCH /configs 更新混合端口
  
  return {
    web_port: finalWebPort,
    mixed_port: finalMixedPort,
    controller_port: finalControllerPort
  };
};

/**
 * 热更新端口配置
 */
export const hotUpdatePorts = async (updates: { mixed_port?: number, controller_port?: number }) => {
  const settings = saveSettings(updates);
  
  // 尝试通知正在运行的内核（如果已启动）
  try {
    const { getKernelStatus } = require('./mihomo');
    if (getKernelStatus()) {
      const controllerPort = settings.controller_port || 9099;
      if (updates.mixed_port) {
        await fetch(`http://127.0.0.1:${controllerPort}/configs`, {
          method: 'PATCH',
          body: JSON.stringify({ 'mixed-port': updates.mixed_port })
        });
      }
      // 注意：Mihomo 不支持通过 API 动态修改 external-controller 端口，需要重启内核
    }
  } catch (e) {
    console.error('[Config] Hot update ports error:', e);
  }
  
  return settings;
};

export const getSettings = (): AppSettings => {
  ensureDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    return defaultSettings;
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return { ...defaultSettings, ...JSON.parse(data) };
  } catch (e) {
    return defaultSettings;
  }
};

export const saveSettings = (settings: Partial<AppSettings>) => {
  ensureDir();
  const current = getSettings();
  const updated = { ...current, ...settings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  return updated;
};

export const getSubscriptions = (): Subscription[] => {
  ensureDir();
  if (!fs.existsSync(SUBS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(SUBS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Read subscriptions error:', e);
    return [];
  }
};

export const saveSubscriptions = (subs: Subscription[]) => {
  ensureDir();
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
};

export const addSubscription = (sub: Omit<Subscription, 'id' | 'status'>) => {
  const subs = getSubscriptions();
  const newSub: Subscription = {
    ...sub,
    id: Math.random().toString(36).substring(2, 9),
    status: 'idle',
  };
  subs.push(newSub);
  saveSubscriptions(subs);
  return newSub;
};

export const deleteSubscription = (id: string) => {
  const subs = getSubscriptions().filter(s => s.id !== id);
  saveSubscriptions(subs);
};

export const updateSubscription = (id: string, updates: Partial<Subscription>) => {
  const subs = getSubscriptions().map(s => s.id === id ? { ...s, ...updates } : s);
  saveSubscriptions(subs);
};
