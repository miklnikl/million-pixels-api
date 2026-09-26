import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserDto } from '../users/dto/user.dto.js';
import { LoginDto } from './dto/login.dto.js';

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$cYileJHDQAvBT8Z/+EmmiA$KD1GTxal4CQoo8bsIefnEM0TpH5/hfP0K0MtkFSip2Y';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(data: LoginDto): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const isPasswordValid = await this.isPasswordValid(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      data.password,
    );

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async isPasswordValid(
    passwordHash: string,
    password: string,
  ): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
