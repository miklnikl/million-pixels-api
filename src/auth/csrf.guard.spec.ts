import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard.js';

const context = (method: string, json: boolean, origin?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ method, headers: { origin }, is: () => json }),
    }),
  }) as ExecutionContext;

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();
  afterEach(() => vi.unstubAllEnvs());

  it('keeps reads public', () => {
    expect(guard.canActivate(context('GET', false))).toBe(true);
  });

  it('allows same-origin JSON and server-to-server JSON', () => {
    vi.stubEnv('FRONTEND_URL', 'https://pixels.example');
    expect(
      guard.canActivate(context('POST', true, 'https://pixels.example')),
    ).toBe(true);
    expect(guard.canActivate(context('POST', true))).toBe(true);
  });

  it('rejects cross-origin mutations and HTML form submissions', () => {
    vi.stubEnv('FRONTEND_URL', 'https://pixels.example');
    expect(() =>
      guard.canActivate(context('POST', true, 'https://other.example')),
    ).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context('POST', false))).toThrow(
      ForbiddenException,
    );
  });
});
