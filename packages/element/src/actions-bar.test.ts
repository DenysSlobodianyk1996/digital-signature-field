import { afterEach, describe, expect, it } from 'vitest';
import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';
import { area, draw, inkStrokes, mount, paint } from './test-utils';

afterEach(() => {
  document.body.replaceChildren();
});

function bar(el: DigitalSignatureFieldElement): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part~="actions"]')!;
}

/** Built-in buttons that are actually rendered (fallback content replaced by a slot is not). */
function shownButtons(el: DigitalSignatureFieldElement, part = 'action'): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>(`[part~="${part}"]`)].filter(isRendered);
}

function isRendered(node: Element): boolean {
  const r = node.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

const names = (buttons: HTMLButtonElement[]) => buttons.map((b) => b.getAttribute('aria-label'));

function status(el: DigitalSignatureFieldElement): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part~="status"]')!;
}

describe('actions tokens', () => {
  it('shows the built-in actions named by the tokens, in token order', () => {
    const el = mount({ actions: 'clear redo undo' });
    expect(names(shownButtons(el))).toEqual(['Clear', 'Redo', 'Undo']);
  });

  it('defaults to "undo clear" and reflects the property to the attribute', () => {
    const el = mount();
    expect(el.actions).toBe('undo clear');
    el.actions = 'redo';
    expect(el.getAttribute('actions')).toBe('redo');
    expect(names(shownButtons(el))).toEqual(['Redo']);
  });

  it('ignores unknown and repeated tokens', () => {
    const el = mount({ actions: 'undo  bogus undo  clear' });
    expect(names(shownButtons(el))).toEqual(['Undo', 'Clear']);
  });

  it('"none" hides the actions bar (headless mode); the methods still work', () => {
    const el = mount({ actions: 'none' });
    expect(isRendered(bar(el))).toBe(false);
    expect(shownButtons(el)).toEqual([]);
    draw(el, [[10, 10], [60, 10]]);
    el.undo();
    expect(el.empty).toBe(true);
  });

  it('the color action shows a swatch per pen colour and sets the colour of new strokes only', () => {
    const el = mount({ actions: 'color undo' });
    const defaults = shownButtons(el, 'action-color');
    expect(names(defaults)).toEqual(['#000', '#1a3fbf']);
    expect(defaults.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);

    el.penColors = ['#000', '#1a3fbf', '#b91c1c'];
    const swatches = shownButtons(el, 'action-color');
    expect(names(swatches)).toEqual(['#000', '#1a3fbf', '#b91c1c']);

    draw(el, [[10, 10], [60, 10]]);
    swatches[2]!.click();
    expect(el.penColor).toBe('#b91c1c');
    expect(shownButtons(el, 'action-color').map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'true',
    ]);
    draw(el, [[10, 50], [60, 50]]);
    expect(inkStrokes(el).map((s) => paint(s).colors)).toEqual([['#000'], ['#b91c1c']]);
  });

  it('the width action offers three widths and sets the width of new strokes only', () => {
    const el = mount({ actions: 'width' });
    const widths = shownButtons(el, 'action-width');
    expect(names(widths)).toEqual(['Thin', 'Medium', 'Thick']);
    expect(widths.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);

    draw(el, [[10, 10], [60, 10]]);
    widths[2]!.click();
    widths[0]!.click();
    widths[2]!.click();
    draw(el, [[10, 50], [60, 50]]);
    const [first, second] = inkStrokes(el).map((s) => paint(s).widths[0]!);
    expect(second).toBeGreaterThan(first!);
    expect(el.penWidth).toBe(second);
    expect(shownButtons(el, 'action-width').map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'true',
    ]);
  });
});

describe('actions-position', () => {
  const rects = (el: DigitalSignatureFieldElement) => ({
    bar: bar(el).getBoundingClientRect(),
    area: area(el).getBoundingClientRect(),
  });

  it('defaults to bottom, also for unknown values', () => {
    const el = mount({ 'actions-position': 'sideways' });
    expect(el.actionsPosition).toBe('bottom');
    const r = rects(el);
    expect(r.bar.top).toBeGreaterThanOrEqual(r.area.bottom);
  });

  it('top puts the bar above the drawing area', () => {
    const el = mount();
    el.actionsPosition = 'top';
    expect(el.getAttribute('actions-position')).toBe('top');
    const r = rects(el);
    expect(r.bar.bottom).toBeLessThanOrEqual(r.area.top);
  });

  it.each([
    ['start', 'ltr', 'left'],
    ['end', 'ltr', 'right'],
    ['start', 'rtl', 'right'],
    ['end', 'rtl', 'left'],
  ])('%s in %s puts the rail on the %s', (position, dir, side) => {
    const el = mount({ 'actions-position': position, dir, actions: 'undo redo clear' });
    const r = rects(el);
    if (side === 'left') expect(r.bar.right).toBeLessThanOrEqual(r.area.left);
    else expect(r.bar.left).toBeGreaterThanOrEqual(r.area.right);
    // A rail: the buttons stack vertically beside the area.
    const [undo, redo] = shownButtons(el);
    expect(redo!.getBoundingClientRect().top).toBeGreaterThanOrEqual(undo!.getBoundingClientRect().bottom);
  });
});

