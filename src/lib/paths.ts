import path from 'path';
import os from 'os';
import fs from 'fs';

const APP_NAME = 'MihomoX';

/**
 * 获取应用程序数据根目录
 * 开发环境: 项目根目录下的 .userdata 文件夹
 * macOS: ~/Library/Application Support/MihomoX
 * Windows: %APPDATA%/MihomoX
 * Linux: ~/.config/MihomoX
 */
export const getAppDataDir = () => {
  // 优先使用环境变量指定的目录
  if (process.env.MIHOMOX_DATA_DIR) {
    return path.resolve(process.env.MIHOMOX_DATA_DIR);
  }

  // 开发环境下使用项目根目录下的 .userdata
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), '.userdata');
  }

  const homeDir = os.homedir();
  
  switch (process.platform) {
    case 'darwin':
      return path.join(homeDir, 'Library', 'Application Support', APP_NAME);
    case 'win32':
      return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), APP_NAME);
    default:
      return path.join(homeDir, '.config', APP_NAME.toLowerCase());
  }
};

/**
 * 获取各子目录路径
 */
export const getPaths = () => {
  const base = getAppDataDir();
  return {
    base,
    config: path.join(base, 'config'),
    logs: path.join(base, 'logs'),
    subsFile: path.join(base, 'config', 'subscriptions.json'),
    settingsFile: path.join(base, 'config', 'settings.json'),
    subscriptionsDir: path.join(base, 'subscriptions'),
    mihomoConfig: path.join(base, 'config', 'config.yaml'),
    mihomoPid: path.join(base, 'config', 'mihomo.pid'),
  };
};

/**
 * 确保所有必要的目录都已创建
 */
export const ensureDirectories = () => {
  const paths = getPaths();
  
  // 创建目录
  [paths.base, paths.config, paths.logs, paths.subscriptionsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};
