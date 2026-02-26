#!/usr/bin/env node
import { Command } from 'commander';
import { kernelCommand } from './cmd/kernel';
import { subCommand } from './cmd/sub';
import { svcCommand } from './cmd/svc';
import { logger, setLogLevel } from './lib/logger';

// Check for ts-node execution environment or compiled
if (process.env.TS_NODE_DEV) {
    // We are in development
}

const program = new Command();

program
  .name('mihomox')
  .description('MihomoX CLI Tool')
  .version('0.1.0')
  .option('--log-level <level>', 'Set log level (debug, info, warn, error)', 'info')
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    if (options.logLevel) {
      setLogLevel(options.logLevel);
    }
  });

program.addCommand(svcCommand);
program.addCommand(kernelCommand);
program.addCommand(subCommand);

program.parseAsync(process.argv).catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
