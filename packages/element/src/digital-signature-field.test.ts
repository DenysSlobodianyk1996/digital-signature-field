import { afterEach, describe, expect, it } from 'vitest';
import { area, changes, decodeSvg, draw, mount } from './test-utils';

afterEach(() => {
  document.body.replaceChildren();
});

describe('<digital-signature-field>', () => {
  it('registers the tag with an open shadow root containing the drawing area', () => {
    const el = mount();
    expect(customElements.get('digital-signature-field')).toBeDefined();
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[part~="area"]')).not.toBeNull();
  });

  it('has a null value while the field is empty', () => {
    expect(mount().value).toBeNull();
  });

  it('fires change with an SVG data URL when a stroke is drawn', () => {
    const el = mount();
    const seen = changes(el);
    draw(el, [[10, 10], [40, 20], [80, 30]]);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(el.value).toBe(seen[0]);
  });

  it('sets touch-action: none on the drawing area so the page does not scroll while drawing', () => {
    expect(getComputedStyle(area(mount())).touchAction).toBe('none');
  });

  it('fires change for each kept stroke, with the value growing each time', () => {
    const el = mount();
    const seen = changes(el);
    draw(el, [[10, 10], [60, 10]]);
    draw(el, [[10, 50], [60, 80]]);
    expect(seen).toHaveLength(2);
    expect(seen[1]).not.toBe(seen[0]);
    expect(decodeSvg(seen[0]!).querySelectorAll('polyline')).toHaveLength(1);
    expect(decodeSvg(seen[1]!).querySelectorAll('polyline')).toHaveLength(2);
  });

  it.each(['mouse', 'touch', 'pen'])('draws with %s input', (pointerType) => {
    const el = mount();
    draw(el, [[10, 10], [50, 40]], { pointerType });
    expect(el.value).not.toBeNull();
  });

  it('ignores a second pointer while the first one is drawing', () => {
    const el = mount();
    const seen = changes(el);
    const target = area(el);
    const rect = target.getBoundingClientRect();
    const at = (type: string, pointerId: number, x: number, y: number) =>
      target.dispatchEvent(
        new PointerEvent(type, { bubbles: true, composed: true, pointerId, pointerType: 'touch', clientX: rect.left + x, clientY: rect.top + y }),
      );
    at('pointerdown', 1, 10, 10);
    at('pointerdown', 2, 100, 100);
    at('pointermove', 2, 150, 150);
    at('pointermove', 1, 50, 10);
    at('pointerup', 2, 150, 150);
    at('pointerup', 1, 50, 10);
    expect(seen).toHaveLength(1);
    const lines = decodeSvg(seen[0]!).querySelectorAll('polyline');
    expect(lines).toHaveLength(1);
    expect(lines[0]!.getAttribute('points')).toBe('10,10 50,10');
  });

  it('treats strokes shorter than min-stroke-length as taps', () => {
    const el = mount({ 'min-stroke-length': '50' });
    draw(el, [[10, 10], [40, 10]]);
    expect(el.value).toBeNull();
    el.minStrokeLength = 2;
    draw(el, [[10, 10], [14, 10]]);
    expect(el.value).not.toBeNull();
  });

  it('renders the ink as SVG with a viewBox matching the drawing area, and exports the same viewBox', () => {
    const el = mount();
    el.style.setProperty('--dsf-height', '150px');
    draw(el, [[10, 10], [60, 40]]);
    const { width, height } = area(el).getBoundingClientRect();
    const ink = el.shadowRoot!.querySelector('[part~="ink"]')!;
    expect(ink.getAttribute('viewBox')).toBe(`0 0 ${width} ${height}`);
    expect(decodeSvg(el.value!).documentElement.getAttribute('viewBox')).toBe(`0 0 ${width} ${height}`);
  });

  describe('legacy regressions', () => {
    it('a tap does not produce a value', () => {
      const el = mount();
      const seen = changes(el);
      draw(el, [[50, 50]]);
      draw(el, [[60, 60], [62, 63], [64, 64]]);
      expect(seen).toEqual([]);
      expect(el.value).toBeNull();
      expect(el.shadowRoot!.querySelector('[part~="ink"]')!.childElementCount).toBe(0);
    });
  
    it('strokes are not stored as DOM ids', () => {
      const el = mount();
      draw(el, [[10, 10], [60, 10]]);
      draw(el, [[10, 50], [60, 50]]);
      draw(el, [[10, 90], [60, 90]]);
      const ink = el.shadowRoot!.querySelector('[part~="ink"]')!;
      expect(ink.querySelectorAll('polyline')).toHaveLength(3);
      expect(ink.querySelectorAll('[id]')).toHaveLength(0);
      const exported = decodeSvg(el.value!);
      expect(exported.querySelectorAll('polyline')).toHaveLength(3);
      expect(exported.querySelectorAll('[id]')).toHaveLength(0);
    });
  });
});
