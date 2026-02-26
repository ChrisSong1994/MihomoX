import { Command, Option } from 'commander';
import { getSubscriptions, addSubscription, deleteSubscription, updateSubscription } from '../lib/store';
import { logger } from '../lib/logger';
import { generateFullConfig } from '../lib/mihomo';
import path from 'path';
import fs from 'fs';
import { getPaths } from '../lib/paths';

export const subCommand = new Command('sub')
  .description('Manage subscriptions');

subCommand
  .command('list')
  .description('List all subscriptions')
  .addOption(new Option('--json', 'Output in JSON format').env('CLI_JSON'))
  .action((options) => {
    try {
      const subs = getSubscriptions();
      if (options.json) {
        console.log(JSON.stringify(subs, null, 2));
      } else {
        if (subs.length === 0) {
          logger.info('No subscriptions found');
        } else {
          logger.info('Subscriptions:');
          console.table(subs.map(s => ({
            ID: s.id,
            Name: s.name,
            Status: s.status,
            Enabled: s.enabled,
            Nodes: s.nodeCount || 0,
            LastUpdate: s.lastUpdate || 'Never'
          })));
        }
      }
    } catch (error: any) {
      logger.error(`Failed to list subscriptions: ${error.message}`);
      process.exit(1);
    }
  });

subCommand
  .command('add <name> <url>')
  .description('Add a new subscription')
  .option('--interval <cron>', 'Update interval (cron format) - Note: Currently only stored, not scheduled')
  .action((name, url, options) => {
    try {
      // Check if already exists
      const subs = getSubscriptions();
      if (subs.find(s => s.name === name || s.url === url)) {
        logger.error(`Subscription with name "${name}" or URL already exists`);
        process.exit(1);
      }

      const newSub = addSubscription({
        name,
        url,
        enabled: true,
        // interval: options.interval // Store doesn't support interval yet, skipping
      });
      
      logger.info(`Subscription added: ${newSub.id}`);
      logger.info('To update content, run: mihomox sub update ' + newSub.name);
    } catch (error: any) {
      logger.error(`Failed to add subscription: ${error.message}`);
      process.exit(1);
    }
  });

subCommand
  .command('remove <name>')
  .description('Remove a subscription')
  .action(async (name) => {
    try {
      const subs = getSubscriptions();
      const sub = subs.find(s => s.name === name || s.id === name);
      
      if (!sub) {
        logger.error(`Subscription "${name}" not found`);
        process.exit(1);
      }

      // TODO: Add confirmation prompt if interactive
      deleteSubscription(sub.id);
      
      // Also remove the file
      const paths = getPaths();
      const filePath = path.join(paths.subscriptionsDir, `${sub.id}.yaml`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      logger.info(`Subscription "${sub.name}" removed`);
      
      // Regenerate config
      generateFullConfig();
    } catch (error: any) {
      logger.error(`Failed to remove subscription: ${error.message}`);
      process.exit(1);
    }
  });

subCommand
  .command('update [name]')
  .description('Update subscription(s)')
  .action(async (name) => {
    try {
      const subs = getSubscriptions();
      const targets = name 
        ? subs.filter(s => s.name === name || s.id === name)
        : subs.filter(s => s.enabled);

      if (targets.length === 0) {
        logger.warn(name ? `Subscription "${name}" not found` : 'No enabled subscriptions to update');
        return;
      }

      logger.info(`Updating ${targets.length} subscription(s)...`);

      for (const sub of targets) {
        try {
          logger.info(`Fetching ${sub.name}...`);
          const res = await fetch(sub.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          
          const rawConfig = await res.text();
          const paths = getPaths();
          const filePath = path.join(paths.subscriptionsDir, `${sub.id}.yaml`);
          fs.writeFileSync(filePath, rawConfig, 'utf8');

          updateSubscription(sub.id, {
            lastUpdate: new Date().toISOString(),
            status: 'active'
          });
          logger.info(`Updated ${sub.name}`);
        } catch (e: any) {
          logger.error(`Failed to update ${sub.name}: ${e.message}`);
          updateSubscription(sub.id, { status: 'error' });
        }
      }

      generateFullConfig();
      logger.info('Configuration regenerated');
    } catch (error: any) {
      logger.error(`Update failed: ${error.message}`);
      process.exit(1);
    }
  });
