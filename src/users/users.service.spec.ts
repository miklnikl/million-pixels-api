import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

const createPrismaMock = () => ({
  pixelBlock: { findMany: vi.fn() },
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
});

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject creation when the email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user-id' });

    const result = service.create({
      email: 'user@example.com',
      password: 'strong-password',
    });

    await expect(result).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('should hash the password with Argon2 before creating a user', async () => {
    const createdUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(createdUser);

    await service.create({
      email: 'user@example.com',
      password: 'strong-password',
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          email: 'user@example.com',
          passwordHash: expect.stringMatching(/^\$argon2id\$/),
        },
      }),
    );
  });
  it('ranks individual blocks by area, including several blocks from the same owner', async () => {
    const small = {
      width: 2,
      height: 3,
      colors: [],
      contentType: 'TEXT',
      content: 'Small',
    };
    const large = {
      width: 4,
      height: 5,
      colors: ['#ff0000'],
      contentType: 'TEXT',
      content: 'Large',
    };
    const medium = {
      width: 3,
      height: 4,
      colors: [],
      contentType: null,
      content: null,
    };
    prisma.pixelBlock.findMany.mockResolvedValue([
      { ...small, user: { email: 'alice@example.com' } },
      { ...large, user: { email: 'alice@example.com' } },
      { ...medium, user: { email: 'bob@example.com' } },
    ]);
    await expect(service.leaderboard()).resolves.toEqual([
      {
        rank: 1,
        maskedEmail: 'a***@example.com',
        pixels: 20,
        block: { ...large, priceUsd: 20 },
      },
      {
        rank: 2,
        maskedEmail: 'b***@example.com',
        pixels: 12,
        block: { ...medium, priceUsd: 12 },
      },
      {
        rank: 3,
        maskedEmail: 'a***@example.com',
        pixels: 6,
        block: { ...small, priceUsd: 6 },
      },
    ]);
    expect(prisma.pixelBlock.findMany).toHaveBeenCalledWith({
      where: { userId: { not: null } },
      orderBy: { id: 'asc' },
      select: {
        width: true,
        height: true,
        colors: true,
        contentType: true,
        content: true,
        user: { select: { email: true } },
      },
    });
  });

  it('masks short emails and preserves stable order for equal areas', async () => {
    const block = {
      width: 1,
      height: 1,
      colors: [],
      contentType: null,
      content: null,
    };
    prisma.pixelBlock.findMany.mockResolvedValue([
      { ...block, user: { email: 'a@example.com' } },
      { ...block, user: { email: 'ab@example.com' } },
    ]);
    await expect(service.leaderboard()).resolves.toEqual([
      {
        rank: 1,
        maskedEmail: '***@example.com',
        pixels: 1,
        block: { ...block, priceUsd: 1 },
      },
      {
        rank: 2,
        maskedEmail: 'a***@example.com',
        pixels: 1,
        block: { ...block, priceUsd: 1 },
      },
    ]);
  });

  it('returns an empty leaderboard when there are no owned blocks', async () => {
    prisma.pixelBlock.findMany.mockResolvedValue([]);
    await expect(service.leaderboard()).resolves.toEqual([]);
  });
});
