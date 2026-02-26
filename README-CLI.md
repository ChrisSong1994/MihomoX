# MihomoX CLI

A powerful command-line interface for managing the MihomoX application, kernel, and subscriptions.

## Installation

```bash
# Install globally
pnpm install -g .

# Or run locally
pnpm mihomox --help
```

## Usage

```bash
mihomox [command] [options]
```

### Global Options

- `-V, --version`: Output the version number
- `--log-level <level>`: Set log level (debug, info, warn, error) [default: info] (Env: `CLI_LOG_LEVEL`)
- `-h, --help`: Display help for command

### Commands

#### Service Management (`svc`)

Manage the MihomoX web service (Next.js application).

- `svc start`: Start the service in background
  - `-p, --port <number>`: Port to listen on (Env: `CLI_PORT`, Default: 3000)
  - `--env <env>`: Environment (development/production) (Env: `CLI_ENV`, Default: production)
- `svc status`: Check service status
- `svc stop`: Stop the service
  - `-f, --force`: Force stop (SIGKILL)
- `svc logs`: View service logs
  - `-t, --tail <number>`: Number of lines to show (Default: 100)
  - `-f, --follow`: Follow log output

#### Kernel Management (`kernel`)

Manage the Mihomo core kernel process.

- `kernel start`: Start the kernel process
  - `-c, --config <path>`: Path to configuration file (Env: `CLI_CONFIG`)
- `kernel status`: Check kernel status
- `kernel stop`: Stop the kernel process

#### Subscription Management (`sub`)

Manage proxy subscriptions.

- `sub list`: List all subscriptions
  - `--json`: Output in JSON format (Env: `CLI_JSON`)
- `sub add <name> <url>`: Add a new subscription
  - `--interval <cron>`: Update interval (cron format)
- `sub update [name]`: Update subscription(s)
- `sub remove <name>`: Remove a subscription

## Environment Variables

The CLI supports environment variables for configuration. Command-line arguments take precedence over environment variables.

| Variable | Description | Default |
|----------|-------------|---------|
| `CLI_LOG_LEVEL` | Log level (debug, info, warn, error) | `info` |
| `CLI_PORT` | Service port | `3000` |
| `CLI_ENV` | Service environment | `production` |
| `CLI_CONFIG` | Kernel configuration file path | - |
| `CLI_JSON` | Output JSON format for list commands | `false` |

## License

MIT
