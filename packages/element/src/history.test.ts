import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';
import { area, changes, draw, exportedStrokes, inkStrokes, mount, paint } from './test-utils';

interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  empty: boolean;
}

function historyChanges(el: DigitalSignatureFieldElement): HistoryState[] {
  const seen: HistoryState[] = [];
  el.addEventListener('dsf-history-change', (e) => seen.push((e as CustomEvent<HistoryState>).detail));
  return seen;
}

function button(el: DigitalSignatureFieldElement, action: string): HTMLButtonElement | null {
  return el.shadowRoot!.querySelector<HTMLButtonElement>(`[part~="action-${action}"]`);
}

const stateOf = (el: DigitalSignatureFieldElement): HistoryState => ({
  canUndo: el.canUndo,
  canRedo: el.canRedo,
  empty: el.empty,
});

afterEach(() => {
  document.body.replaceChildren();
});

const lines = (value: unknown): number => (value ? exportedStrokes(value).length : 0);

describe('history', () => {
  it('each stroke keeps its own pen colour and width through undo, redo and clear', () => {
    const el = mount({ 'pen-color': '#f00', 'pen-width': '3' });
    draw(el, [[10, 10], [60, 10]]);
    el.penColor = '#00f';
    el.penWidth = 6;
    draw(el, [[10, 50], [60, 50]]);
    const pens = () => inkStrokes(el).map((s) => paint(s));
    const expected = [
      { colors: ['#f00'], widths: [3] },
      { colors: ['#00f'], widths: [6] },
    ];
    expect(pens()).toEqual(expected);
    el.undo();
    expect(pens()).toEqual(expected.slice(0, 1));
    el.redo();
    expect(pens()).toEqual(expected);
    el.clear();
    el.undo();
    expect(pens()).toEqual(expected);
  });

  it('undo() removes the last stroke and fires change with the new value', () => {
    const el = mount();
    draw(el, [[10, 10], [60, 10]]);
    draw(el, [[10, 50], [60, 50]]);
    const seen = changes(el);
    el.undo();
    expect(seen).toHaveLength(1);
    expect(lines(seen[0]!)).toBe(1);
    expect(el.value).toBe(seen[0]);
  });

  it('undoing the only stroke makes the value null', () => {
    const el = mount();
    draw(el, [[10, 10], [60, 10]]);
    const seen = changes(el);
    el.undo();
    expect(seen).toEqual([null]);
    expect(el.value).toBeNull();
  });

  it('undo() with nothing to undo does nothing', () => {
    const el = mount();
    const seen = changes(el);
    el.undo();
    expect(seen).toEqual([]);
  });

  it('redo() re-applies the most recently undone stroke and fires change', () => {
    const el = mount();
    draw(el, [[10, 10], [60, 10]]);
    draw(el, [[10, 50], [60, 50]]);
    const drawn = el.value;
    el.undo();
    el.undo();
    const seen = changes(el);
    el.redo();
    expect(lines(seen[0]!)).toBe(1);
    el.redo();
    expect(seen).toHaveLength(2);
    expect(seen[1]).toBe(drawn);
    el.redo();
    expect(seen).toHaveLength(2);
  });

  it('a new stroke empties the redo stack', () => {
    const el = mount();
    draw(el, [[10, 10], [60, 10]]);
    draw(el, [[10, 50], [60, 50]]);
    el.undo();
    draw(el, [[10, 90], [60, 90]]);
    const seen = changes(el);
    el.redo();
    expect(seen).toEqual([]);
    expect(lines(el.value)).toBe(2);
  });

  it('clear() removes all ink as one entry and fires change with null', () => {
    const el = mount();
    draw(el, [[10, 10], [60, 10]]);
    draw(el, [[10, 50], [60, 50]]);
    const seen = changes(el);
    el.clear();
    expect(seen).toEqual([null]);
    expect(el.value).toBeNull();
    expect(el.shadowRoot!.querySelector('[part~="ink"]')!.childElementCount).toBe(0);
  });

  it('undo() reverts a clear, and redo() clears again', () => {
    const el = mount();
    draw(el, [[10, 10], [60, 10]]);
    draw(el, [[10, 50], [60, 50]]);
    const drawn = el.value;
    el.clear();
    const seen = changes(el);
    el.undo();
    el.redo();
    expect(seen).toEqual([drawn, null]);
  });

  it('a stroke drawn after a clear can be undone back to the ink before the clear', () => {
    const el = mount();
    draw(el, [[10, 10], [60, 10]]);
    const drawn = el.value;
    el.clear();
    draw(el, [[10, 90], [60, 90]]);
    el.undo();
    expect(el.value).toBeNull();
    el.undo();
    expect(el.value).toBe(drawn);
  });

  it('clear() on an empty field does nothing', () => {
    const el = mount();
    const seen = changes(el);
    el.clear();
    el.undo();
    expect(seen).toEqual([]);
  });

  it('keeps at most history-limit entries, dropping the oldest first', () => {
    const el = mount({ 'history-limit': '2' });
    draw(el, [[10, 10], [60, 10]]);
    draw(el, [[10, 50], [60, 50]]);
    draw(el, [[10, 90], [60, 90]]);
    el.undo();
    el.undo();
    expect(el.canUndo).toBe(false);
    el.undo();
    expect(lines(el.value)).toBe(1);
  });

  it('counts a clear as one entry against history-limit', () => {
    const el = mount();
    el.historyLimit = 1;
    draw(el, [[10, 10], [60, 10]]);
    el.clear();
    el.undo();
    el.undo();
    expect(lines(el.value)).toBe(1);
  });

  it('defaults history-limit to 50', () => {
    const el = mount();
    expect(el.historyLimit).toBe(50);
    for (let i = 0; i < 51; i++) draw(el, [[10, 2 + i * 3], [60, 2 + i * 3]]);
    for (let i = 0; i < 51; i++) el.undo();
    expect(lines(el.value)).toBe(1);
  });

  it('starts empty with nothing to undo or redo', () => {
    expect(stateOf(mount())).toEqual({ canUndo: false, canRedo: false, empty: true });
  });

  it('fires dsf-history-change whenever canUndo, canRedo or empty changes, matching the properties', () => {
    const el = mount();
    const seen = historyChanges(el);
    const states: HistoryState[] = [];
    el.addEventListener('dsf-history-change', () => states.push(stateOf(el)));

    draw(el, [[10, 10], [60, 10]]);
    draw(el, [[10, 50], [60, 50]]); // no change: still canUndo, !canRedo, !empty
    el.undo(); // canRedo
    el.undo(); // empty, !canUndo
    el.redo();
    draw(el, [[10, 90], [60, 90]]); // redo stack emptied
    el.clear(); // empty
    el.undo();

    expect(seen).toEqual([
      { canUndo: true, canRedo: false, empty: false },
      { canUndo: true, canRedo: true, empty: false },
      { canUndo: false, canRedo: true, empty: true },
      { canUndo: true, canRedo: true, empty: false },
      { canUndo: true, canRedo: false, empty: false },
      { canUndo: true, canRedo: false, empty: true },
      { canUndo: true, canRedo: true, empty: false },
    ]);
    expect(states).toEqual(seen);
  });

  it('fires dsf-history-change when history-limit drops the last undoable entry', () => {
    const el = mount();
    draw(el, [[10, 10], [60, 10]]);
    const seen = historyChanges(el);
    el.historyLimit = 0;
    expect(seen).toEqual([{ canUndo: false, canRedo: false, empty: false }]);
  });

  describe('legacy regressions', () => {
    it('undo updates the value', () => {
      const el = mount();
      draw(el, [[10, 10], [60, 10]]);
      const first = el.value;
      draw(el, [[10, 50], [60, 50]]);
      const seen = changes(el);
      el.undo();
      expect(el.value).toBe(first);
      expect(seen).toEqual([first]);
    });
  });
});

