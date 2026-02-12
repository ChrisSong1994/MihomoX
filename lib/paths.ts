import path from 'path';
import os from 'os';
import fs from 'fs';

const APP_NAME = 'MihomoNext';

/**
 * 获取应用程序数据根目录
 * macOS: ~/Library/Application Support/MihomoNext
 * Windows: %APPDATA%/MihomoNext
 * Linux: ~/.config/mihomonext
 */
export const getAppDataDir = () => {
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
    mihomoConfig: path.join(base, 'config', 'config.yaml'),
    mihomoPid: path.join(base, 'config', 'mihomo.pid'),
  };
};

/**
 * 确保所有必要的目录都已创建
 */
export const ensureDirectories = () => {
  const paths = getPaths();
  [paths.base, paths.config, paths.logs].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};
