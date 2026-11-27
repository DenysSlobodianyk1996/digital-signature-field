import { afterEach, describe, expect, it } from 'vitest';
import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';
import {
  area,
  changes,
  decodeSvg,
  draw,
  exportedStrokes,
  inkStrokes,
  mount,
  paint,
  pointer,
  strokeEvents,
  type Point,
} from './test-utils';

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
    expect(exportedStrokes(seen[0]!)).toHaveLength(1);
    expect(exportedStrokes(seen[1]!)).toHaveLength(2);
  });

  it.each(['mouse', 'touch', 'pen'])('draws with %s input', (pointerType) => {
    const el = mount();
    draw(el, [[10, 10], [50, 40]], { pointerType });
    expect(el.value).not.toBeNull();
  });

  it('ignores a second pointer while the first one is drawing', () => {
    const el = mount({ smoothing: '0' });
    const seen = changes(el);
    const target = area(el);
    const rect = target.getBoundingClientRect();
    const [left, top] = [rect.left + target.clientLeft, rect.top + target.clientTop];
    const at = (type: string, pointerId: number, x: number, y: number) =>
      target.dispatchEvent(
        new PointerEvent(type, { bubbles: true, composed: true, pointerId, pointerType: 'touch', clientX: left + x, clientY: top + y }),
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

  it('stops listening when removed from the page and listens again when re-added', () => {
    const el = mount();
    const seen = changes(el);
    el.remove();
    draw(el, [[10, 10], [80, 10]]);
    expect(el.value).toBeNull();
    expect(seen).toEqual([]);
    document.body.append(el);
    draw(el, [[10, 10], [80, 10]]);
    expect(seen).toHaveLength(1);
  });

  it('treats strokes shorter than min-stroke-length as taps', () => {
    const el = mount({ 'min-stroke-length': '50' });
    draw(el, [[10, 10], [40, 10]]);
    expect(el.value).toBeNull();
    el.minStrokeLength = 2;
    draw(el, [[10, 10], [14, 10]]);
    expect(el.value).not.toBeNull();
  });

  it('fires dsf-stroke-start and dsf-stroke-end with the stroke count for kept strokes only', () => {
    const el = mount();
    const seen: string[] = [];
    for (const type of ['dsf-stroke-start', 'dsf-stroke-end']) {
      el.addEventListener(type, (e) => seen.push(`${type}:${(e as CustomEvent<{ strokeCount: number }>).detail.strokeCount}`));
    }
    draw(el, [[10, 10], [12, 10]]); // a tap: no events
    expect(seen).toEqual([]);
    draw(el, [[10, 10], [60, 10], [90, 10]]);
    draw(el, [[10, 50], [60, 80]]);
    expect(seen).toEqual(['dsf-stroke-start:1', 'dsf-stroke-end:1', 'dsf-stroke-start:2', 'dsf-stroke-end:2']);
  });

  it('renders the ink as SVG with a viewBox matching the drawing area (inside its border), and exports the same viewBox', () => {
    const el = mount();
    el.style.setProperty('--dsf-height', '150px');
    draw(el, [[10, 10], [60, 40]]);
    // The default 1px border is not part of the drawing surface: 400x152 border box -> 398x150.
    const { clientWidth: width, clientHeight: height } = area(el);
    expect([width, height]).toEqual([398, 150]);
    const ink = el.shadowRoot!.querySelector('[part~="ink"]')!;
    expect(ink.getAttribute('viewBox')).toBe(`0 0 ${width} ${height}`);
    expect(decodeSvg(el.value!).documentElement.getAttribute('viewBox')).toBe(`0 0 ${width} ${height}`);
  });

  describe('pen', () => {
    it('draws with pen-color #000 and pen-width 2 by default', () => {
      const el = mount();
      draw(el, [[10, 10], [60, 10]]);
      expect(el.penColor).toBe('#000');
      expect(el.penWidth).toBe(2);
      expect(paint(inkStrokes(el)[0]!)).toEqual({ colors: ['#000'], widths: [2] });
    });

    it('uses the current pen-color and pen-width for new strokes only', () => {
      const el = mount({ 'pen-color': '#c00', 'pen-width': '4' });
      draw(el, [[10, 10], [60, 10]]);
      el.penColor = '#1a3fbf';
      el.penWidth = 6;
      expect(el.getAttribute('pen-color')).toBe('#1a3fbf');
      expect(el.getAttribute('pen-width')).toBe('6');
      draw(el, [[10, 50], [60, 50]]);
      const [first, second] = inkStrokes(el);
      expect(paint(first!)).toEqual({ colors: ['#c00'], widths: [4] });
      expect(paint(second!)).toEqual({ colors: ['#1a3fbf'], widths: [6] });
      expect(exportedStrokes(el.value!).map((s) => paint(s))).toEqual([
        { colors: ['#c00'], widths: [4] },
        { colors: ['#1a3fbf'], widths: [6] },
      ]);
    });
  });

  describe('smoothing', () => {
    const zigzag: Point[] = [[10, 10], [40, 60], [70, 30], [100, 90], [130, 10]];

    it('renders strokes as smooth curves by default (smoothing 0.5)', () => {
      const el = mount();
      expect(el.smoothing).toBe(0.5);
      draw(el, zigzag);
      const [stroke] = inkStrokes(el);
      expect(stroke!.localName).toBe('path');
      expect(stroke!.getAttribute('d')).toMatch(/^M10,10 C/);
      expect(exportedStrokes(el.value!)[0]!.getAttribute('d')).toBe(stroke!.getAttribute('d'));
    });

    it('renders raw polylines with smoothing 0', () => {
      const el = mount({ smoothing: '0' });
      draw(el, zigzag);
      const [stroke] = inkStrokes(el);
      expect(stroke!.localName).toBe('polyline');
      expect(stroke!.getAttribute('points')).toBe('10,10 40,60 70,30 100,90 130,10');
    });

    it('draws more rounded curves as smoothing grows', () => {
      const curve = (smoothing: string) => {
        const el = mount({ smoothing });
        draw(el, zigzag);
        return (inkStrokes(el)[0] as SVGGeometryElement).getBBox().height;
      };
      // A rounder curve overshoots the zigzag's corners further.
      expect(curve('1')).toBeGreaterThan(curve('0.2'));
    });

    it('keeps the stored points raw: turning smoothing off shows the exact input', () => {
      const el = mount();
      draw(el, zigzag);
      el.smoothing = 0;
      expect(el.getAttribute('smoothing')).toBe('0');
      const [stroke] = inkStrokes(el);
      expect(stroke!.localName).toBe('polyline');
      expect(stroke!.getAttribute('points')).toBe('10,10 40,60 70,30 100,90 130,10');
    });
  });

  describe('pressure', () => {
    const line: Point[] = [[10, 10], [40, 10], [70, 10], [100, 10], [130, 10]];
    const pressures = [0.1, 0.3, 0.6, 0.9, 1];

    it('is off by default: the width stays constant even when the pen reports pressure', () => {
      const el = mount({ 'pen-width': '4' });
      expect(el.pressure).toBe(false);
      draw(el, line, { pointerType: 'pen', pressures });
      expect(paint(inkStrokes(el)[0]!).widths).toEqual([4]);
    });

    it.each(['0', '0.5'])('varies the width along the stroke when on and the pen reports pressure (smoothing %s)', (smoothing) => {
      const el = mount({ 'pen-width': '4', smoothing });
      el.pressure = true;
      expect(el.hasAttribute('pressure')).toBe(true);
      draw(el, line, { pointerType: 'pen', pressures });
      const { widths } = paint(inkStrokes(el)[0]!);
      expect(widths.length).toBeGreaterThan(2);
      expect(widths[widths.length - 1]).toBeGreaterThan(widths[0]!);
      expect(inkStrokes(el)).toHaveLength(1);
      expect(paint(exportedStrokes(el.value!)[0]!).widths).toEqual(widths);
    });

    it('keeps the width constant when the device reports no pressure data', () => {
      const el = mount({ 'pen-width': '4', pressure: '' });
      draw(el, line, { pointerType: 'mouse' });
      expect(paint(inkStrokes(el)[0]!).widths).toEqual([4]);
    });
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
  
    describe('no scaling: resizing the drawing area cropped the drawing', () => {
      /**
       * Where the stroke's geometry is painted, relative to the drawing area's top-left corner. Uses the
       * geometry box mapped to the screen, not getBoundingClientRect(): Firefox's includes a conservative
       * stroke outline (about 0.7px here), Chromium's and WebKit's do not.
       */
      const placed = (el: DigitalSignatureFieldElement, stroke: Element) => {
        const a = area(el).getBoundingClientRect();
        const shape = stroke as SVGGraphicsElement;
        const box = shape.getBBox();
        const ctm = shape.getScreenCTM()!;
        const tl = new DOMPoint(box.x, box.y).matrixTransform(ctm);
        const br = new DOMPoint(box.x + box.width, box.y + box.height).matrixTransform(ctm);
        const r = { left: tl.x, top: tl.y, right: br.x, bottom: br.y };
        return { left: r.left - a.left, top: r.top - a.top, right: r.right - a.left, bottom: r.bottom - a.top, width: r.right - r.left, height: r.bottom - r.top, area: a };
      };
      const corners: Point[] = [[20, 20], [380, 20], [380, 180], [20, 180], [20, 20]];

      it.each([
        ['narrower (window resize)', (el: HTMLElement) => (el.style.width = '200px'), 0.5],
        ['wider', (el: HTMLElement) => (el.style.width = '800px'), 1],
        ['lower (CSS height change)', (el: HTMLElement) => el.style.setProperty('--dsf-height', '100px'), 0.5],
        ['taller', (el: HTMLElement) => el.style.setProperty('--dsf-height', '400px'), 1],
      ])('keeps every stroke in proportion and uncropped when the area gets %s', (_, resize, scale) => {
        const el = mount({ smoothing: '0' });
        el.style.setProperty('--dsf-border', 'none');
        el.style.setProperty('--dsf-height', '200px');
        draw(el, corners);
        draw(el, [[100, 100], [300, 100]]);
        const before = inkStrokes(el).map((s) => placed(el, s));
        resize(el);
        const after = inkStrokes(el).map((s) => placed(el, s));
        for (const [i, b] of before.entries()) {
          const a = after[i]!;
          expect(a.left).toBeGreaterThanOrEqual(0);
          expect(a.top).toBeGreaterThanOrEqual(0);
          expect(a.right).toBeLessThanOrEqual(a.area.width + 0.5);
          expect(a.bottom).toBeLessThanOrEqual(a.area.height + 0.5);
          expect(a.width).toBeCloseTo(b.width * scale, 0);
          expect(a.height).toBeCloseTo(b.height * scale, 0);
        }
        // Centred in the resized area.
        const box = after[0]!;
        expect(box.left + box.width / 2).toBeCloseTo(box.area.width / 2, 0);
        expect(box.top + box.height / 2).toBeCloseTo(box.area.height / 2, 0);
      });

      it('keeps new ink under the pointer after a resize', () => {
        const el = mount({ smoothing: '0' });
        el.style.setProperty('--dsf-border', 'none');
        draw(el, corners);
        el.style.width = '200px';
        draw(el, [[50, 60], [150, 60]]);
        const stroke = placed(el, inkStrokes(el)[1]!);
        expect(stroke.left).toBeCloseTo(50, 0);
        expect(stroke.right).toBeCloseTo(150, 0);
        expect(stroke.top).toBeCloseTo(60, 0);
      });
    });

    it('strokes are not stored as DOM ids', () => {
      const el = mount();
      draw(el, [[10, 10], [60, 10]]);
      draw(el, [[10, 50], [60, 50]]);
      draw(el, [[10, 90], [60, 90]]);
      const ink = el.shadowRoot!.querySelector('[part~="ink"]')!;
      expect(inkStrokes(el)).toHaveLength(3);
      expect(ink.querySelectorAll('[id]')).toHaveLength(0);
      expect(exportedStrokes(el.value!)).toHaveLength(3);
      expect(decodeSvg(el.value!).querySelectorAll('[id]')).toHaveLength(0);
    });
  });

  describe('a stroke that never gets its pointerup', () => {
    it('is cancelled when the area loses pointer capture, and the next stroke draws', () => {
      const el = mount();
      const seen = changes(el);
      pointer(el, 'pointerdown', [10, 10]);
      pointer(el, 'pointermove', [60, 10]);
      pointer(el, 'lostpointercapture');
      expect(el.matches(':state(drawing)')).toBe(false);
      expect(inkStrokes(el)).toHaveLength(0);
      draw(el, [[10, 50], [80, 50]], { pointerType: 'touch', pointerId: 7 });
      expect(seen).toHaveLength(1);
      expect(exportedStrokes(el.value)).toHaveLength(1);
    });

    it('is dropped when the same pointer goes down again, which starts a new stroke', () => {
      const el = mount();
      const seen = changes(el);
      pointer(el, 'pointerdown', [10, 10]);
      pointer(el, 'pointermove', [60, 10]);
      // Its pointerup went elsewhere (e.g. the field's <dialog> closed mid-stroke).
      draw(el, [[10, 50], [80, 50]]);
      expect(el.matches(':state(drawing)')).toBe(false);
      expect(seen).toHaveLength(1);
      expect(exportedStrokes(el.value)).toHaveLength(1);
      expect(inkStrokes(el)).toHaveLength(1);
      // The new stroke, not the stale one continued.
      expect(el.toJSON()!.strokes[0]!.points[0]).toMatchObject({ x: 10, y: 50 });
    });

    it('leaves no partial ink behind when the field is removed mid-stroke', () => {
      const el = mount();
      pointer(el, 'pointerdown', [10, 10]);
      pointer(el, 'pointermove', [60, 10]);
      expect(inkStrokes(el)).toHaveLength(1);
      el.remove();
      expect(inkStrokes(el)).toHaveLength(0);
      document.body.append(el);
      expect(inkStrokes(el)).toHaveLength(0);
      expect(el.matches(':state(drawing)')).toBe(false);
    });
  });

  describe('dsf-stroke-end for a dropped stroke', () => {
    const cases: Array<[string, (el: DigitalSignatureFieldElement) => void]> = [
      ['pointercancel', (el) => pointer(el, 'pointercancel', [60, 10])],
      ['lost pointer capture', (el) => pointer(el, 'lostpointercapture')],
      ['disabled mid-stroke', (el) => (el.disabled = true)],
      ['readonly mid-stroke', (el) => (el.readOnly = true)],
      ['a value loaded mid-stroke', (el) => (el.value = null)],
      ['removed mid-stroke', (el) => el.remove()],
    ];
    it.each(cases)('fires with the unchanged stroke count when a started stroke is dropped (%s)', (_, drop) => {
      const el = mount();
      draw(el, [[10, 80], [80, 80]]);
      const seen = strokeEvents(el);
      const changed = changes(el);
      pointer(el, 'pointerdown', [10, 10]);
      pointer(el, 'pointermove', [60, 10]);
      drop(el);
      expect(seen).toEqual(['dsf-stroke-start:2', 'dsf-stroke-end:1']);
      expect(changed).toEqual([]);
    });

    it('does not fire for a dropped stroke that never started (still a tap)', () => {
      const el = mount();
      const seen = strokeEvents(el);
      pointer(el, 'pointerdown', [10, 10]);
      pointer(el, 'pointermove', [12, 10]);
      pointer(el, 'pointercancel', [12, 10]);
      expect(seen).toEqual([]);
    });
  });
});