describe('default actions bar', () => {
  it('shows Undo and Clear buttons, outside the drawing area, with icons and accessible names', () => {
    const el = mount();
    const bar = el.shadowRoot!.querySelector('[part~="actions"]')!;
    expect(bar).not.toBeNull();
    expect(area(el).contains(bar)).toBe(false);
    const buttons = [...bar.querySelectorAll<HTMLButtonElement>('button')];
    expect(buttons.map((b) => b.getAttribute('part'))).toEqual(['action action-undo', 'action action-clear']);
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Undo', 'Clear']);
    for (const b of buttons) {
      expect(b.type).toBe('button');
      expect(b.querySelector('svg')).not.toBeNull();
    }
    expect(button(el, 'redo')).toBeNull();
  });

  it('places the bar below the drawing area', () => {
    const el = mount();
    const bar = el.shadowRoot!.querySelector('[part~="actions"]')!;
    expect(bar.getBoundingClientRect().top).toBeGreaterThanOrEqual(area(el).getBoundingClientRect().bottom);
  });

  it('disables each button while its action would do nothing', () => {
    const el = mount();
    const undo = button(el, 'undo')!;
    const clear = button(el, 'clear')!;
    expect([undo.disabled, clear.disabled]).toEqual([true, true]);
    draw(el, [[10, 10], [60, 10]]);
    expect([undo.disabled, clear.disabled]).toEqual([false, false]);
    el.clear();
    expect([undo.disabled, clear.disabled]).toEqual([false, true]);
    el.undo();
    el.undo();
    expect([undo.disabled, clear.disabled]).toEqual([true, true]);
  });

  it('the buttons undo and clear', () => {
    const el = mount();
    draw(el, [[10, 10], [60, 10]]);
    draw(el, [[10, 50], [60, 50]]);
    const seen = changes(el);
    button(el, 'undo')!.click();
    expect(lines(el.value)).toBe(1);
    button(el, 'clear')!.click();
    expect(el.value).toBeNull();
    expect(seen).toHaveLength(2);
  });
});

