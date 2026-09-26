import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { SessionService } from './session.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const token = 'a'.repeat(64);
const tokenHash = createHash('sha256').update(token).digest('hex');
const request = (cookie?: string) => ({ headers: { cookie } }) as Request;

describe('SessionService', () => {
  const prisma = {
    session: { create: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
  };
  const response = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    setHeader: vi.fn(),
  };
  const service = new SessionService(prisma as unknown as PrismaService);

  beforeEach(() => vi.resetAllMocks());

  it('stores only the token hash and sends an HttpOnly session cookie', async () => {
    await service.create('user-1', response as unknown as Response);
    const [name, value, options] = response.cookie.mock.calls[0];
    expect(name).toBe('pixel_session');
    expect(value).toMatch(/^[a-f0-9]{64}$/);
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    const data = prisma.session.create.mock.calls[0][0].data;
    expect(data.tokenHash).toBe(
      createHash('sha256').update(value).digest('hex'),
    );
    expect(data.tokenHash).not.toBe(value);
    expect(data.userId).toBe('user-1');
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('resolves a valid session to its public user', async () => {
    const user = { id: 'user-1', email: 'user@example.com' };
    prisma.session.findUnique.mockResolvedValue({
      user,
      expiresAt: new Date(Date.now() + 60000),
    });
    await expect(
      service.getUser(request(`other=x; pixel_session=${token}`)),
    ).resolves.toEqual(user);
    expect(prisma.session.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash } }),
    );
  });

  it.each([undefined, 'pixel_session=invalid', 'pixel_session='])(
    'rejects a missing or malformed cookie: %s',
    async (cookie) => {
      await expect(service.getUser(request(cookie))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.session.findUnique).not.toHaveBeenCalled();
    },
  );

  it.each([null, { expiresAt: new Date(0), user: { id: 'user-1' } }])(
    'rejects unknown or expired sessions',
    async (session) => {
      prisma.session.findUnique.mockResolvedValue(session);
      await expect(
        service.getUser(request(`pixel_session=${token}`)),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('revokes the server session and clears the cookie on logout', async () => {
    await service.logout(
      request(`pixel_session=${token}`),
      response as unknown as Response,
    );
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash },
    });
    expect(response.clearCookie).toHaveBeenCalledWith(
      'pixel_session',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
  });
});
