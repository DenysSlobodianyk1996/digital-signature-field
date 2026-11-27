import '@digital-signature-field/element';
import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';

// Shared helpers for the browser tests (seam 1). They drive only the public surface.

export function mount(attrs: Record<string, string> = {}): DigitalSignatureFieldElement {
  const el = document.createElement('digital-signature-field');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.style.width = '400px';
  document.body.append(el);
  return el;
}

export type Point = [x: number, y: number];

export function area(el: DigitalSignatureFieldElement): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part~="area"]')!;
}

/** Sends a synthetic pointer sequence (down, moves, up) to the drawing area, in area coordinates. */
export function draw(
  el: DigitalSignatureFieldElement,
  points: Point[],
  {
    pointerType = 'mouse',
    pointerId = 1,
    pressures,
  }: { pointerType?: string; pointerId?: number; pressures?: number[] } = {},
): void {
  const target = area(el);
  const rect = target.getBoundingClientRect();
  const send = (type: string, [x, y]: Point, i: number) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        composed: true,
        cancelable: true,
        pointerId,
        pointerType,
        isPrimary: true,
        button: type === 'pointermove' ? -1 : 0,
        buttons: type === 'pointerup' ? 0 : 1,
        pressure: type === 'pointerup' ? 0 : (pressures?.[i] ?? 0.5),
        clientX: rect.left + x,
        clientY: rect.top + y,
      }),
    );
  points.forEach((p, i) => send(i === 0 ? 'pointerdown' : 'pointermove', p, i));
  send('pointerup', points[points.length - 1]!, points.length - 1);
}

/** `change` details, in the default `svg` format (an SVG data URL or `null`). */
export function changes(el: DigitalSignatureFieldElement): Array<string | null> {
  const seen: Array<string | null> = [];
  el.addEventListener('change', (e) => seen.push((e as CustomEvent<{ value: string | null }>).detail.value));
  return seen;
}

/** The rendered ink: one element per stroke (a polyline, path, or group of segments). */
export function inkStrokes(el: DigitalSignatureFieldElement): Element[] {
  return [...el.shadowRoot!.querySelector('[part~="ink"]')!.children];
}

/** Every stroke colour/width painted for one rendered stroke (the element itself or its segments). */
export function paint(stroke: Element): { colors: string[]; widths: number[] } {
  const painted = [stroke, ...stroke.querySelectorAll('*')].filter((n) => n.hasAttribute('stroke-width'));
  const inherited = (n: Element, attr: string): string | null =>
    n.getAttribute(attr) ?? (n === stroke ? null : stroke.getAttribute(attr));
  return {
    colors: [...new Set(painted.map((n) => inherited(n, 'stroke')!))],
    widths: [...new Set(painted.map((n) => Number(n.getAttribute('stroke-width'))))],
  };
}

/** Parses an SVG data URL (a `value` in the default `svg` format). */
export function decodeSvg(dataUrl: unknown): Document {
  const base64 = String(dataUrl).replace(/^data:image\/svg\+xml;base64,/, '');
  const xml = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
  return new DOMParser().parseFromString(xml, 'image/svg+xml');
}

/** The strokes in an exported SVG value (everything but the background rect and the embedded signature data). */
export function exportedStrokes(dataUrl: unknown): Element[] {
  return [...decodeSvg(dataUrl).documentElement.children].filter(
    (n) => n.localName !== 'rect' && n.localName !== 'metadata' && n.localName !== 'image',
  );
}
