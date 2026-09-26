import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    // Mutations must use JSON: cross-site HTML forms cannot submit this type.
    if (!request.is('application/json')) throw new ForbiddenException();
    const origin = request.headers.origin;
    if (origin && origin !== process.env.FRONTEND_URL) {
      throw new ForbiddenException();
    }
    return true;
  }
}
