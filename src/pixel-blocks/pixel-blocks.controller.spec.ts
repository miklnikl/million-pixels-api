import { Test, TestingModule } from '@nestjs/testing';
import { PixelBlocksController } from './pixel-blocks.controller.js';

describe('PixelBlocksController', () => {
  let controller: PixelBlocksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PixelBlocksController],
    }).compile();

    controller = module.get<PixelBlocksController>(PixelBlocksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
