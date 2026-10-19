/**
 * Output formats a highlight can be exported to.
 *
 * Every format is a fixed frame. The source video is scaled to cover the frame
 * and then center-cropped, so a 16:9 recording becomes a clean 9:16 Reel
 * without letterboxing.
 */
export interface ExportFormat {
  readonly id: ExportFormatId;
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

export type ExportFormatId = 'full-hd' | '4k' | 'square' | 'vertical';

const FULL_HD: ExportFormat = { id: 'full-hd', name: 'Full HD', width: 1920, height: 1080 };

export const EXPORT_FORMATS: readonly ExportFormat[] = [
  FULL_HD,
  { id: '4k', name: '4K', width: 3840, height: 2160 },
  { id: 'square', name: 'LinkedIn Square', width: 1080, height: 1080 },
  { id: 'vertical', name: 'Reels / TikTok', width: 1080, height: 1920 },
];

export const DEFAULT_FORMAT = FULL_HD;

/** "1920×1080" */
export function formatResolution({ width, height }: ExportFormat): string {
  return `${width}×${height}`;
}

/** CSS `aspect-ratio` value, e.g. "1920 / 1080". */
export function cssAspectRatio({ width, height }: ExportFormat): string {
  return `${width} / ${height}`;
}

export function findFormat(id: string): ExportFormat | undefined {
  return EXPORT_FORMATS.find((format) => format.id === id);
}
