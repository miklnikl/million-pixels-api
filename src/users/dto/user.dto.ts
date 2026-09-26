import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsIn,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { PixelBlockDto } from '../../pixel-blocks/dto/pixel-block.dto.js';

export class UserDto {
  /** User role. Public registration always creates a USER. */
  @IsIn(['USER', 'ADMIN'])
  role: 'USER' | 'ADMIN';

  /** Unique identifier of the user. @example 550e8400-e29b-41d4-a716-446655440000 */
  @IsUUID()
  id: string;

  /** User email address. @example user@example.com */
  @IsEmail()
  email: string;

  /** Date and time when the user was created. @example 2026-09-03T10:00:00.000Z */
  @IsDate()
  createdAt: Date;

  /** Date and time when the user was last updated. @example 2026-09-03T10:00:00.000Z */
  @IsDate()
  updatedAt: Date;

  /** Pixel blocks owned by the user. Present when the relation is loaded. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PixelBlockDto)
  pixelBlocks?: PixelBlockDto[];
}
