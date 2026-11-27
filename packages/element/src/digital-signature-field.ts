import { strokeLength, toSvgDataUrl, type Point, type Stroke } from './ink';
import { toSvgMarkup, type RenderOptions } from './render';

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
    <svg part="ink" class="ink" xmlns="${SVG_NS}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg>
  </div>
</div>
`;

interface ActiveStroke {
  pointerId: number;
  stroke: Stroke;
}

const DEFAULT_MIN_STROKE_LENGTH = 8;
const DEFAULT_PEN_COLOR = '#000';
const DEFAULT_PEN_WIDTH = 2;
const DEFAULT_SMOOTHING = 0.5;

export class DigitalSignatureFieldElement extends HTMLElement {
  static readonly observedAttributes = ['smoothing', 'pressure'];

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

  attributeChangedCallback(): void {
    this.#render();
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

  /** Colour of new strokes. Existing strokes keep the colour they were drawn with. */
  get penColor(): string {
    return this.getAttribute('pen-color')?.trim() || DEFAULT_PEN_COLOR;
  }

  set penColor(value: string) {
    this.setAttribute('pen-color', value);
  }

  /** Base width (px) of new strokes. Existing strokes keep the width they were drawn with. */
  get penWidth(): number {
    const n = Number(this.getAttribute('pen-width'));
    return this.hasAttribute('pen-width') && Number.isFinite(n) && n > 0 ? n : DEFAULT_PEN_WIDTH;
  }

  set penWidth(value: number) {
    this.setAttribute('pen-width', String(value));
  }

  /** 0 draws raw polylines; up to 1 draws increasingly smooth curves. Applies to all ink when rendering. */
  get smoothing(): number {
    const n = Number(this.getAttribute('smoothing'));
    return this.hasAttribute('smoothing') && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_SMOOTHING;
  }

  set smoothing(value: number) {
    this.setAttribute('smoothing', String(value));
  }

  /** Varies the width along a stroke with pen pressure, when the device reports it. */
  get pressure(): boolean {
    return this.hasAttribute('pressure');
  }

  set pressure(value: boolean) {
    this.toggleAttribute('pressure', Boolean(value));
  }

  get #renderOptions(): RenderOptions {
    return { smoothing: this.smoothing, pressure: this.pressure };
  }

  /** The signature as an SVG data URL, or `null` while the field is empty. */
  get value(): string | null {
    if (this.#strokes.length === 0 || !this.#size) return null;
    return toSvgDataUrl(this.#strokes, this.#size, this.#renderOptions);
  }

  /**
   * The pointer position in stroke coordinates. Strokes keep the size the area had when the first one
   * was drawn; the ink is scaled to fit the current area and centred (ADR-0004), so map back through that.
   */
  #point(e: PointerEvent): Point {
    const rect = this.#area.getBoundingClientRect();
    const size = this.#size ?? rect;
    const scale = Math.min(rect.width / size.width, rect.height / size.height) || 1;
    const offsetX = (rect.width - size.width * scale) / 2;
    const offsetY = (rect.height - size.height * scale) / 2;
    return {
      x: (e.clientX - rect.left - offsetX) / scale,
      y: (e.clientY - rect.top - offsetY) / scale,
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
      stroke: { color: this.penColor, width: this.penWidth, points: [this.#point(e)] },
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
    this.#ink.innerHTML = toSvgMarkup(strokes, this.#renderOptions);
  }
}
