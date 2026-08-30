import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { PixelBlocksService } from './pixel-blocks.service.js';
import { CreatePixelBlockDto } from './dto/create-pixel-block.dto.js';
import { PixelBlockDto } from './dto/pixel-block.dto.js';
import { UpdatePixelBlockDto } from './dto/update-pixel-block.dto.js';

@Controller('pixel-blocks')
export class PixelBlocksController {
  constructor(private pixelBlocksService: PixelBlocksService) {}

  @Get()
  @ApiOkResponse({ type: PixelBlockDto, isArray: true })
  findAll(): Promise<PixelBlockDto[]> {
    return this.pixelBlocksService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: PixelBlockDto })
  @ApiNotFoundResponse({ description: 'Pixel block not found' })
  findOne(@Param('id') id: string): Promise<PixelBlockDto> {
    return this.pixelBlocksService.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: PixelBlockDto })
  @ApiConflictResponse({
    description: 'Pixel block overlaps an existing block',
  })
  create(@Body() data: CreatePixelBlockDto): Promise<PixelBlockDto> {
    return this.pixelBlocksService.create(data);
  }

  @Put(':id')
  @ApiOkResponse({ type: PixelBlockDto })
  @ApiNotFoundResponse({ description: 'Pixel block not found' })
  @ApiConflictResponse({
    description: 'Pixel block overlaps an existing block',
  })
  update(
    @Param('id') id: string,
    @Body() data: UpdatePixelBlockDto,
  ): Promise<PixelBlockDto> {
    return this.pixelBlocksService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Pixel block deleted' })
  @ApiNotFoundResponse({ description: 'Pixel block not found' })
  delete(@Param('id') id: string): Promise<void> {
    return this.pixelBlocksService.delete(id);
  }
}