describe('slots', () => {
  function slotted(el: DigitalSignatureFieldElement, slot: string, text: string): HTMLButtonElement {
    const b = document.createElement('button');
    b.slot = slot;
    b.textContent = text;
    el.append(b);
    return b;
  }

  it('actions-start and actions-end add buttons around the built-ins', () => {
    const el = mount();
    const start = slotted(el, 'actions-start', 'Start');
    const end = slotted(el, 'actions-end', 'End');
    const [undo, clear] = shownButtons(el);
    const box = bar(el).getBoundingClientRect();
    for (const b of [start, end]) {
      const r = b.getBoundingClientRect();
      expect(r.top).toBeGreaterThanOrEqual(box.top);
      expect(r.bottom).toBeLessThanOrEqual(box.bottom);
    }
    const lefts = [start, undo!, clear!, end].map((b) => b.getBoundingClientRect().left);
    expect([...lefts].sort((a, b) => a - b)).toEqual(lefts);
  });

  it('actions replaces the bar content', () => {
    const el = mount();
    const mine = slotted(el, 'actions', 'Mine');
    expect(shownButtons(el)).toEqual([]);
    const r = mine.getBoundingClientRect();
    const box = bar(el).getBoundingClientRect();
    expect(r.width).toBeGreaterThan(0);
    expect(r.top).toBeGreaterThanOrEqual(box.top);
    expect(r.bottom).toBeLessThanOrEqual(box.bottom);
  });

  it('placeholder shows inside the drawing area only while the field is empty', () => {
    const el = mount();
    const hint = document.createElement('span');
    hint.slot = 'placeholder';
    hint.textContent = 'Sign here';
    el.append(hint);
    const inside = () => {
      const r = hint.getBoundingClientRect();
      const a = area(el).getBoundingClientRect();
      return r.width > 0 && r.left >= a.left && r.right <= a.right && r.top >= a.top && r.bottom <= a.bottom;
    };
    expect(inside()).toBe(true);
    draw(el, [[10, 10], [60, 10]]);
    expect(isRendered(hint)).toBe(false);
    el.clear();
    expect(inside()).toBe(true);
  });

  it('the placeholder does not block drawing', () => {
    const el = mount();
    const hint = document.createElement('div');
    hint.slot = 'placeholder';
    hint.textContent = 'Sign here';
    el.append(hint);
    const r = hint.getBoundingClientRect();
    const a = area(el).getBoundingClientRect();
    expect(document.elementFromPoint(r.left + 2, r.top + 2)).toBe(el);
    draw(el, [
      [r.left - a.left + 2, r.top - a.top + 2],
      [r.left - a.left + 60, r.top - a.top + 2],
    ]);
    expect(el.empty).toBe(false);
  });
});

describe('labels', () => {
  it('overrides button text, accessible names and the drawing area name; English otherwise', () => {
    const el = mount({ actions: 'undo redo clear width color' });
    expect(area(el).getAttribute('aria-label')).toBe('Signature drawing area');
    el.labels = { undo: 'בטל', clear: 'נקה', drawingArea: 'אזור חתימה', width: 'עובי', thick: 'עבה' };
    const [undo, redo, clear] = shownButtons(el);
    expect(names([undo!, redo!, clear!])).toEqual(['בטל', 'Redo', 'נקה']);
    expect(undo!.textContent!.trim()).toBe('בטל');
    expect(clear!.textContent!.trim()).toBe('נקה');
    expect(area(el).getAttribute('aria-label')).toBe('אזור חתימה');
    expect(names(shownButtons(el, 'action-width'))).toEqual(['Thin', 'Medium', 'עבה']);
    const widthGroup = shownButtons(el, 'action-width')[0]!.closest('[role="group"]')!;
    expect(widthGroup.getAttribute('aria-label')).toBe('עובי');
    const colorGroup = shownButtons(el, 'action-color')[0]!.closest('[role="group"]')!;
    expect(colorGroup.getAttribute('aria-label')).toBe('Pen colour');
    expect(el.labels.redo).toBe('Redo');
    expect(el.labels.undo).toBe('בטל');
  });
});

describe('status live region', () => {
  it('politely announces when the field becomes signed or empty', () => {
    const el = mount();
    const region = status(el);
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(area(el).contains(region)).toBe(false);
    expect(region.textContent).toBe('Signature is empty');
    draw(el, [[10, 10], [60, 10]]);
    expect(region.textContent).toBe('Signature added');
    el.clear();
    expect(region.textContent).toBe('Signature is empty');
  });

  it('uses the labels for its messages', () => {
    const el = mount();
    el.labels = { emptyStatus: 'Leer', signedStatus: 'Unterschrieben' };
    expect(status(el).textContent).toBe('Leer');
    draw(el, [[10, 10], [60, 10]]);
    expect(status(el).textContent).toBe('Unterschrieben');
  });
});

describe('disabled and readonly', () => {
  it.each(['disabled', 'readonly'])('built-in buttons are disabled while the field is %s', (attr) => {
    const el = mount({ actions: 'undo redo clear color width' });
    draw(el, [[10, 10], [60, 10]]);
    el.setAttribute(attr, '');
    expect(shownButtons(el).every((b) => b.disabled)).toBe(true);
    el.removeAttribute(attr);
    const enabled = shownButtons(el).filter((b) => !b.disabled);
    expect(names(enabled)).toEqual(['Undo', 'Clear', '#000', '#1a3fbf', 'Thin', 'Medium', 'Thick']);
  });
});
