import { afterEach, describe, expect, it } from 'vitest';
import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';
import { changes, decodeSvg, draw, exportedStrokes, inkStrokes, mount, paint } from './test-utils';

interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  empty: boolean;
}

const stateOf = (el: DigitalSignatureFieldElement): HistoryState => ({
  canUndo: el.canUndo,
  canRedo: el.canRedo,
  empty: el.empty,
});

const lines = (value: unknown): number => (value ? exportedStrokes(value).length : 0);
const viewBox = (value: unknown): string | null => (value ? decodeSvg(value).documentElement.getAttribute('viewBox') : null);

afterEach(() => {
  document.body.replaceChildren();
});

/** A value exported by another field: two strokes, the second in red at width 5. */
function exportedValue(): string {
  const source = mount();
  draw(source, [[10, 10], [60, 10], [80, 30]]);
  source.penColor = '#f00';
  source.penWidth = 5;
  draw(source, [[10, 50], [60, 50]]);
  const value = source.value as string;
  source.remove();
  return value;
}

describe('loading a value', () => {
  it('reloads an SVG exported by the field stroke for stroke, with colour and width', () => {
    const value = exportedValue();
    const el = mount();
    el.value = value;
    expect(inkStrokes(el).map((s) => paint(s))).toEqual([
      { colors: ['#000'], widths: [2] },
      { colors: ['#f00'], widths: [5] },
    ]);
    expect(el.value).toBe(value);
    expect(el.empty).toBe(false);
  });

  it('loads signature data written as an object', () => {
    const el = mount();
    el.value = {
      version: 1,
      width: 200,
      height: 100,
      strokes: [{ color: '#00f', width: 4, points: [{ x: 10, y: 10, pressure: 0.5, t: 0 }, { x: 90, y: 40, pressure: 0.5, t: 16 }] }],
    };
    expect(inkStrokes(el).map((s) => paint(s))).toEqual([{ colors: ['#00f'], widths: [4] }]);
    expect(viewBox(el.value)).toBe('0 0 200 100');
  });

  it('never fires change, and starts an empty history on the base layer', () => {
    const value = exportedValue();
    const el = mount();
    draw(el, [[10, 90], [90, 90]]);
    const seen = changes(el);
    el.value = value;
    expect(seen).toEqual([]);
    expect(stateOf(el)).toEqual({ canUndo: false, canRedo: false, empty: false });
  });

  it('fires dsf-history-change when loading changes canUndo or empty', () => {
    const el = mount();
    draw(el, [[10, 90], [90, 90]]);
    const seen: HistoryState[] = [];
    el.addEventListener('dsf-history-change', (e) => seen.push((e as CustomEvent<HistoryState>).detail));
    el.value = exportedValue();
    expect(seen).toEqual([{ canUndo: false, canRedo: false, empty: false }]);
  });

  it('undo never goes past the base layer', () => {
    const value = exportedValue();
    const el = mount();
    el.value = value;
    draw(el, [[10, 90], [90, 90]]);
    expect(el.canUndo).toBe(true);
    el.undo();
    el.undo();
    expect(el.value).toBe(value);
    expect(stateOf(el)).toEqual({ canUndo: false, canRedo: true, empty: false });
  });

  it('new strokes are drawn on top of the base layer and exported with it', () => {
    const el = mount();
    el.value = exportedValue();
    const seen = changes(el);
    draw(el, [[10, 90], [90, 90]]);
    expect(lines(seen[0]!)).toBe(3);
  });

  it('writing back the value the field just emitted does nothing: no reload, history kept', () => {
    const el = mount();
    el.value = exportedValue();
    const seen = changes(el);
    draw(el, [[10, 90], [90, 90]]);
    el.value = seen[0]!;
    expect(seen).toHaveLength(1);
    expect(stateOf(el)).toEqual({ canUndo: true, canRedo: false, empty: false });
    el.undo();
    expect(lines(el.value)).toBe(2);
  });

  it('writing null to an empty field keeps the history (a controlled binding writing back a clear)', () => {
    const el = mount();
    draw(el, [[10, 90], [90, 90]]);
    el.clear();
    el.value = null;
    expect(el.canUndo).toBe(true);
  });

  it('clear() removes the base layer, and undo() brings it back', () => {
    const value = exportedValue();
    const el = mount();
    el.value = value;
    const seen = changes(el);
    el.clear();
    expect(el.value).toBeNull();
    expect(inkStrokes(el)).toHaveLength(0);
    el.undo();
    expect(el.value).toBe(value);
    expect(seen).toEqual([null, value]);
  });

  it.each([null, ''])('writing %j empties the field without firing change', (empty) => {
    const el = mount();
    el.value = exportedValue();
    draw(el, [[10, 90], [90, 90]]);
    const seen = changes(el);
    el.value = empty;
    expect(seen).toEqual([]);
    expect(el.value).toBeNull();
    expect(inkStrokes(el)).toHaveLength(0);
    expect(stateOf(el)).toEqual({ canUndo: false, canRedo: false, empty: true });
  });

  it('keeps a value set before the element was defined', async () => {
    const value = exportedValue();
    const el = document.createElement('dsf-late-upgrade') as DigitalSignatureFieldElement;
    (el as { value: unknown }).value = value;
    document.body.append(el);
    const { DigitalSignatureFieldElement: Field } = await import('@digital-signature-field/element');
    customElements.define('dsf-late-upgrade', class extends Field {});
    expect(el.value).toBe(value);
  });

  it('keeps every property set before the element was defined', async () => {
    const props = {
      minStrokeLength: 3,
      penColor: '#c00',
      penWidth: 4,
      smoothing: 0,
      pressure: true,
      valueFormat: 'json',
      background: 'transparent',
      historyLimit: 5,
      name: 'signature',
      disabled: true,
      readOnly: true,
      required: true,
      minStrokes: 2,
      actions: 'undo redo color',
      actionsPosition: 'top',
      penColors: ['#c00', '#00c'],
      styles: ':host { --dsf-height: 120px; }',
    } as const;
    const el = document.createElement('dsf-late-upgrade-all') as DigitalSignatureFieldElement;
    Object.assign(el, props, { labels: { undo: 'Rückgängig' } });
    document.body.append(el);
    const { DigitalSignatureFieldElement: Field } = await import('@digital-signature-field/element');
    customElements.define('dsf-late-upgrade-all', class extends Field {});
    for (const [key, expected] of Object.entries(props)) {
      expect.soft((el as unknown as Record<string, unknown>)[key], key).toEqual(expected);
    }
    expect(el.labels.undo).toBe('Rückgängig');
    expect(el.labels.redo).toBe('Redo');
    // Applied through the element's accessors, not left on the instance shadowing them.
    expect(Object.keys(el)).toEqual([]);
    expect(el.getAttribute('pen-color')).toBe('#c00');
    expect(el.matches(':disabled')).toBe(true);
  });
});

describe('legacy regressions', () => {
  it('loading a value marks the form as changed', () => {
    const el = mount();
    const seen = changes(el);
    el.value = exportedValue();
    el.value = exportedValue();
    el.value = null;
    expect(seen).toEqual([]);
  });

  it('loading twice duplicates strokes', () => {
    const value = exportedValue();
    const el = mount();
    el.value = value;
    draw(el, [[10, 90], [90, 90]]);
    el.value = value;
    expect(inkStrokes(el)).toHaveLength(2);
    expect(el.value).toBe(value);
  });
});

describe('drawing-area size is part of the history', () => {
  it('undoing back to strokes drawn at another size restores that size', () => {
    const el = mount();
    draw(el, [[10, 10], [60, 10]]);
    const before = el.value;
    el.clear();
    el.style.width = '200px';
    draw(el, [[10, 50], [60, 50]]);
    expect(viewBox(el.value)).not.toBe(viewBox(before));
    el.undo();
    el.undo();
    expect(el.value).toBe(before);
  });
});
