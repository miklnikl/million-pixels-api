import type { Response } from 'express';
import { SessionService } from '../auth/session.service.js';
import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { UsersService } from './users.service.js';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto.js';
import { UserDto } from './dto/user.dto.js';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private sessions: SessionService,
  ) {}

  @Get('leaderboard')
  @ApiOkResponse({ type: LeaderboardEntryDto, isArray: true })
  leaderboard(): Promise<LeaderboardEntryDto[]> {
    return this.usersService.leaderboard();
  }

  @Post()
  @ApiCreatedResponse({ type: UserDto })
  @ApiConflictResponse({
    description: 'User with this email already exists',
  })
  async create(
    @Body() data: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserDto> {
    const user = await this.usersService.create(data);
    await this.sessions.create(user.id, response);
    return user;
  }
}