describe('keyboard shortcuts', () => {
  function drawnTwice(): DigitalSignatureFieldElement {
    const el = mount();
    draw(el, [[10, 10], [60, 10]]);
    draw(el, [[10, 50], [60, 50]]);
    return el;
  }

  it.each(['Control', 'Meta'])('%s+Z undoes while the drawing area has focus', async (mod) => {
    const el = drawnTwice();
    area(el).focus();
    await userEvent.keyboard(`{${mod}>}z{/${mod}}`);
    expect(lines(el.value)).toBe(1);
  });

  it.each([
    ['Control+Shift+Z', '{Control>}{Shift>}Z{/Shift}{/Control}'],
    ['Meta+Shift+Z', '{Meta>}{Shift>}Z{/Shift}{/Meta}'],
    ['Control+Y', '{Control>}y{/Control}'],
    ['Meta+Y', '{Meta>}y{/Meta}'],
  ])('%s redoes while a button in the field has focus', async (_name, keys) => {
    const el = drawnTwice();
    el.undo();
    button(el, 'clear')!.focus();
    await userEvent.keyboard(keys);
    expect(lines(el.value)).toBe(2);
  });

  it('ignores the shortcuts while focus is outside the field', async () => {
    const el = drawnTwice();
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    const seen = changes(el);
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(seen).toEqual([]);
  });

  it('leaves the shortcuts to a slotted control that has focus', async () => {
    const el = drawnTwice();
    const input = document.createElement('input');
    input.slot = 'actions-end';
    el.append(input);
    input.focus();
    const seen = changes(el);
    let prevented: boolean | null = null;
    input.addEventListener('keydown', (e) => setTimeout(() => (prevented = e.defaultPrevented)));
    await userEvent.keyboard('{Control>}z{/Control}');
    await new Promise((r) => setTimeout(r));
    expect(seen).toEqual([]);
    expect(lines(el.value)).toBe(2);
    expect(prevented).toBe(false);
  });

  it('makes the drawing area focusable', () => {
    const el = mount();
    area(el).focus();
    expect(el.shadowRoot!.activeElement).toBe(area(el));
  });
});
