import { Test, TestingModule } from '@nestjs/testing';
import { PixelBlocksService } from './pixel-blocks.service.js';

describe('PixelBlocksService', () => {
  let service: PixelBlocksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PixelBlocksService],
    }).compile();

    service = module.get<PixelBlocksService>(PixelBlocksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
