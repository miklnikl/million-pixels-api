import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { UserDto } from '../users/dto/user.dto.js';
import { SessionService } from './session.service.js';

export type AuthenticatedRequest = Request & { user: UserDto };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user = await this.sessions.getUser(request);
    return true;
  }
}
