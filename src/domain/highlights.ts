import { clamp } from './time';

/** A moment in the source video the user wants to turn into a clip. */
export interface Highlight {
  readonly id: string;
  /** Start position in seconds. */
  readonly start: number;
  /** Clip length in seconds. */
  readonly duration: number;
  /** Why this moment matters; also used as the caption in the preview. */
  readonly note: string;
}

export const MIN_DURATION = 3;
export const MAX_DURATION = 60;
export const DEFAULT_DURATION = 15;

export interface HighlightsState {
  readonly items: readonly Highlight[];
  readonly selectedId: string | null;
}

export const initialHighlightsState: HighlightsState = {
  items: [],
  selectedId: null,
};

export type HighlightsAction =
  | { type: 'add'; highlight: Highlight }
  | { type: 'update'; id: string; changes: Partial<Omit<Highlight, 'id'>> }
  | { type: 'remove'; id: string }
  | { type: 'select'; id: string }
  | { type: 'reset' };

/**
 * Pure state transitions for the highlight list.
 *
 * Invariants:
 * - items stay sorted by start time, so the list reads like a timeline
 * - duration is always within [MIN_DURATION, MAX_DURATION]
 * - selectedId always points at an existing item, or is null when empty
 */
export function highlightsReducer(
  state: HighlightsState,
  action: HighlightsAction,
): HighlightsState {
  switch (action.type) {
    case 'add': {
      const highlight = normalize(action.highlight);
      return {
        items: sortByStart([...state.items, highlight]),
        selectedId: highlight.id,
      };
    }
    case 'update': {
      const items = state.items.map((item) =>
        item.id === action.id ? normalize({ ...item, ...action.changes }) : item,
      );
      return { ...state, items: sortByStart(items) };
    }
    case 'remove': {
      const index = state.items.findIndex((item) => item.id === action.id);
      if (index === -1) return state;

      const items = state.items.filter((item) => item.id !== action.id);
      const selectedId =
        state.selectedId === action.id
          ? (items[Math.min(index, items.length - 1)]?.id ?? null)
          : state.selectedId;
      return { items, selectedId };
    }
    case 'select':
      return state.items.some((item) => item.id === action.id)
        ? { ...state, selectedId: action.id }
        : state;
    case 'reset':
      return initialHighlightsState;
  }
}

export function selectedHighlight(state: HighlightsState): Highlight | undefined {
  return state.items.find((item) => item.id === state.selectedId);
}

/** Creates a highlight at the given position with the default length. */
export function createHighlight(start: number, id: string = crypto.randomUUID()): Highlight {
  return { id, start, duration: DEFAULT_DURATION, note: '' };
}

/**
 * Length that actually fits into the source video. A highlight marked
 * 5 seconds before the end exports 5 seconds, not 15.
 */
export function effectiveDuration(highlight: Highlight, videoDuration: number): number {
  if (!Number.isFinite(videoDuration) || videoDuration <= 0) return highlight.duration;
  return Math.max(0, Math.min(highlight.duration, videoDuration - highlight.start));
}

function normalize(highlight: Highlight): Highlight {
  const duration = Number.isFinite(highlight.duration)
    ? clamp(Math.round(highlight.duration), MIN_DURATION, MAX_DURATION)
    : DEFAULT_DURATION;
  return { ...highlight, start: Math.max(0, highlight.start), duration };
}

function sortByStart(items: readonly Highlight[]): Highlight[] {
  return [...items].sort((a, b) => a.start - b.start);
}
