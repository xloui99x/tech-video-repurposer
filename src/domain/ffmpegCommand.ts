import type { ExportFormat } from './formats';

export interface ClipRequest {
  readonly inputName: string;
  readonly outputName: string;
  /** Start position in seconds. */
  readonly start: number;
  /** Length in seconds. */
  readonly duration: number;
  readonly format: ExportFormat;
}

/**
 * Builds the FFmpeg arguments for one clip.
 *
 * - `-ss` before `-i` seeks on the input, which is fast and accurate enough
 *   because we re-encode anyway.
 * - scale + crop fills the target frame without black bars.
 * - `ultrafast` / CRF 28 keeps WebAssembly encoding times acceptable in the
 *   browser; quality is still fine for social media.
 * - `+faststart` moves the index to the front so the file streams immediately.
 */
export function buildClipArgs({
  inputName,
  outputName,
  start,
  duration,
  format,
}: ClipRequest): string[] {
  const { width, height } = format;
  const filter =
    `scale=${width}:${height}:force_original_aspect_ratio=increase,` +
    `crop=${width}:${height},setsar=1`;

  return [
    '-ss',
    seconds(start),
    '-t',
    seconds(duration),
    '-i',
    inputName,
    '-vf',
    filter,
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    '28',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-movflags',
    '+faststart',
    outputName,
  ];
}

/** Clip file name, e.g. "clip-02-1080x1920.mp4". */
export function clipFileName(index: number, format: ExportFormat): string {
  const position = String(index + 1).padStart(2, '0');
  return `clip-${position}-${format.width}x${format.height}.mp4`;
}

/** Keeps the file extension so FFmpeg can detect the container. */
export function inputFileName(file: Pick<File, 'name'>): string {
  const extension = /\.([a-z0-9]{2,5})$/i.exec(file.name)?.[1]?.toLowerCase() ?? 'mp4';
  return `input.${extension}`;
}

function seconds(value: number): string {
  return Math.max(0, value).toFixed(3);
}
