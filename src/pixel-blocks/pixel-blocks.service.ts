import { Injectable, NotFoundException } from '@nestjs/common';
import { PixelBlockDto } from './dto/pixel-block.dto.js';
import { CreatePixelBlockDto } from './dto/create-pixel-block.dto.js';
import { UpdatePixelBlockDto } from './dto/update-pixel-block.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PixelBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PixelBlockDto[]> {
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
    return this.prisma.pixelBlock.create({ data });
  }

  async update(id: string, data: UpdatePixelBlockDto): Promise<PixelBlockDto> {
    await this.findOne(id);

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
