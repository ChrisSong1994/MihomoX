import { kernelCommand } from '../../src/cmd/kernel';
import * as mihomo from '../../src/lib/mihomo';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../src/lib/mihomo');
vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Kernel Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not start kernel if already running', async () => {
    vi.mocked(mihomo.getKernelStatus).mockReturnValue(true);
    await kernelCommand.parseAsync(['node', 'test', 'start']);
    expect(mihomo.startKernel).not.toHaveBeenCalled();
  });

  it('should start kernel if not running', async () => {
    vi.mocked(mihomo.getKernelStatus)
      .mockReturnValueOnce(false) // Initial check
      .mockReturnValueOnce(true); // Check after start
    
    await kernelCommand.parseAsync(['node', 'test', 'start']);
    expect(mihomo.startKernel).toHaveBeenCalled();
  });

  it('should stop kernel', async () => {
    vi.mocked(mihomo.getKernelStatus).mockReturnValue(true);
    await kernelCommand.parseAsync(['node', 'test', 'stop']);
    expect(mihomo.stopKernel).toHaveBeenCalled();
  });
});
