const mocks = vi.hoisted(() => ({ update: vi.fn(), disconnect: vi.fn() }));
vi.mock('../prisma/prisma.service.js', () => ({
  PrismaService: class {
    user = { update: mocks.update };
    $disconnect = mocks.disconnect;
  },
}));

describe('admin:promote command', () => {
  const originalArgs = process.argv;
  const originalExitCode = process.exitCode;
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.argv = ['node', 'promote-admin.js', 'owner@example.com'];
    process.exitCode = 0;
  });
  afterEach(() => {
    process.argv = originalArgs;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  it('promotes only the account with the supplied email', async () => {
    mocks.update.mockResolvedValue({ email: 'owner@example.com' });
    await import('./promote-admin.js');
    expect(mocks.update).toHaveBeenCalledWith({
      where: { email: 'owner@example.com' },
      data: { role: 'ADMIN' },
      select: { email: true },
    });
    expect(mocks.disconnect).toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('requires an explicit email', async () => {
    process.argv = ['node', 'promote-admin.js'];
    await import('./promote-admin.js');
    expect(mocks.update).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('fails when the account does not exist', async () => {
    mocks.update.mockRejectedValue(
      Object.assign(new Error('missing'), { code: 'P2025' }),
    );
    await import('./promote-admin.js');
    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('No registered user'),
    );
    expect(mocks.disconnect).toHaveBeenCalled();
  });
});
