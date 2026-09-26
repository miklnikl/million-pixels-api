import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { UserDto } from '../users/dto/user.dto.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SessionService } from './session.service.js';
import { SessionGuard } from './session.guard.js';
import type { AuthenticatedRequest } from './session.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in and create a session' })
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  async login(
    @Body() data: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserDto> {
    const user = await this.authService.login(data);
    await this.sessions.create(user.id, response);
    return user;
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: UserDto })
  me(@Req() request: AuthenticatedRequest): UserDto {
    return request.user;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.sessions.logout(request, response);
  }
}
