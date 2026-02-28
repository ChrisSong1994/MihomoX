import fs from "fs";
import path from "path";
import { getPaths, ensureDirectories } from "./paths";
import { log } from "./logger";
import type { Subscription, AppSettings, Result } from "../server/types";

const paths = getPaths();
const SUBS_FILE = paths.subsFile;
const SETTINGS_FILE = paths.settingsFile;

// 确保配置目录存在
const ensureDir = () => {
  ensureDirectories();
};

const INITIAL_CONFIG_FILE = path.join(process.cwd(), "config", "inital.json");

const defaultSettings: AppSettings = {
  logPath: paths.logs,
  locale: "zh",
};

/**
 * 获取初始默认配置
 */
export const getInitialConfig = (): Result<Record<string, unknown>> => {
  if (fs.existsSync(INITIAL_CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(INITIAL_CONFIG_FILE, "utf-8");
      return { success: true, data: JSON.parse(data) };
    } catch (e) {
      const error = e as Error;
      log.error("Read initial config error:", error);
      return { success: false, error };
    }
  }
  return { success: true, data: {} };
};

/**
 * 加载最终生效的端口配置
 * 优先级：环境变量 > settings.json > initial.json
 */
export const loadEffectivePorts = (): { mixed_port: number; controller_port: number } => {
  const envWebPort = process.env.WEB_PORT
    ? parseInt(process.env.WEB_PORT)
    : null;
  const envMixedPort = process.env.MIXED_PORT
    ? parseInt(process.env.MIXED_PORT)
    : null;
  const envControllerPort = process.env.CONTROLLER_PORT
    ? parseInt(process.env.CONTROLLER_PORT)
    : null;

  const settings = getSettings();
  const initialResult = getInitialConfig();
  const initial = initialResult.success ? initialResult.data : {};
  
  const finalMixedPort =
    envMixedPort || (settings.mixed_port ?? (initial.mixed_port as number | undefined)) || 7890;

  // 处理 external-controller 格式 "127.0.0.1:9099"
  const finalControllerPort =
    envControllerPort || (settings.controller_port ?? (initial.controller_port as number | undefined)) || 9090;

  // 记录日志
  log.info("[Config] Effective Ports Loaded:");
  log.info(
    `- MIXED_PORT: ${finalMixedPort} (Source: ${envMixedPort ? "Env" : settings.mixed_port ? "Settings" : "Initial"})`,
  );
  log.info(
    `- CONTROLLER_PORT: ${finalControllerPort} (Source: ${envControllerPort ? "Env" : settings.controller_port ? "Settings" : "Initial"})`,
  );

  // 唯一性检查
  const ports = [finalMixedPort, finalControllerPort];
  const uniquePorts = new Set(ports);
  if (uniquePorts.size !== ports.length) {
    log.warn(
      "[Config] Warning: Port conflict detected! Please check your configuration.",
    );
  }

  // 持久化到 settings.json
  saveSettings({
    mixed_port: finalMixedPort,
    controller_port: finalControllerPort,
  });

  return {
    mixed_port: finalMixedPort,
    controller_port: finalControllerPort,
  };
};

/**
 * 热更新端口配置
 */
export const hotUpdatePorts = async (updates: {
  mixed_port?: number;
  controller_port?: number;
}): Promise<AppSettings> => {
  const settings = saveSettings(updates);

  // 尝试通知正在运行的内核（如果已启动）
  try {
    const { getKernelStatus } = require("./mihomo");
    if (getKernelStatus()) {
      const controllerPort = settings.controller_port || 9099;
      if (updates.mixed_port) {
        await fetch(`http://127.0.0.1:${controllerPort}/configs`, {
          method: "PATCH",
          body: JSON.stringify({ "mixed-port": updates.mixed_port }),
        });
      }
      // 注意：Mihomo 不支持通过 API 动态修改 external-controller 端口，需要重启内核
    }
  } catch (e) {
    log.error("[Config] Hot update ports error:", e);
  }

  return settings;
};

export const getSettings = (): AppSettings => {
  ensureDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    return defaultSettings;
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return { ...defaultSettings, ...JSON.parse(data) };
  } catch (e) {
    log.error("Read settings error:", e);
    return defaultSettings;
  }
};

export const saveSettings = (settings: Partial<AppSettings>): AppSettings => {
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
    const data = fs.readFileSync(SUBS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    log.error("Read subscriptions error:", e);
    return [];
  }
};

export const saveSubscriptions = (subs: Subscription[]) => {
  ensureDir();
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
};

export const addSubscription = (sub: Omit<Subscription, "id" | "status">): Subscription => {
  const subs = getSubscriptions();
  const newSub: Subscription = {
    ...sub,
    id: Math.random().toString(36).substring(2, 9),
    status: "idle",
  };
  subs.push(newSub);
  saveSubscriptions(subs);
  return newSub;
};

export const deleteSubscription = (id: string) => {
  const subs = getSubscriptions().filter((s) => s.id !== id);
  saveSubscriptions(subs);
};

export const updateSubscription = (
  id: string,
  updates: Partial<Subscription>,
) => {
  const subs = getSubscriptions().map((s) =>
    s.id === id ? { ...s, ...updates } : s,
  );
  saveSubscriptions(subs);
};
