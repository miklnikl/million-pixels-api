import { Test, TestingModule } from '@nestjs/testing';
import { PixelBlocksController } from './pixel-blocks.controller.js';
import { PixelBlocksService } from './pixel-blocks.service.js';

const createPixelBlocksServiceMock = () => ({
  findAll: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('PixelBlocksController', () => {
  let controller: PixelBlocksController;
  let service: ReturnType<typeof createPixelBlocksServiceMock>;

  beforeEach(async () => {
    service = createPixelBlocksServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PixelBlocksController],
      providers: [
        {
          provide: PixelBlocksService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<PixelBlocksController>(PixelBlocksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
