import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createHighlight } from '../domain/highlights';
import { HighlightList } from './HighlightList';

function setup() {
  const handlers = {
    onSelect: vi.fn(),
    onPlay: vi.fn(),
    onChange: vi.fn(),
    onRemove: vi.fn(),
  };
  const highlights = [createHighlight(5, 'a'), createHighlight(65, 'b')];
  render(<HighlightList highlights={highlights} selectedId="a" {...handlers} />);
  return { handlers, user: userEvent.setup() };
}

describe('HighlightList', () => {
  it('shows an empty state before anything is marked', () => {
    render(
      <HighlightList
        highlights={[]}
        selectedId={null}
        onSelect={vi.fn()}
        onPlay={vi.fn()}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText(/click “Mark highlight”/i)).toBeInTheDocument();
  });

  it('lists clips with their start time and marks the selected one', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Clip 1 · 0:05' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Clip 2 · 1:05' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('plays a clip from its start position', async () => {
    const { handlers, user } = setup();
    await user.click(screen.getAllByRole('button', { name: 'Play' })[1]!);
    expect(handlers.onPlay).toHaveBeenCalledWith(65);
  });

  it('reports note edits for the right highlight', async () => {
    const { handlers, user } = setup();
    await user.type(screen.getAllByLabelText('Why is this useful?')[0]!, 'X');
    expect(handlers.onChange).toHaveBeenLastCalledWith('a', { note: 'X' });
  });

  it('removes a highlight via an accessible button', async () => {
    const { handlers, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Remove Clip 2 · 1:05' }));
    expect(handlers.onRemove).toHaveBeenCalledWith('b');
  });
});
