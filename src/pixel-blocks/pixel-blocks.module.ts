import { Module } from '@nestjs/common';
import { PixelBlocksController } from './pixel-blocks.controller.js';
import { PixelBlocksService } from './pixel-blocks.service.js';

@Module({
  controllers: [PixelBlocksController],
  providers: [PixelBlocksService]
})
export class PixelBlocksModule {}
