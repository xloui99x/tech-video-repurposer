import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DURATION,
  MAX_DURATION,
  MIN_DURATION,
  createHighlight,
  effectiveDuration,
  highlightsReducer,
  initialHighlightsState,
  selectedHighlight,
  type HighlightsAction,
  type HighlightsState,
} from './highlights';

const run = (...actions: HighlightsAction[]): HighlightsState =>
  actions.reduce(highlightsReducer, initialHighlightsState);

const add = (start: number, id: string): HighlightsAction => ({
  type: 'add',
  highlight: createHighlight(start, id),
});

describe('highlightsReducer', () => {
  it('adds a highlight with the default duration and selects it', () => {
    const state = run(add(12, 'a'));
    expect(state.items).toEqual([{ id: 'a', start: 12, duration: DEFAULT_DURATION, note: '' }]);
    expect(state.selectedId).toBe('a');
  });

  it('keeps highlights in timeline order regardless of when they were marked', () => {
    const state = run(add(40, 'late'), add(5, 'early'), add(20, 'middle'));
    expect(state.items.map((h) => h.id)).toEqual(['early', 'middle', 'late']);
  });

  it('clamps the duration to the allowed range', () => {
    const tooShort = run(add(0, 'a'), { type: 'update', id: 'a', changes: { duration: 1 } });
    const tooLong = run(add(0, 'a'), { type: 'update', id: 'a', changes: { duration: 999 } });
    expect(tooShort.items[0]?.duration).toBe(MIN_DURATION);
    expect(tooLong.items[0]?.duration).toBe(MAX_DURATION);
  });

  it('updates the note without touching other highlights', () => {
    const state = run(add(0, 'a'), add(10, 'b'), {
      type: 'update',
      id: 'a',
      changes: { note: 'Key quote' },
    });
    expect(state.items.find((h) => h.id === 'a')?.note).toBe('Key quote');
    expect(state.items.find((h) => h.id === 'b')?.note).toBe('');
  });

  it('selects the next highlight after removing the selected one', () => {
    const state = run(
      add(0, 'a'),
      add(10, 'b'),
      add(20, 'c'),
      { type: 'select', id: 'b' },
      {
        type: 'remove',
        id: 'b',
      },
    );
    expect(state.items.map((h) => h.id)).toEqual(['a', 'c']);
    expect(state.selectedId).toBe('c');
  });

  it('clears the selection when the last highlight is removed', () => {
    const state = run(add(0, 'a'), { type: 'remove', id: 'a' });
    expect(state).toEqual(initialHighlightsState);
  });

  it('ignores selecting or removing an unknown id', () => {
    const before = run(add(0, 'a'));
    expect(highlightsReducer(before, { type: 'select', id: 'x' })).toBe(before);
    expect(highlightsReducer(before, { type: 'remove', id: 'x' })).toBe(before);
  });

  it('resets to the initial state', () => {
    expect(run(add(0, 'a'), { type: 'reset' })).toEqual(initialHighlightsState);
  });
});

describe('selectedHighlight', () => {
  it('returns the selected item', () => {
    expect(selectedHighlight(run(add(3, 'a')))?.start).toBe(3);
    expect(selectedHighlight(initialHighlightsState)).toBeUndefined();
  });
});

describe('effectiveDuration', () => {
  const highlight = createHighlight(50, 'a');

  it('shortens a clip that would run past the end of the video', () => {
    expect(effectiveDuration(highlight, 55)).toBe(5);
  });

  it('keeps the full length when it fits', () => {
    expect(effectiveDuration(highlight, 600)).toBe(DEFAULT_DURATION);
  });

  it('falls back to the requested length while the duration is unknown', () => {
    expect(effectiveDuration(highlight, 0)).toBe(DEFAULT_DURATION);
    expect(effectiveDuration(highlight, Number.NaN)).toBe(DEFAULT_DURATION);
  });
});
