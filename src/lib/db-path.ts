/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-var-requires, import/no-unresolved */
import os from 'os';
import path from 'path';
import fs from 'fs';

const APP_NAME = 'MihomoX';

/**
 * 获取应用程序数据根目录
 */
const getAppDataDir = () => {
  if (process.env.MIHOMOX_DATA_DIR) {
    return path.resolve(process.env.MIHOMOX_DATA_DIR);
  }

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
 * 获取数据库文件路径
 */
export const getDatabasePath = () => {
  const baseDir = getAppDataDir();
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log(`[DB] Created database directory: ${baseDir}`);
  }
  const dbPath = path.join(baseDir, 'mihomox.db');
  console.log(`[DB] Database path: ${dbPath}`);
  return dbPath;
};
