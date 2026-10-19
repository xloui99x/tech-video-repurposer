import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
// Bundled with the app instead of loaded from a CDN: no third-party runtime dependency.
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildClipArgs, inputFileName, type ClipRequest } from '../domain/ffmpegCommand';

export type ExportStatus =
  | { phase: 'idle' }
  | { phase: 'loading-engine' }
  | { phase: 'rendering'; progress: number }
  | { phase: 'done'; fileName: string }
  | { phase: 'error'; message: string };

export interface ClipExporter {
  status: ExportStatus;
  isBusy: boolean;
  exportClip: (source: File, request: Omit<ClipRequest, 'inputName'>) => Promise<void>;
}

/**
 * Encodes clips in the browser with FFmpeg compiled to WebAssembly.
 * The ~30 MB engine is fetched lazily on the first export, not on page load.
 * Nothing is uploaded: the video never leaves the user's machine.
 */
export function useClipExporter(): ClipExporter {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [status, setStatus] = useState<ExportStatus>({ phase: 'idle' });

  useEffect(() => () => ffmpegRef.current?.terminate(), []);

  const loadEngine = useCallback(async (): Promise<FFmpeg> => {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;

    setStatus({ phase: 'loading-engine' });
    const ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress }) => {
      setStatus({ phase: 'rendering', progress: Math.min(1, Math.max(0, progress)) });
    });
    // Single-threaded core: works without cross-origin isolation (e.g. on GitHub Pages).
    await ffmpeg.load({ coreURL, wasmURL });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }, []);

  const exportClip = useCallback<ClipExporter['exportClip']>(
    async (source, request) => {
      const inputName = inputFileName(source);
      let ffmpeg: FFmpeg | null = null;

      try {
        ffmpeg = await loadEngine();
        setStatus({ phase: 'rendering', progress: 0 });

        await ffmpeg.writeFile(inputName, await fetchFile(source));
        const exitCode = await ffmpeg.exec(buildClipArgs({ ...request, inputName }));
        if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}`);

        const data = await ffmpeg.readFile(request.outputName);
        if (typeof data === 'string') throw new Error('Unexpected text output from FFmpeg');

        downloadBlob(new Blob([data as BlobPart], { type: 'video/mp4' }), request.outputName);
        setStatus({ phase: 'done', fileName: request.outputName });
      } catch (error) {
        console.error('Clip export failed', error);
        setStatus({
          phase: 'error',
          message: 'Export failed. Try a shorter clip or a smaller format first.',
        });
      } finally {
        // Free the in-memory file system; videos can be hundreds of MB.
        await Promise.allSettled([
          ffmpeg?.deleteFile(inputName),
          ffmpeg?.deleteFile(request.outputName),
        ]);
      }
    },
    [loadEngine],
  );

  const isBusy = status.phase === 'loading-engine' || status.phase === 'rendering';
  return { status, isBusy, exportClip };
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Give the browser a moment to start the download before releasing memory.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
