export class LeaderboardBlockDto {
  width: number;
  height: number;
  colors: string[];
  contentType: 'IMAGE' | 'TEXT' | null;
  content: string | null;

  /** Calculated value at $1 per pixel, not a recorded payment. */
  priceUsd: number;
}

export class LeaderboardEntryDto {
  /** Position in the ranking, starting at 1. */
  rank: number;

  /** Ranked block; equal areas use ascending block ID. */
  block: LeaderboardBlockDto;

  /** Owner email with the local part masked. @example a***@example.com */
  maskedEmail: string;

  /** Number of pixels in this block. */
  pixels: number;
}
