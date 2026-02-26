import { Command, Option } from 'commander';
import { startKernel, getKernelStatus, stopKernel, getKernelMemoryUsage } from '../lib/mihomo';
import { logger } from '../lib/logger';
import path from 'path';
import fs from 'fs';
import { getSettings } from '../lib/store';

export const kernelCommand = new Command('kernel')
  .description('Manage Mihomo kernel lifecycle');

kernelCommand
  .command('start')
  .description('Start the kernel process')
  .addOption(new Option('-c, --config <path>', 'Path to configuration file').env('CLI_CONFIG'))
  .action(async (options) => {
    try {
      if (getKernelStatus()) {
        logger.warn('Kernel is already running');
        return;
      }

      logger.info('Starting kernel...');
      
      // If config path provided, we might need to adjust how startKernel works or copy it
      // For now, we reuse startKernel which generates config from store
      if (options.config) {
        logger.warn('Custom config path not fully supported by internal logic yet, using generated config');
      }

      startKernel();
      
      // Wait a bit to check status
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (getKernelStatus()) {
        const settings = getSettings();
        const controllerPort = settings.controller_port || 9099;
        logger.info(`Kernel started successfully. REST API: http://127.0.0.1:${controllerPort}`);
      } else {
        logger.error('Kernel failed to start');
        process.exit(1);
      }
    } catch (error: any) {
      logger.error(`Failed to start kernel: ${error.message}`);
      process.exit(1);
    }
  });

kernelCommand
  .command('status')
  .description('Check kernel status')
  .action(async () => {
    try {
      const isRunning = getKernelStatus();
      if (!isRunning) {
        logger.info('Kernel is NOT running');
        return;
      }

      const settings = getSettings();
      const controllerPort = settings.controller_port || 9099;
      const memUsage = getKernelMemoryUsage();
      
      logger.info('Kernel is running');
      logger.info(`Memory Usage: ${memUsage.toFixed(2)} MB`);
      logger.info(`Controller: http://127.0.0.1:${controllerPort}`);

      try {
        const res = await fetch(`http://127.0.0.1:${controllerPort}/version`);
        if (res.ok) {
          const version = await res.json();
          logger.info(`Version: ${JSON.stringify(version)}`);
        }
      } catch (e) {
        logger.warn('Could not fetch version info from controller');
      }
    } catch (error: any) {
      logger.error(`Failed to get status: ${error.message}`);
      process.exit(1);
    }
  });

kernelCommand
  .command('stop')
  .description('Stop the kernel process')
  .action(async () => {
    try {
      if (!getKernelStatus()) {
        logger.warn('Kernel is not running');
        return;
      }

      logger.info('Stopping kernel...');
      stopKernel();
      logger.info('Kernel stopped');
    } catch (error: any) {
      logger.error(`Failed to stop kernel: ${error.message}`);
      process.exit(1);
    }
  });
