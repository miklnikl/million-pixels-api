export class PixelBlockDto {
  /** Unique identifier of the pixel block. @example 123 */
  id: string;

  /** Horizontal coordinate of the pixel block. @example 10 */
  x: number;

  /** Vertical coordinate of the pixel block. @example 20 */
  y: number;

  /** Width of the pixel block. @example 5 */
  width: number;

  /** Height of the pixel block. @example 5 */
  height: number;

  /** Type of content displayed in the pixel block. @example TEXT */
  contentType: 'IMAGE' | 'TEXT';

  /** Content displayed in the pixel block. @example Hello! */
  content?: string;

  /** Date and time when the pixel block was created. @example 2026-08-30T10:00:00.000Z */
  createdAt: Date;

  /** Date and time when the pixel block was last updated. @example 2026-08-30T10:00:00.000Z */
  updatedAt: Date;
}
