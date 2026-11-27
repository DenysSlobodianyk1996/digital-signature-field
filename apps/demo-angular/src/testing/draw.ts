import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';

type Point = [x: number, y: number];

/** The `<digital-signature-field>` rendered by the first `<dsf-signature>` under `root`. */
export function signatureField(root: Element): DigitalSignatureFieldElement {
  const el = root.querySelector<DigitalSignatureFieldElement>('dsf-signature digital-signature-field');
  if (!el) throw new Error('no <digital-signature-field> inside <dsf-signature>');
  return el;
}

/**
 * Waits until the wrapper has loaded and upgraded the element (it does that in the browser after the
 * first render, never on the server) and Angular is stable again.
 */
export async function settle(fixture: { whenStable(): Promise<unknown> }): Promise<void> {
  await fixture.whenStable();
  await customElements.whenDefined('digital-signature-field');
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

/** Sends a synthetic pointer stroke (down, moves, up) to the field's drawing area, in area coordinates. */
export function draw(field: HTMLElement, points: Point[] = [[10, 10], [60, 30], [120, 40]]): void {
  const area = field.shadowRoot?.querySelector<HTMLElement>('[part~="area"]');
  if (!area) throw new Error('no drawing area');
  const rect = area.getBoundingClientRect();
  const send = (type: string, [x, y]: Point) =>
    area.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        composed: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
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

/** Moves focus into the field, then out of it to another input. */
export function focusAndLeave(field: HTMLElement): void {
  const other = document.createElement('input');
  document.body.append(other);
  field.focus();
  other.focus();
  other.remove();
}

export const SVG_DATA_URL = /^data:image\/svg\+xml;base64,/;
