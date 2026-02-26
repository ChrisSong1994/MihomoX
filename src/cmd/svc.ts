import { Command, Option } from 'commander';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger, LOG_FILE_PATH } from '../lib/logger';

const PID_FILE = path.join(process.cwd(), '.next/server.pid');

export const svcCommand = new Command('svc')
  .description('Manage MihomoX service lifecycle');

svcCommand
  .command('start')
  .description('Start the service')
  .addOption(new Option('-p, --port <number>', 'Port to listen on').env('CLI_PORT').default('3000'))
  .addOption(new Option('--env <env>', 'Environment (development/production)').env('CLI_ENV').default('production'))
  .action((options) => {
    try {
      if (fs.existsSync(PID_FILE)) {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
        try {
          process.kill(pid, 0);
          logger.warn(`Service is already running (PID: ${pid})`);
          return;
        } catch (e) {
          fs.unlinkSync(PID_FILE);
        }
      }

      const isDev = options.env === 'development';
      const script = isDev ? 'dev' : 'start';
      const args = ['run', script, '--', '-p', options.port];
      
      logger.info(`Starting service in ${options.env} mode on port ${options.port}...`);

      const logFile = LOG_FILE_PATH || path.join(path.dirname(PID_FILE), 'server.log');
      
      // Ensure log directory exists if using fallback
      if (!LOG_FILE_PATH) {
        fs.mkdirSync(path.dirname(logFile), { recursive: true });
      }

      logger.info(`Redirecting service output to: ${logFile}`);
      
      const out = fs.openSync(logFile, 'a');
      const err = fs.openSync(logFile, 'a');
      
      // Detached process
      const child = spawn('npm', args, {
        detached: true,
        stdio: ['ignore', out, err],
        cwd: process.cwd(),
        env: { ...process.env, PORT: options.port, NODE_ENV: options.env }
      });

      if (child.pid) {
        fs.writeFileSync(PID_FILE, child.pid.toString());
        logger.info(`Service started with PID: ${child.pid}`);
        logger.info(`URL: http://localhost:${options.port}`);
        child.unref();
      } else {
        logger.error('Failed to spawn service process');
      }
    } catch (error: any) {
      logger.error(`Failed to start service: ${error.message}`);
      process.exit(1);
    }
  });

svcCommand
  .command('status')
  .description('Check service status')
  .action(() => {
    try {
      if (!fs.existsSync(PID_FILE)) {
        logger.info('Service is NOT running');
        return;
      }

      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
      try {
        process.kill(pid, 0);
        
        // Get process info
        let memUsage = 0;
        let cpuUsage = 0;
        
        try {
            if (process.platform !== 'win32') {
                const output = execSync(`ps -p ${pid} -o %cpu,rss`).toString();
                const lines = output.trim().split('\n');
                if (lines.length > 1) {
                    const [cpu, rss] = lines[1].trim().split(/\s+/);
                    cpuUsage = parseFloat(cpu);
                    memUsage = parseInt(rss) / 1024; // MB
                }
            }
        } catch (e) {
            // Ignore ps errors
        }

        logger.info('Service is running');
        logger.info(`PID: ${pid}`);
        logger.info(`Memory: ${memUsage.toFixed(2)} MB`);
        logger.info(`CPU: ${cpuUsage.toFixed(2)}%`);
      } catch (e) {
        logger.info('Service is NOT running (stale PID file)');
        fs.unlinkSync(PID_FILE);
      }
    } catch (error: any) {
      logger.error(`Failed to check status: ${error.message}`);
      process.exit(1);
    }
  });

svcCommand
  .command('stop')
  .description('Stop the service')
  .option('-f, --force', 'Force stop (SIGKILL)')
  .action((options) => {
    try {
      if (!fs.existsSync(PID_FILE)) {
        logger.warn('No PID file found');
        return;
      }

      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
      logger.info(`Stopping service (PID: ${pid})...`);

      try {
        process.kill(pid, options.force ? 'SIGKILL' : 'SIGTERM');
        fs.unlinkSync(PID_FILE);
        logger.info('Service stopped');
      } catch (e: any) {
        if (e.code === 'ESRCH') {
          logger.warn('Process not found, removing PID file');
          fs.unlinkSync(PID_FILE);
        } else {
          logger.error(`Failed to stop service: ${e.message}`);
          process.exit(1);
        }
      }
    } catch (error: any) {
      logger.error(`Error stopping service: ${error.message}`);
      process.exit(1);
    }
  });

svcCommand
  .command('logs')
  .description('View logs')
  .option('-t, --tail <number>', 'Number of lines to show', '100')
  .option('-f, --follow', 'Follow log output')
  .action((options) => {
    const logFile = LOG_FILE_PATH || path.join(path.dirname(PID_FILE), 'server.log');
    
    if (!fs.existsSync(logFile)) {
      logger.warn('Log file not found');
      return;
    }

    const args = ['-n', options.tail];
    if (options.follow) args.push('-f');
    args.push(logFile);

    const child = spawn('tail', args, { stdio: 'inherit' });
    
    child.on('error', (e) => {
      logger.error(`Failed to spawn tail: ${e.message}`);
    });
  });
