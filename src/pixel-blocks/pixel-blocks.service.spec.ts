import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { PixelBlocksService } from './pixel-blocks.service.js';

const createPrismaMock = () => ({
  user: { findUnique: vi.fn() },
  pixelBlock: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
});

describe('PixelBlocksService', () => {
  let service: PixelBlocksService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PixelBlocksService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PixelBlocksService>(PixelBlocksService);
  });

  it('assigns the authenticated owner when creating a block', async () => {
    prisma.pixelBlock.findMany.mockResolvedValue([]);
    const data = {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      contentType: 'TEXT' as const,
      colors: [],
    };
    await service.create(data, { id: 'owner-1', role: 'USER' });
    expect(prisma.pixelBlock.create).toHaveBeenCalledWith({
      data: { ...data, userId: 'owner-1' },
    });
  });

  it.each(['other-user', null])(
    'rejects update and deletion for blocks owned by %s',
    async (userId) => {
      prisma.pixelBlock.findUnique.mockResolvedValue({ id: 'block-1', userId });
      const data = {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        contentType: 'TEXT' as const,
        colors: [],
      };
      await expect(
        service.update('block-1', data, { id: 'owner-1', role: 'USER' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.delete('block-1', { id: 'owner-1', role: 'USER' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.pixelBlock.update).not.toHaveBeenCalled();
      expect(prisma.pixelBlock.delete).not.toHaveBeenCalled();
    },
  );

  it('allows the owner to update and delete', async () => {
    prisma.pixelBlock.findUnique.mockResolvedValue({
      id: 'block-1',
      userId: 'owner-1',
    });
    prisma.pixelBlock.findMany.mockResolvedValue([]);
    const data = {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      contentType: 'TEXT' as const,
      colors: [],
    };
    await service.update('block-1', data, { id: 'owner-1', role: 'USER' });
    expect(prisma.pixelBlock.update).toHaveBeenCalledWith({
      where: { id: 'block-1' },
      data,
    });
    await service.delete('block-1', { id: 'owner-1', role: 'USER' });
    expect(prisma.pixelBlock.delete).toHaveBeenCalledWith({
      where: { id: 'block-1' },
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject creation when a pixel block overlaps', async () => {
    prisma.pixelBlock.findMany.mockResolvedValue([
      { x: 10, y: 10, width: 10, height: 10 },
    ]);

    const result = service.create(
      {
        x: 15,
        y: 15,
        width: 10,
        height: 10,
        contentType: 'TEXT',
        content: 'Overlapping block',
        colors: [],
      },
      { id: 'owner-1', role: 'USER' },
    );

    await expect(result).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.pixelBlock.create).not.toHaveBeenCalled();
  });

  it('should reject update when a pixel block overlaps another block', async () => {
    prisma.pixelBlock.findUnique.mockResolvedValue({
      id: 'block-1',
      userId: 'owner-1',
      x: 0,
      y: 0,
      width: 5,
      height: 5,
      contentType: 'TEXT',
      content: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.pixelBlock.findMany.mockResolvedValue([
      { x: 10, y: 10, width: 10, height: 10 },
    ]);

    const result = service.update(
      'block-1',
      {
        x: 15,
        y: 15,
        width: 10,
        height: 10,
        contentType: 'IMAGE',
        colors: [],
      },
      { id: 'owner-1', role: 'USER' },
    );

    await expect(result).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.pixelBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { not: 'block-1' } },
      }),
    );
    expect(prisma.pixelBlock.update).not.toHaveBeenCalled();
  });
  it.each(['another-owner', null])(
    'allows administrators to edit and delete blocks owned by %s',
    async (userId) => {
      const admin = { id: 'admin-1', role: 'ADMIN' as const };
      prisma.pixelBlock.findUnique.mockResolvedValue({ id: 'block-1', userId });
      prisma.pixelBlock.findMany.mockResolvedValue([]);
      const data = {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        contentType: 'TEXT' as const,
        colors: [],
      };
      await service.update('block-1', data, admin);
      expect(prisma.pixelBlock.update).toHaveBeenCalledWith({
        where: { id: 'block-1' },
        data,
      });
      await service.delete('block-1', admin);
      expect(prisma.pixelBlock.delete).toHaveBeenCalled();
    },
  );

  it('assigns only an existing user as owner when an administrator creates or updates', async () => {
    const admin = { id: 'admin-1', role: 'ADMIN' as const };
    prisma.user.findUnique.mockResolvedValue({ id: 'new-owner' });
    prisma.pixelBlock.findMany.mockResolvedValue([]);
    prisma.pixelBlock.findUnique.mockResolvedValue({
      id: 'block-1',
      userId: null,
    });
    const data = {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      contentType: 'TEXT' as const,
      colors: [],
    };
    await service.create({ ...data, ownerEmail: 'owner@example.com' }, admin);
    expect(prisma.pixelBlock.create).toHaveBeenCalledWith({
      data: { ...data, userId: 'new-owner' },
    });
    await service.update(
      'block-1',
      { ...data, ownerEmail: 'owner@example.com' },
      admin,
    );
    expect(prisma.pixelBlock.update).toHaveBeenCalledWith({
      where: { id: 'block-1' },
      data: { ...data, userId: 'new-owner' },
    });
  });

  it('rejects unknown owners without writing a block', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.pixelBlock.findUnique.mockResolvedValue({
      id: 'block-1',
      userId: null,
    });
    const admin = { id: 'admin-1', role: 'ADMIN' as const };
    const data = {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      contentType: 'TEXT' as const,
      colors: [],
      ownerEmail: 'missing@example.com',
    };
    await expect(service.create(data, admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.update('block-1', data, admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.pixelBlock.create).not.toHaveBeenCalled();
    expect(prisma.pixelBlock.update).not.toHaveBeenCalled();
  });

  it('rejects owner assignment by ordinary users even on their own block', async () => {
    prisma.pixelBlock.findUnique.mockResolvedValue({
      id: 'block-1',
      userId: 'owner-1',
    });
    const user = { id: 'owner-1', role: 'USER' as const };
    const data = {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      contentType: 'TEXT' as const,
      colors: [],
      ownerEmail: 'owner@example.com',
    };
    await expect(service.create(data, user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.update('block-1', data, user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.pixelBlock.create).not.toHaveBeenCalled();
    expect(prisma.pixelBlock.update).not.toHaveBeenCalled();
  });
});
