import { strokeLength, toSvgDataUrl, toSvgMarkup, type Point, type Stroke } from './ink';

const SVG_NS = 'http://www.w3.org/2000/svg';

const template = `
<style>
  :host {
    display: block;
  }
  .area {
    position: relative;
    height: var(--dsf-height, 200px);
    border: var(--dsf-border, 1px solid #c4c4c4);
    border-radius: var(--dsf-radius, 4px);
    background: var(--dsf-area-bg, #fff);
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    overflow: hidden;
    cursor: crosshair;
  }
  .ink {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }
</style>
<div part="root" class="root">
  <div part="area" class="area">
    <svg part="ink" class="ink" xmlns="${SVG_NS}" preserveAspectRatio="none" aria-hidden="true"></svg>
  </div>
</div>
`;

interface ActiveStroke {
  pointerId: number;
  stroke: Stroke;
}

const DEFAULT_MIN_STROKE_LENGTH = 8;

export class DigitalSignatureFieldElement extends HTMLElement {
  readonly #area: HTMLDivElement;
  readonly #ink: SVGSVGElement;

  /** Kept strokes, in drawing-area coordinates. The SVG is always redrawn from this. */
  #strokes: Stroke[] = [];
  /** Drawing-area size the strokes are stored in; set when the first stroke starts. */
  #size: { width: number; height: number } | null = null;
  #active: ActiveStroke | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = template;
    this.#area = root.querySelector('.area') as HTMLDivElement;
    this.#ink = root.querySelector('.ink') as SVGSVGElement;
  }

  connectedCallback(): void {
    this.#area.addEventListener('pointerdown', this.#onPointerDown);
    this.#area.addEventListener('pointermove', this.#onPointerMove);
    this.#area.addEventListener('pointerup', this.#onPointerUp);
    this.#area.addEventListener('pointercancel', this.#onPointerCancel);
  }

  disconnectedCallback(): void {
    this.#area.removeEventListener('pointerdown', this.#onPointerDown);
    this.#area.removeEventListener('pointermove', this.#onPointerMove);
    this.#area.removeEventListener('pointerup', this.#onPointerUp);
    this.#area.removeEventListener('pointercancel', this.#onPointerCancel);
    this.#active = null;
  }

  /** Strokes shorter than this (in px) are taps: discarded, no ink, no `change`. */
  get minStrokeLength(): number {
    const n = Number(this.getAttribute('min-stroke-length'));
    return this.hasAttribute('min-stroke-length') && Number.isFinite(n) && n >= 0 ? n : DEFAULT_MIN_STROKE_LENGTH;
  }

  set minStrokeLength(value: number) {
    this.setAttribute('min-stroke-length', String(value));
  }

  /** The signature as an SVG data URL, or `null` while the field is empty. */
  get value(): string | null {
    if (this.#strokes.length === 0 || !this.#size) return null;
    return toSvgDataUrl(this.#strokes, this.#size);
  }

  #point(e: PointerEvent): Point {
    const rect = this.#area.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure,
      t: e.timeStamp,
    };
  }

  readonly #onPointerDown = (e: PointerEvent): void => {
    if (this.#active || e.button !== 0) return;
    e.preventDefault();
    try {
      this.#area.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointers cannot be captured; drawing still works.
    }
    if (this.#strokes.length === 0) {
      const rect = this.#area.getBoundingClientRect();
      this.#size = { width: rect.width, height: rect.height };
    }
    this.#active = {
      pointerId: e.pointerId,
      stroke: { color: '#000', width: 2, points: [this.#point(e)] },
    };
    this.#render();
  };

  readonly #onPointerMove = (e: PointerEvent): void => {
    if (!this.#active || e.pointerId !== this.#active.pointerId) return;
    this.#active.stroke.points.push(this.#point(e));
    this.#render();
  };

  readonly #onPointerUp = (e: PointerEvent): void => {
    if (!this.#active || e.pointerId !== this.#active.pointerId) return;
    const { stroke } = this.#active;
    this.#active = null;
    if (strokeLength(stroke) < this.minStrokeLength) {
      this.#render();
      return;
    }
    this.#strokes = [...this.#strokes, stroke];
    this.#render();
    this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: this.value } }));
  };

  readonly #onPointerCancel = (e: PointerEvent): void => {
    if (!this.#active || e.pointerId !== this.#active.pointerId) return;
    this.#active = null;
    this.#render();
  };

  #render(): void {
    const strokes = this.#active ? [...this.#strokes, this.#active.stroke] : this.#strokes;
    if (this.#size) {
      this.#ink.setAttribute('viewBox', `0 0 ${this.#size.width} ${this.#size.height}`);
    }
    this.#ink.innerHTML = toSvgMarkup(strokes);
  }
}
