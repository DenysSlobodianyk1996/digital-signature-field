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
  { pointerType = 'mouse', pointerId = 1 }: { pointerType?: string; pointerId?: number } = {},
): void {
  const target = area(el);
  const rect = target.getBoundingClientRect();
  const send = (type: string, [x, y]: Point) =>
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
        pressure: type === 'pointerup' ? 0 : 0.5,
        clientX: rect.left + x,
        clientY: rect.top + y,
      }),
    );
  const [first, ...rest] = points;
  send('pointerdown', first!);
  for (const p of rest) send('pointermove', p);
  send('pointerup', points[points.length - 1]!);
}

export function changes(el: DigitalSignatureFieldElement): Array<string | null> {
  const seen: Array<string | null> = [];
  el.addEventListener('change', (e) => seen.push((e as CustomEvent<{ value: string | null }>).detail.value));
  return seen;
}

export function decodeSvg(dataUrl: string): Document {
  const base64 = dataUrl.replace(/^data:image\/svg\+xml;base64,/, '');
  const xml = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
  return new DOMParser().parseFromString(xml, 'image/svg+xml');
}
