import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UserDto } from '../users/dto/user.dto.js';
import { PixelBlockDto } from './dto/pixel-block.dto.js';
import { CreatePixelBlockDto } from './dto/create-pixel-block.dto.js';
import { UpdatePixelBlockDto } from './dto/update-pixel-block.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Actor = Pick<UserDto, 'id' | 'role'>;

type Rectangle = Pick<CreatePixelBlockDto, 'x' | 'y' | 'width' | 'height'>;

@Injectable()
export class PixelBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  private isOverlapping(a: Rectangle, b: Rectangle): boolean {
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

    if (pixelBlocks.some((block) => this.isOverlapping(candidate, block))) {
      throw new ConflictException('Pixel block overlaps an existing block');
    }
  }

  private async resolveOwner(
    ownerEmail: string | undefined,
    actor: Actor,
  ): Promise<string | undefined> {
    if (ownerEmail === undefined) return undefined;
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrators can change block ownership',
      );
    }
    const owner = await this.prisma.user.findUnique({
      where: { email: ownerEmail },
      select: { id: true },
    });
    if (!owner)
      throw new NotFoundException('No registered user with this email');
    return owner.id;
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

  async create(
    data: CreatePixelBlockDto,
    actor: Actor,
  ): Promise<PixelBlockDto> {
    const { ownerEmail, ...blockData } = data;
    const userId = (await this.resolveOwner(ownerEmail, actor)) ?? actor.id;
    await this.ensureNoOverlap(blockData);

    return this.prisma.pixelBlock.create({ data: { ...blockData, userId } });
  }

  async update(
    id: string,
    data: UpdatePixelBlockDto,
    actor: Actor,
  ): Promise<PixelBlockDto> {
    const block = await this.findOne(id);
    if (actor.role !== 'ADMIN' && block.userId !== actor.id) {
      throw new ForbiddenException(
        'Only the owner or an administrator can modify this block',
      );
    }
    const { ownerEmail, ...blockData } = data;
    const userId = await this.resolveOwner(ownerEmail, actor);
    await this.ensureNoOverlap(blockData, id);

    return this.prisma.pixelBlock.update({
      where: { id },
      data: { ...blockData, ...(userId === undefined ? {} : { userId }) },
    });
  }

  async delete(id: string, actor: Actor): Promise<void> {
    const block = await this.findOne(id);
    if (actor.role !== 'ADMIN' && block.userId !== actor.id) {
      throw new ForbiddenException(
        'Only the owner or an administrator can modify this block',
      );
    }

    await this.prisma.pixelBlock.delete({
      where: { id },
    });
  }
}
