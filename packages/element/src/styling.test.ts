import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';
import { area, draw, mount } from './test-utils';

afterEach(() => {
  document.body.replaceChildren();
  document.head.querySelectorAll('style[data-test]').forEach((s) => s.remove());
});

const ALL_ACTIONS = 'undo redo clear color width';

function part(el: DigitalSignatureFieldElement, name: string): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part~="${name}"]`)!;
}

function css(node: Element, pseudo?: string): CSSStyleDeclaration {
  return getComputedStyle(node, pseudo);
}

/** Adds a page-level (light DOM) style sheet, as a consumer would. */
function pageStyle(text: string): void {
  const style = document.createElement('style');
  style.dataset['test'] = '';
  style.textContent = text;
  document.head.append(style);
}

/** A colour as computed by the engine, for comparisons that don't depend on serialisation. */
function computedColor(color: string): string {
  const probe = document.createElement('span');
  probe.style.color = color;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function rgb(color: string): [number, number, number, number] {
  const n = color.match(/[\d.]+/g)!.map(Number);
  return [n[0]!, n[1]!, n[2]!, n[3] ?? 1];
}

function luminance(color: string): number {
  const [r, g, b] = rgb(color)
    .slice(0, 3)
    .map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio; a translucent foreground is composited over the background first. */
function contrast(fg: string, bg: string): number {
  const [fr, fgG, fb, a] = rgb(fg);
  const [br, bgG, bb] = rgb(bg);
  const mix = (f: number, b: number) => Math.round(f * a + b * (1 - a));
  const solid = `rgb(${mix(fr, br)}, ${mix(fgG, bgG)}, ${mix(fb, bb)})`;
  const [l1, l2] = [luminance(solid), luminance(bg)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

/** The opaque background a button is painted on: its own, or the page's white when transparent. */
function paintedBackground(node: Element): string {
  const bg = css(node).backgroundColor;
  return rgb(bg)[3] === 0 ? 'rgb(255, 255, 255)' : bg;
}

/**
 * Moves focus to a button as keyboard navigation would. WebKit on macOS skips buttons on Tab by default,
 * so after a real Tab into the field, focus is moved programmatically; it keeps `:focus-visible`.
 */
async function keyboardFocus(button: HTMLElement): Promise<HTMLElement> {
  await userEvent.tab();
  button.focus();
  return button;
}

describe('custom properties', () => {
  it('--dsf-height, --dsf-border, --dsf-radius and --dsf-area-bg style the drawing area', () => {
    const el = mount();
    el.style.setProperty('--dsf-height', '123px');
    el.style.setProperty('--dsf-border', '3px dashed rgb(1, 2, 3)');
    el.style.setProperty('--dsf-radius', '9px');
    el.style.setProperty('--dsf-area-bg', 'rgb(4, 5, 6)');
    const s = css(area(el));
    expect(s.height).toBe('123px');
    expect(s.borderTopWidth).toBe('3px');
    expect(s.borderTopStyle).toBe('dashed');
    expect(s.borderTopColor).toBe('rgb(1, 2, 3)');
    expect(s.borderTopLeftRadius).toBe('9px');
    expect(s.backgroundColor).toBe('rgb(4, 5, 6)');
  });

  it('--dsf-guide-color colours the baseline guide', () => {
    const el = mount();
    el.style.setProperty('--dsf-guide-color', 'rgb(7, 8, 9)');
    const guide = part(el, 'guide');
    expect(css(guide).borderTopColor).toBe('rgb(7, 8, 9)');
    expect(guide.getBoundingClientRect().width).toBeGreaterThan(0);
  });

  it('--dsf-gap spaces the drawing area, the actions bar and the buttons', () => {
    const el = mount({ actions: ALL_ACTIONS });
    el.style.setProperty('--dsf-gap', '17px');
    expect(css(part(el, 'root')).rowGap).toBe('17px');
    expect(css(part(el, 'actions')).columnGap).toBe('17px');
  });

  it('--dsf-button-size, --dsf-button-color and --dsf-button-bg style every button', () => {
    const el = mount({ actions: ALL_ACTIONS });
    el.style.setProperty('--dsf-button-size', '41px');
    el.style.setProperty('--dsf-button-color', 'rgb(10, 11, 12)');
    el.style.setProperty('--dsf-button-bg', 'rgb(13, 14, 15)');
    const buttons = el.shadowRoot!.querySelectorAll('[part~="action"]');
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      const s = css(button);
      expect(s.height).toBe('41px');
      expect(parseFloat(s.minWidth)).toBe(41);
      expect(s.color).toBe('rgb(10, 11, 12)');
      expect(s.backgroundColor).toBe('rgb(13, 14, 15)');
    }
  });

  it('--dsf-button-hover-bg styles a hovered button', async () => {
    const el = mount({ actions: 'color' });
    el.style.setProperty('--dsf-button-hover-bg', 'rgb(16, 17, 18)');
    const button = part(el, 'action-color');
    await userEvent.hover(button);
    expect(css(button).backgroundColor).toBe('rgb(16, 17, 18)');
  });

  it('--dsf-focus-ring draws the focus ring of the drawing area and the buttons', async () => {
    const el = mount({ actions: 'color' });
    el.style.setProperty('--dsf-focus-ring', '3px solid rgb(19, 20, 21)');
    await userEvent.tab();
    expect(el.shadowRoot!.activeElement).toBe(area(el));
    expect(css(area(el)).outlineColor).toBe('rgb(19, 20, 21)');
    expect(css(area(el)).outlineWidth).toBe('3px');
    const button = await keyboardFocus(part(el, 'action-color'));
    expect(el.shadowRoot!.activeElement).toBe(button);
    expect(css(button).outlineColor).toBe('rgb(19, 20, 21)');
    expect(css(button).outlineWidth).toBe('3px');
  });

  it('--dsf-invalid-color marks the drawing area while the field is invalid', () => {
    const el = mount({ required: '' });
    el.style.setProperty('--dsf-invalid-color', 'rgb(22, 23, 24)');
    expect(css(area(el)).borderTopColor).not.toBe('rgb(22, 23, 24)');
    el.checkValidity(); // a submit attempt: invalidity is shown from now on
    expect(el.matches(':state(invalid)')).toBe(true);
    expect(css(area(el)).borderTopColor).toBe('rgb(22, 23, 24)');
  });
});

describe('parts', () => {
  const PARTS = [
    'root',
    'area',
    'guide',
    'ink',
    'actions',
    'action',
    'action-undo',
    'action-redo',
    'action-clear',
    'action-color',
    'action-width',
    'status',
  ];

  it.each(PARTS)('::part(%s) is exposed and styleable from the page', (name) => {
    pageStyle(`digital-signature-field::part(${name}) { outline: 5px solid rgb(30, 31, 32); }`);
    const el = mount({ actions: ALL_ACTIONS });
    const nodes = el.shadowRoot!.querySelectorAll(`[part~="${name}"]`);
    expect(nodes.length).toBeGreaterThan(0);
    for (const node of nodes) {
      expect(css(node).outlineColor).toBe('rgb(30, 31, 32)');
      expect(css(node).outlineWidth).toBe('5px');
    }
  });
});

describe('styles property', () => {
  it('applies a CSS string after the built-in styles', () => {
    const el = mount();
    el.styles = '.area { background: rgb(40, 41, 42); }';
    expect(css(area(el)).backgroundColor).toBe('rgb(40, 41, 42)');
    expect(el.styles).toBe('.area { background: rgb(40, 41, 42); }');
  });

  it('applies a CSSStyleSheet and an array of strings and sheets, in order', () => {
    const el = mount();
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('.area { background: rgb(50, 51, 52); }');
    el.styles = sheet;
    expect(css(area(el)).backgroundColor).toBe('rgb(50, 51, 52)');

    const later = new CSSStyleSheet();
    later.replaceSync('.area { border-top-color: rgb(53, 54, 55); }');
    el.styles = ['.area { background: rgb(56, 57, 58); border-top-color: rgb(1, 1, 1); }', later];
    expect(css(area(el)).backgroundColor).toBe('rgb(56, 57, 58)');
    expect(css(area(el)).borderTopColor).toBe('rgb(53, 54, 55)');
  });

  it('setting it again replaces the previously injected sheets; null removes them', () => {
    const el = mount();
    const builtIn = css(area(el)).backgroundColor;
    el.styles = '.area { background: rgb(60, 61, 62); }';
    el.styles = '.area { border-top-color: rgb(63, 64, 65); }';
    expect(css(area(el)).backgroundColor).toBe(builtIn);
    expect(css(area(el)).borderTopColor).toBe('rgb(63, 64, 65)');
    el.styles = null;
    expect(css(area(el)).borderTopColor).not.toBe('rgb(63, 64, 65)');
    expect(el.shadowRoot!.adoptedStyleSheets).toHaveLength(0);
  });

  it('keeps styles set before the element was defined', async () => {
    const el = document.createElement('dsf-late-styles') as DigitalSignatureFieldElement;
    (el as { styles: unknown }).styles = '.area { background: rgb(70, 71, 72); }';
    document.body.append(el);
    const { DigitalSignatureFieldElement: Field } = await import('@digital-signature-field/element');
    customElements.define('dsf-late-styles', class extends Field {});
    expect(css(area(el)).backgroundColor).toBe('rgb(70, 71, 72)');
  });
});

describe(':state(drawing)', () => {
  function pointer(el: DigitalSignatureFieldElement, type: string, x: number, y: number): void {
    const rect = area(el).getBoundingClientRect();
    area(el).dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        composed: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        button: type === 'pointermove' ? -1 : 0,
        buttons: type === 'pointerup' ? 0 : 1,
        pressure: 0.5,
        clientX: rect.left + x,
        clientY: rect.top + y,
      }),
    );
  }

  it('matches while a stroke is in progress', () => {
    const el = mount();
    expect(el.matches(':state(drawing)')).toBe(false);
    pointer(el, 'pointerdown', 10, 10);
    expect(el.matches(':state(drawing)')).toBe(true);
    pointer(el, 'pointermove', 60, 10);
    expect(el.matches(':state(drawing)')).toBe(true);
    pointer(el, 'pointerup', 60, 10);
    expect(el.matches(':state(drawing)')).toBe(false);
  });

  it('ends when the stroke is cancelled or is a discarded tap', () => {
    const el = mount();
    pointer(el, 'pointerdown', 10, 10);
    pointer(el, 'pointercancel', 10, 10);
    expect(el.matches(':state(drawing)')).toBe(false);
    pointer(el, 'pointerdown', 10, 10);
    pointer(el, 'pointerup', 11, 10);
    expect(el.matches(':state(drawing)')).toBe(false);
  });

  it('can be styled from the page', () => {
    pageStyle('digital-signature-field:state(drawing) { outline: 4px solid rgb(80, 81, 82); }');
    const el = mount();
    pointer(el, 'pointerdown', 10, 10);
    expect(css(el).outlineColor).toBe('rgb(80, 81, 82)');
    pointer(el, 'pointerup', 10, 10);
    expect(css(el).outlineColor).not.toBe('rgb(80, 81, 82)');
  });
});

describe('default styles', () => {
  it('show a visible focus ring on the drawing area and the buttons', async () => {
    const el = mount({ actions: 'color' });
    await userEvent.tab();
    expect(css(area(el)).outlineStyle).not.toBe('none');
    expect(parseFloat(css(area(el)).outlineWidth)).toBeGreaterThanOrEqual(2);
    expect(contrast(css(area(el)).outlineColor, 'rgb(255, 255, 255)')).toBeGreaterThanOrEqual(3);
    const button = await keyboardFocus(part(el, 'action-color'));
    expect(css(button).outlineStyle).not.toBe('none');
    expect(parseFloat(css(button).outlineWidth)).toBeGreaterThanOrEqual(2);
    expect(contrast(css(button).outlineColor, 'rgb(255, 255, 255)')).toBeGreaterThanOrEqual(3);
  });

  it('give the buttons WCAG AA contrast (text 4.5:1, boundary 3:1)', () => {
    const el = mount({ actions: ALL_ACTIONS });
    draw(el, [[10, 10], [60, 10]]);
    const page = computedColor('#fff');
    for (const button of el.shadowRoot!.querySelectorAll('[part~="action"]:not(:disabled)')) {
      const s = css(button);
      const bg = paintedBackground(button);
      expect(contrast(s.color, bg), s.color).toBeGreaterThanOrEqual(4.5);
      expect(contrast(s.borderTopColor, page), s.borderTopColor).toBeGreaterThanOrEqual(3);
      expect(parseFloat(s.borderTopWidth)).toBeGreaterThanOrEqual(1);
    }
  });
});

