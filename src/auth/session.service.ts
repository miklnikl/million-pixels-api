import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

const COOKIE_NAME = 'pixel_session';
const SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
});

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  private tokenHash(request: Request): string | null {
    const token = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${COOKIE_NAME}=`))
      ?.slice(COOKIE_NAME.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    return createHash('sha256').update(token).digest('hex');
  }

  async create(userId: string, response: Response): Promise<void> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.session.create({
      data: {
        tokenHash: createHash('sha256').update(token).digest('hex'),
        userId,
        expiresAt: new Date(Date.now() + SESSION_AGE_MS),
      },
    });
    response.cookie(COOKIE_NAME, token, {
      ...cookieOptions(),
      maxAge: SESSION_AGE_MS,
    });
    response.setHeader('Cache-Control', 'no-store');
  }

  async getUser(request: Request) {
    const tokenHash = this.tokenHash(request);
    if (!tokenHash) throw new UnauthorizedException();
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      select: {
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException();
    }
    return session.user;
  }

  async logout(request: Request, response: Response): Promise<void> {
    const tokenHash = this.tokenHash(request);
    if (tokenHash)
      await this.prisma.session.deleteMany({ where: { tokenHash } });
    response.clearCookie(COOKIE_NAME, cookieOptions());
    response.setHeader('Cache-Control', 'no-store');
  }
}
