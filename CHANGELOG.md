# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-02-26

### Added

- **CLI Tool**: Introduced `mihomo-next` CLI for managing the application.
  - `svc`: Start/stop/status/logs for the Next.js service.
  - `kernel`: Start/stop/status for the Mihomo kernel.
  - `sub`: Add/list/update/remove proxy subscriptions.
- **Environment Variables**: Support for `CLI_` prefixed environment variables.
- **Logging**: Integrated `winston` for structured logging.
- **Testing**: Added unit tests using `vitest`.
- **CI**: Added GitHub Actions workflow for automated testing and building.
