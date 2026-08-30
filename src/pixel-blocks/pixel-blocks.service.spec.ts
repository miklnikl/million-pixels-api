import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { PixelBlocksService } from './pixel-blocks.service.js';

const createPrismaMock = () => ({
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject creation when a pixel block overlaps', async () => {
    prisma.pixelBlock.findMany.mockResolvedValue([
      { x: 10, y: 10, width: 10, height: 10 },
    ]);

    const result = service.create({
      x: 15,
      y: 15,
      width: 10,
      height: 10,
      contentType: 'TEXT',
      content: 'Overlapping block',
    });

    await expect(result).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.pixelBlock.create).not.toHaveBeenCalled();
  });

  it('should reject update when a pixel block overlaps another block', async () => {
    prisma.pixelBlock.findUnique.mockResolvedValue({
      id: 'block-1',
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

    const result = service.update('block-1', {
      x: 15,
      y: 15,
      width: 10,
      height: 10,
      contentType: 'IMAGE',
    });

    await expect(result).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.pixelBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { not: 'block-1' } },
      }),
    );
    expect(prisma.pixelBlock.update).not.toHaveBeenCalled();
  });
});
