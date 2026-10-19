import { useCallback, useRef, useState } from 'react';

export interface VideoSource {
  readonly file: File;
  /** blob: URL for <video src>. */
  readonly url: string;
}

/**
 * Holds the selected video and its blob: URL.
 *
 * The URL is created in the event handler (not in an effect) and the previous
 * one is revoked when a new file is chosen, so a long editing session with many
 * large videos does not keep them all in memory.
 */
export function useVideoSource(): [VideoSource | null, (file: File) => void] {
  const [source, setSource] = useState<VideoSource | null>(null);
  const currentUrl = useRef<string | null>(null);

  const select = useCallback((file: File) => {
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    const url = URL.createObjectURL(file);
    currentUrl.current = url;
    setSource({ file, url });
  }, []);

  return [source, select];
}
