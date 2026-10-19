import type { Ref } from 'react';

interface SourceVideoProps {
  videoUrl: string | null;
  videoRef: Ref<HTMLVideoElement>;
  onFileSelected: (file: File) => void;
  onDurationChange: (seconds: number) => void;
  onMarkHighlight: () => void;
}

export function SourceVideo({
  videoUrl,
  videoRef,
  onFileSelected,
  onDurationChange,
  onMarkHighlight,
}: SourceVideoProps) {
  return (
    <section className="card" aria-labelledby="source-heading">
      <h2 id="source-heading">
        <span className="step">1</span> Upload video
      </h2>

      <label className="file-input">
        <span>{videoUrl ? 'Choose another video' : 'Choose a video file'}</span>
        <input
          type="file"
          accept="video/*"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onFileSelected(file);
            event.currentTarget.value = '';
          }}
        />
      </label>

      {videoUrl && (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="source-video"
            onLoadedMetadata={(event) => onDurationChange(event.currentTarget.duration)}
            onKeyDown={(event) => {
              if (event.key.toLowerCase() === 'm') {
                event.preventDefault();
                onMarkHighlight();
              }
            }}
          />
          <button type="button" className="button primary" onClick={onMarkHighlight}>
            Mark highlight at current time
          </button>
          <p className="hint">
            Tip: press <kbd>M</kbd> while the video has focus to mark a highlight.
          </p>
        </>
      )}
    </section>
  );
}
