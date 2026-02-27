import winston from 'winston';
import path from 'path';
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

// 添加文件传输（支持轮转）
if (logPath) {
  // 检查是否支持 dailyRotateFile
  try {
    // 动态导入避免包不存在时报错
    const dailyRotateFile = require('winston-daily-rotate-file');
    
    transports.push(new (dailyRotateFile as new (options: unknown) => winston.transport)({
      filename: path.join(path.dirname(logPath), 'mihomox-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',           // 单个文件最大 10MB
      maxFiles: '14d',          // 保留 14 天的日志
      zippedArchive: true,      // 压缩归档的日志
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }));
  } catch {
    // 如果 winston-daily-rotate-file 不可用，使用普通文件传输
    transports.push(new winston.transports.File({
      filename: logPath,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }));
  }
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
