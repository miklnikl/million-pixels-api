import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class PixelBlockDto {
  /** Unique identifier of the pixel block. @example 550e8400-e29b-41d4-a716-446655440000 */
  @IsUUID()
  id: string;

  /** Horizontal coordinate of the pixel block. @example 10 */
  @IsInt()
  @Min(0)
  x: number;

  /** Vertical coordinate of the pixel block. @example 20 */
  @IsInt()
  @Min(0)
  y: number;

  /** Width of the pixel block. @example 5 */
  @IsInt()
  @Min(1)
  width: number;

  /** Height of the pixel block. @example 5 */
  @IsInt()
  @Min(1)
  height: number;

  /** Type of content displayed in the pixel block. @example TEXT */
  @IsOptional()
  @IsIn(['IMAGE', 'TEXT'])
  contentType: 'IMAGE' | 'TEXT' | null;

  /** Content displayed in the pixel block. @example Hello! */
  @IsOptional()
  @IsString()
  content?: string | null;

  /** Date and time when the pixel block was created. @example 2026-08-30T10:00:00.000Z */
  @IsDate()
  createdAt: Date;

  /** Date and time when the pixel block was last updated. @example 2026-08-30T10:00:00.000Z */
  @IsDate()
  updatedAt: Date;

  /** Pixel Colors array should be width x height or empty*/
  @IsArray()
  colors: string[];
}
