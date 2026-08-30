import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePixelBlockDto {
  /** Horizontal coordinate of the pixel block. @example 100 */
  @IsInt()
  @Min(0)
  x: number;

  /** Vertical coordinate of the pixel block. @example 100 */
  @IsInt()
  @Min(0)
  y: number;

  /** Width of the pixel block. @example 10 */
  @IsInt()
  @Min(1)
  width: number;

  /** Height of the pixel block. @example 10 */
  @IsInt()
  @Min(1)
  height: number;

  /** Type of content displayed in the pixel block. @example IMAGE */
  @IsIn(['IMAGE', 'TEXT'])
  contentType: 'IMAGE' | 'TEXT';

  /** Content displayed in the pixel block. @example https://example.com/image.png */
  @IsOptional()
  @IsString()
  content?: string;
}
