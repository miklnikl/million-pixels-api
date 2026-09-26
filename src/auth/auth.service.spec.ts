import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

const createPrismaMock = () => ({
  user: {
    findUnique: vi.fn(),
  },
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hash('strong-password');
  });

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should return the public user when credentials are valid', async () => {
    const createdAt = new Date();
    const updatedAt = new Date();
    prisma.user.findUnique.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      role: 'USER',
      passwordHash,
      createdAt,
      updatedAt,
    });

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'strong-password',
      }),
    ).resolves.toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      role: 'USER',
      createdAt,
      updatedAt,
    });
  });

  it('should reject an invalid password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      role: 'USER',
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = service.login({
      email: 'user@example.com',
      password: 'wrong-password',
    });

    await expect(result).rejects.toThrow(
      new UnauthorizedException('Invalid email or password'),
    );
  });

  it('should reject an unknown email with the same error', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = service.login({
      email: 'unknown@example.com',
      password: 'strong-password',
    });

    await expect(result).rejects.toThrow(
      new UnauthorizedException('Invalid email or password'),
    );
  });
});
