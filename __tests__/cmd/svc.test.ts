import { svcCommand } from '../../src/cmd/svc';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('fs');
vi.mock('child_process');
vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  LOG_FILE_PATH: '/mock/path/to/log',
}));

describe('Service Command', () => {
  const PID_FILE = path.join(process.cwd(), '.next/server.pid');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start service if not running', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.openSync).mockReturnValue(1); // Mock file descriptor
    vi.mocked(spawn).mockReturnValue({
      pid: 1234,
      unref: vi.fn(),
    } as any);

    await svcCommand.parseAsync(['node', 'test', 'start']);
    
    expect(spawn).toHaveBeenCalledWith('npm', expect.arrayContaining(['run', 'start']), expect.anything());
    expect(fs.writeFileSync).toHaveBeenCalledWith(PID_FILE, '1234');
  });

  it('should not start service if PID file exists and process is running', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('1234');
    vi.spyOn(process, 'kill').mockImplementation(() => true);

    await svcCommand.parseAsync(['node', 'test', 'start']);
    
    expect(spawn).not.toHaveBeenCalled();
  });
});
