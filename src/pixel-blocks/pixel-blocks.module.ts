import { Module } from '@nestjs/common';
import { PixelBlocksController } from './pixel-blocks.controller.js';
import { PixelBlocksService } from './pixel-blocks.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  controllers: [PixelBlocksController],
  providers: [PixelBlocksService],
  imports: [PrismaModule],
})
export class PixelBlocksModule {}
