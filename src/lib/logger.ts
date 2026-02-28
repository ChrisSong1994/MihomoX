import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { getPaths, ensureDirectories } from './paths';

// 确保 paths 在 logger 初始化前创建
try {
  ensureDirectories();
} catch {
  // 忽略错误
}

const getLogLevel = (): string => {
  return process.env.CLI_LOG_LEVEL || process.env.LOG_LEVEL || 'info';
};

const getLogPath = () => {
  try {
    const paths = getPaths();
    return path.join(paths.logs, 'mihomox.log');
  } catch {
    return null;
  }
};

const logPath = getLogPath();

// 自定义日志格式
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) msg += `\n${stack}`;
    return msg;
  })
);

// 控制台格式（带颜色）
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

// 创建 transports 数组
const transports: winston.transport[] = [
  // 控制台输出
  new winston.transports.Console({
    format: consoleFormat,
    stderrLevels: ['error', 'warn'],
  }),
];

// 添加文件传输
if (logPath) {
  // 确保日志目录存在
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // 使用普通的文件传输（支持基本的轮转逻辑）
  transports.push(new winston.transports.File({
    filename: logPath,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }));

  // 同时输出人类可读的日志
  transports.push(new winston.transports.File({
    filename: path.join(logDir, 'mihomox-readable.log'),
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 3,
    format: customFormat,
  }));
}

// 创建 logger
export const appLogger = winston.createLogger({
  level: getLogLevel(),
  format: customFormat,
  transports,
});

export const setLogLevel = (level: string) => {
  appLogger.level = level;
};

// 导出日志文件路径
export const LOG_FILE_PATH = logPath;

// 便捷方法
export const log = {
  info: (message: string, ...args: unknown[]) => appLogger.info(message, ...args),
  warn: (message: string, ...args: unknown[]) => appLogger.warn(message, ...args),
  error: (message: string, ...args: unknown[]) => appLogger.error(message, ...args),
  debug: (message: string, ...args: unknown[]) => appLogger.debug(message, ...args),
};

// 保持向后兼容
export const logger = appLogger;
