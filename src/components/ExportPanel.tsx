import type { CSSProperties } from 'react';
import {
  EXPORT_FORMATS,
  cssAspectRatio,
  findFormat,
  formatResolution,
  type ExportFormat,
} from '../domain/formats';
import type { Highlight } from '../domain/highlights';
import { formatTime } from '../domain/time';
import type { ExportStatus } from '../hooks/useClipExporter';

interface ExportPanelProps {
  videoUrl: string | null;
  highlight: Highlight | undefined;
  clipLength: number;
  format: ExportFormat;
  status: ExportStatus;
  isBusy: boolean;
  onFormatChange: (format: ExportFormat) => void;
  onExport: () => void;
}

export function ExportPanel({
  videoUrl,
  highlight,
  clipLength,
  format,
  status,
  isBusy,
  onFormatChange,
  onExport,
}: ExportPanelProps) {
  const canExport = Boolean(videoUrl && highlight && clipLength > 0) && !isBusy;

  return (
    <section className="card export" aria-labelledby="export-heading">
      <h2 id="export-heading">
        <span className="step">3</span> Export
      </h2>

      <label htmlFor="format">Format</label>
      <select
        id="format"
        value={format.id}
        onChange={(event) => {
          const next = findFormat(event.target.value);
          if (next) onFormatChange(next);
        }}
      >
        {EXPORT_FORMATS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name} — {formatResolution(option)}
          </option>
        ))}
      </select>

      {/* The preview uses the target aspect ratio, so the crop is visible before exporting. */}
      <div
        className="preview"
        style={
          {
            aspectRatio: cssAspectRatio(format),
            '--ratio': format.width / format.height,
          } as CSSProperties
        }
      >
        {videoUrl ? (
          <video src={videoUrl} muted autoPlay loop playsInline aria-hidden="true" />
        ) : (
          <div className="preview-empty">Upload a video first</div>
        )}
        {highlight && (
          <div className="preview-caption">
            <strong>{highlight.note || 'Selected highlight'}</strong>
            <span>
              {formatTime(highlight.start)} · {clipLength}s · {formatResolution(format)}
            </span>
          </div>
        )}
      </div>

      <button type="button" className="button primary" disabled={!canExport} onClick={onExport}>
        {isBusy ? 'Exporting…' : 'Export clip'}
      </button>

      <StatusMessage status={status} />
    </section>
  );
}

function StatusMessage({ status }: { status: ExportStatus }) {
  return (
    <div className="status" role="status" aria-live="polite">
      {status.phase === 'loading-engine' && <p>Loading the video engine (first export only)…</p>}
      {status.phase === 'rendering' && (
        <>
          <p>Rendering… {Math.round(status.progress * 100)}%</p>
          <progress value={status.progress} max={1} />
        </>
      )}
      {status.phase === 'done' && <p className="success">Saved {status.fileName}</p>}
      {status.phase === 'error' && <p className="error">{status.message}</p>}
    </div>
  );
}
