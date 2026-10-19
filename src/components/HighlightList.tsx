import { MAX_DURATION, MIN_DURATION, type Highlight } from '../domain/highlights';
import { formatTime } from '../domain/time';

interface HighlightListProps {
  highlights: readonly Highlight[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPlay: (start: number) => void;
  onChange: (id: string, changes: Partial<Omit<Highlight, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function HighlightList({
  highlights,
  selectedId,
  onSelect,
  onPlay,
  onChange,
  onRemove,
}: HighlightListProps) {
  return (
    <section className="card" aria-labelledby="highlights-heading">
      <h2 id="highlights-heading">
        <span className="step">2</span> Highlights
      </h2>

      {highlights.length === 0 ? (
        <p className="muted">
          Watch the video and click “Mark highlight” when you find a useful moment.
        </p>
      ) : (
        <ol className="highlight-list">
          {highlights.map((highlight, index) => (
            <HighlightCard
              key={highlight.id}
              index={index}
              highlight={highlight}
              isSelected={highlight.id === selectedId}
              onSelect={() => onSelect(highlight.id)}
              onPlay={() => onPlay(highlight.start)}
              onChange={(changes) => onChange(highlight.id, changes)}
              onRemove={() => onRemove(highlight.id)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

interface HighlightCardProps {
  index: number;
  highlight: Highlight;
  isSelected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onChange: (changes: Partial<Omit<Highlight, 'id'>>) => void;
  onRemove: () => void;
}

function HighlightCard({
  index,
  highlight,
  isSelected,
  onSelect,
  onPlay,
  onChange,
  onRemove,
}: HighlightCardProps) {
  const noteId = `note-${highlight.id}`;
  const durationId = `duration-${highlight.id}`;
  const title = `Clip ${index + 1} · ${formatTime(highlight.start)}`;

  return (
    <li className={`highlight ${isSelected ? 'is-selected' : ''}`} onFocus={onSelect}>
      <div className="highlight-head">
        <button
          type="button"
          className="highlight-title"
          aria-pressed={isSelected}
          onClick={onSelect}
        >
          {title}
        </button>
        <div className="highlight-actions">
          <button type="button" className="button small" onClick={onPlay}>
            Play
          </button>
          <button
            type="button"
            className="button small ghost"
            onClick={onRemove}
            aria-label={`Remove ${title}`}
          >
            Remove
          </button>
        </div>
      </div>

      <label htmlFor={noteId}>Why is this useful?</label>
      <textarea
        id={noteId}
        value={highlight.note}
        placeholder="Example: explains how 5G improves media workflows"
        onChange={(event) => onChange({ note: event.target.value })}
      />

      <label htmlFor={durationId}>Clip duration (seconds)</label>
      <input
        id={durationId}
        type="number"
        inputMode="numeric"
        min={MIN_DURATION}
        max={MAX_DURATION}
        value={highlight.duration}
        onChange={(event) => {
          const value = event.target.valueAsNumber;
          if (!Number.isNaN(value)) onChange({ duration: value });
        }}
      />
    </li>
  );
}
