import { APP_GUARD } from '@nestjs/core';
import { SessionService } from './session.service.js';
import { SessionGuard } from './session.guard.js';
import { CsrfGuard } from './csrf.guard.js';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    SessionGuard,
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
  exports: [SessionService, SessionGuard],
})
export class AuthModule {}
