import { Injectable, NotFoundException } from '@nestjs/common';
import { PixelBlockDto } from './dto/pixel-block.dto.js';
import { CreatePixelBlockDto } from './dto/create-pixel-block.dto.js';
import { UpdatePixelBlockDto } from './dto/update-pixel-block.dto.js';

const pixelBlocks: PixelBlockDto[] = [
  {
    id: '123',
    x: 10,
    y: 20,
    width: 5,
    height: 5,
    contentType: 'TEXT',
    createdAt: new Date(),
    updatedAt: new Date(),
    content: 'Hello!',
  },
];

@Injectable()
export class PixelBlocksService {
  findAll() {
    return pixelBlocks;
  }

  findOne(id: string) {
    const result = pixelBlocks.find((item) => item.id === id);
    if (!result) {
      throw new NotFoundException(`Pixel block ${id} not found`);
    }
    return result;
  }

  create(data: CreatePixelBlockDto) {
    const pixelBlock: PixelBlockDto = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };

    pixelBlocks.push(pixelBlock);

    return pixelBlock;
  }

  update(id: string, data: UpdatePixelBlockDto) {
    let index = pixelBlocks.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new NotFoundException(`Pixel block ${id} not found`);
    }

    const updatedPixelBlock = {
      ...pixelBlocks[index],
      ...data,
      updatedAt: new Date(),
    };
    pixelBlocks[index] = updatedPixelBlock;
    return updatedPixelBlock;
  }

  delete(id: string) {
    const index = pixelBlocks.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new NotFoundException(`Pixel block ${id} not found`);
    }

    pixelBlocks.splice(index, 1);
  }
}
