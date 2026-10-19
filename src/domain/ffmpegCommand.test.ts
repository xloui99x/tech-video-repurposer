import { describe, expect, it } from 'vitest';
import { buildClipArgs, clipFileName, inputFileName } from './ffmpegCommand';
import { EXPORT_FORMATS, findFormat } from './formats';

const vertical = findFormat('vertical')!;

describe('buildClipArgs', () => {
  const args = buildClipArgs({
    inputName: 'input.mov',
    outputName: 'clip-01-1080x1920.mp4',
    start: 12.5,
    duration: 15,
    format: vertical,
  });

  const valueAfter = (flag: string) => args[args.indexOf(flag) + 1];

  it('seeks before the input for fast trimming', () => {
    expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'));
    expect(valueAfter('-ss')).toBe('12.500');
    expect(valueAfter('-t')).toBe('15.000');
    expect(valueAfter('-i')).toBe('input.mov');
  });

  it('scales to cover the frame and crops to the exact target size', () => {
    expect(valueAfter('-vf')).toBe(
      'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1',
    );
  });

  it('produces a widely compatible H.264/AAC file and writes it last', () => {
    expect(valueAfter('-c:v')).toBe('libx264');
    expect(valueAfter('-pix_fmt')).toBe('yuv420p');
    expect(valueAfter('-c:a')).toBe('aac');
    expect(args.at(-1)).toBe('clip-01-1080x1920.mp4');
  });

  it('never passes a negative start time', () => {
    const negative = buildClipArgs({
      inputName: 'in.mp4',
      outputName: 'out.mp4',
      start: -2,
      duration: 5,
      format: vertical,
    });
    expect(negative[negative.indexOf('-ss') + 1]).toBe('0.000');
  });
});

describe('clipFileName', () => {
  it('numbers clips from 01 and includes the resolution', () => {
    expect(clipFileName(0, vertical)).toBe('clip-01-1080x1920.mp4');
    expect(clipFileName(11, EXPORT_FORMATS[1]!)).toBe('clip-12-3840x2160.mp4');
  });
});

describe('inputFileName', () => {
  it.each([
    ['talk.MOV', 'input.mov'],
    ['webinar.final.webm', 'input.webm'],
    ['no-extension', 'input.mp4'],
  ])('maps %s to %s', (name, expected) => {
    expect(inputFileName({ name })).toBe(expected);
  });
});
