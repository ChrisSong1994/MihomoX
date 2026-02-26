import winston from 'winston';

const getLogLevel = (): string => {
  // Priority: Args (handled by caller) > Env > Default
  return process.env.CLI_LOG_LEVEL || 'info';
};

export const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error', 'warn'],
    }),
  ],
});

export const setLogLevel = (level: string) => {
  logger.level = level;
};
