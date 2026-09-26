import { ConflictException, Injectable } from '@nestjs/common';
import { hash } from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto.js';
import { UserDto } from './dto/user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async leaderboard(): Promise<LeaderboardEntryDto[]> {
    const blocks = await this.prisma.pixelBlock.findMany({
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

    return blocks
      .map(({ user, ...block }) => {
        const [local, domain] = user!.email.split('@');
        const pixels = block.width * block.height;
        return {
          maskedEmail: `${local.length > 1 ? local[0] : ''}***@${domain}`,
          pixels,
          block: { ...block, priceUsd: pixels },
        };
      })
      .sort((a, b) => b.pixels - a.pixels)
      .map((entry, index) => ({ rank: index + 1, ...entry }));
  }

  private async ensureNoOverlap(data: Pick<CreateUserDto, 'email'>) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
  }

  async create(data: CreateUserDto): Promise<UserDto> {
    await this.ensureNoOverlap(data);

    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: await hash(data.password),
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
