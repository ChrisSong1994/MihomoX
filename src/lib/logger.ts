import winston from 'winston';
import { getPaths, ensureDirectories } from './paths';
import path from 'path';

// Ensure paths are created before logger init
try {
  ensureDirectories();
} catch (e) {
  // Ignore errors if we are in an environment where fs is not available (e.g. Edge)
}

const getLogLevel = (): string => {
  return process.env.CLI_LOG_LEVEL || 'info';
};

const getLogPath = () => {
  try {
    const paths = getPaths();
    return path.join(paths.logs, 'mihomox.log');
  } catch (e) {
    return null;
  }
};

const logPath = getLogPath();

const transports: winston.transport[] = [
  new winston.transports.Console({
    stderrLevels: ['error', 'warn'],
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
];

if (logPath) {
  transports.push(
    new winston.transports.File({
      filename: logPath,
      level: 'info', // Always log info to file regardless of CLI level
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
      ),
    })
  );
}

export const logger = winston.createLogger({
  level: getLogLevel(),
  transports,
});

export const setLogLevel = (level: string) => {
  logger.level = level;
};

// Also export the log file path for external use (e.g. by svc command)
export const LOG_FILE_PATH = logPath;
