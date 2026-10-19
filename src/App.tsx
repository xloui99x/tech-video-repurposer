import { useCallback, useReducer, useRef, useState } from 'react';
import { ExportPanel } from './components/ExportPanel';
import { HighlightList } from './components/HighlightList';
import { SourceVideo } from './components/SourceVideo';
import { clipFileName } from './domain/ffmpegCommand';
import { DEFAULT_FORMAT, type ExportFormat } from './domain/formats';
import {
  createHighlight,
  effectiveDuration,
  highlightsReducer,
  initialHighlightsState,
  selectedHighlight,
} from './domain/highlights';
import { useClipExporter } from './hooks/useClipExporter';
import { useVideoSource } from './hooks/useVideoSource';

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [source, selectSource] = useVideoSource();
  const [videoDuration, setVideoDuration] = useState(0);
  const [format, setFormat] = useState<ExportFormat>(DEFAULT_FORMAT);
  const [highlights, dispatch] = useReducer(highlightsReducer, initialHighlightsState);

  const videoUrl = source?.url ?? null;
  const { status, isBusy, exportClip } = useClipExporter();

  const selected = selectedHighlight(highlights);
  const clipLength = selected ? effectiveDuration(selected, videoDuration) : 0;

  const handleFileSelected = (next: File) => {
    selectSource(next);
    setVideoDuration(0);
    dispatch({ type: 'reset' });
  };

  const markHighlight = useCallback(() => {
    const video = videoRef.current;
    if (video) dispatch({ type: 'add', highlight: createHighlight(video.currentTime) });
  }, []);

  const playFrom = (start: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = start;
    void video.play();
  };

  const handleExport = () => {
    if (!source || !selected) return;
    const index = highlights.items.indexOf(selected);
    void exportClip(source.file, {
      outputName: clipFileName(index, format),
      start: selected.start,
      duration: clipLength,
      format,
    });
  };

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">Media tech · runs entirely in your browser</p>
        <h1>Video Highlight Exporter</h1>
        <p>
          Upload a long video, mark the strong moments, note why they matter and export
          platform-ready clips for Full HD, 4K, LinkedIn or Reels. Nothing is uploaded.
        </p>
      </header>

      <div className="layout">
        <div className="column">
          <SourceVideo
            videoUrl={videoUrl}
            videoRef={videoRef}
            onFileSelected={handleFileSelected}
            onDurationChange={setVideoDuration}
            onMarkHighlight={markHighlight}
          />
          <HighlightList
            highlights={highlights.items}
            selectedId={highlights.selectedId}
            onSelect={(id) => dispatch({ type: 'select', id })}
            onPlay={playFrom}
            onChange={(id, changes) => dispatch({ type: 'update', id, changes })}
            onRemove={(id) => dispatch({ type: 'remove', id })}
          />
        </div>

        <ExportPanel
          videoUrl={videoUrl}
          highlight={selected}
          clipLength={clipLength}
          format={format}
          status={status}
          isBusy={isBusy}
          onFormatChange={setFormat}
          onExport={handleExport}
        />
      </div>
    </main>
  );
}
