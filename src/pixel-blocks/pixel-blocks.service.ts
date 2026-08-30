import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PixelBlockDto } from './dto/pixel-block.dto.js';
import { CreatePixelBlockDto } from './dto/create-pixel-block.dto.js';
import { UpdatePixelBlockDto } from './dto/update-pixel-block.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Rectangle = Pick<CreatePixelBlockDto, 'x' | 'y' | 'width' | 'height'>;

@Injectable()
export class PixelBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  private isOverlaping(a: Rectangle, b: Rectangle): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private async ensureNoOverlap(
    candidate: Rectangle,
    excludedId?: string,
  ): Promise<void> {
    const pixelBlocks = await this.prisma.pixelBlock.findMany({
      where: excludedId ? { id: { not: excludedId } } : undefined,
      select: {
        x: true,
        y: true,
        width: true,
        height: true,
      },
    });

    if (pixelBlocks.some((block) => this.isOverlaping(candidate, block))) {
      throw new ConflictException('Pixel block overlaps an existing block');
    }
  }

  findAll(): Promise<PixelBlockDto[]> {
    return this.prisma.pixelBlock.findMany();
  }

  async findOne(id: string): Promise<PixelBlockDto> {
    const pixelBlock = await this.prisma.pixelBlock.findUnique({
      where: { id },
    });

    if (!pixelBlock) {
      throw new NotFoundException(`Pixel block ${id} not found`);
    }

    return pixelBlock;
  }

  async create(data: CreatePixelBlockDto): Promise<PixelBlockDto> {
    await this.ensureNoOverlap(data);

    return this.prisma.pixelBlock.create({ data });
  }

  async update(id: string, data: UpdatePixelBlockDto): Promise<PixelBlockDto> {
    await this.findOne(id);
    await this.ensureNoOverlap(data, id);

    return this.prisma.pixelBlock.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.findOne(id);

    await this.prisma.pixelBlock.delete({
      where: { id },
    });
  }
}
