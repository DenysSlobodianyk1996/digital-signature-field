import { ACTIONS_CSS, createActionButton, DEFAULT_ACTION_LABELS, DEFAULT_ACTIONS, type HistoryAction } from './actions';
import { History } from './history';
import { strokeLength, toSvgDataUrl, type Point, type Size, type Stroke } from './ink';
import { toSvgMarkup, type RenderOptions } from './render';
import { parseValue, toSignatureData, type BaseLayer, type SignatureData } from './value';

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
  ${ACTIONS_CSS}
</style>
<div part="root" class="root">
  <div part="area" class="area" tabindex="0" role="img" aria-label="Signature drawing area">
    <svg part="ink" class="ink" xmlns="${SVG_NS}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg>
  </div>
  <div part="actions" class="actions"></div>
</div>
`;

/** What the history records: one immutable snapshot of the ink per entry. */
interface InkState {
  /** Drawing-area size the ink's coordinates are in; `null` while the field is empty. */
  size: Size | null;
  /** The loaded signature, if any (ADR-0006). Clear removes it; undo brings it back. */
  base: BaseLayer | null;
  /** Strokes drawn on top of the base layer. */
  strokes: readonly Stroke[];
}

const EMPTY: InkState = { size: null, base: null, strokes: [] };

/** Detail of `dsf-history-change`. */
export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  empty: boolean;
}

interface ActiveStroke {
  pointerId: number;
  stroke: Stroke;
  /** Size the stroke is drawn in: the ink's size, or the area's size when the stroke starts on an empty field. */
  size: Size;
}

const DEFAULT_MIN_STROKE_LENGTH = 8;
const DEFAULT_PEN_COLOR = '#000';
const DEFAULT_PEN_WIDTH = 2;
const DEFAULT_SMOOTHING = 0.5;
const DEFAULT_HISTORY_LIMIT = 50;

export class DigitalSignatureFieldElement extends HTMLElement {
  static readonly observedAttributes = ['smoothing', 'pressure', 'history-limit'];

  readonly #area: HTMLDivElement;
  readonly #ink: SVGSVGElement;
  readonly #actions: HTMLDivElement;

  /** Kept strokes (in drawing-area coordinates) and their undo/redo history. The SVG is always redrawn from this. */
  readonly #history = new History<InkState>(EMPTY, DEFAULT_HISTORY_LIMIT);
  #active: ActiveStroke | null = null;
  /** Last `{ canUndo, canRedo, empty }` reported through `dsf-history-change`. */
  #historyState: HistoryState = { canUndo: false, canRedo: false, empty: true };

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = template;
    this.#area = root.querySelector('.area') as HTMLDivElement;
    this.#ink = root.querySelector('.ink') as SVGSVGElement;
    this.#actions = root.querySelector('.actions') as HTMLDivElement;
    for (const action of DEFAULT_ACTIONS) {
      this.#actions.append(createActionButton(action, DEFAULT_ACTION_LABELS[action]));
    }
    this.#actions.addEventListener('click', this.#onActionClick);
    this.#updateActionButtons();
  }

  attributeChangedCallback(name: string): void {
    if (name === 'history-limit') {
      this.#history.limit = this.historyLimit;
      this.#syncHistoryState();
    } else {
      this.#render();
    }
  }

  connectedCallback(): void {
    // A `value` set before the element was upgraded sits on the instance and shadows the accessor.
    if (Object.hasOwn(this, 'value')) {
      const value: unknown = (this as { value?: unknown }).value;
      delete (this as { value?: unknown }).value;
      this.value = value as string | SignatureData | null;
    }
    this.#area.addEventListener('pointerdown', this.#onPointerDown);
    this.#area.addEventListener('pointermove', this.#onPointerMove);
    this.#area.addEventListener('pointerup', this.#onPointerUp);
    this.#area.addEventListener('pointercancel', this.#onPointerCancel);
    this.addEventListener('keydown', this.#onKeyDown);
  }

  disconnectedCallback(): void {
    this.#area.removeEventListener('pointerdown', this.#onPointerDown);
    this.#area.removeEventListener('pointermove', this.#onPointerMove);
    this.#area.removeEventListener('pointerup', this.#onPointerUp);
    this.#area.removeEventListener('pointercancel', this.#onPointerCancel);
    this.removeEventListener('keydown', this.#onKeyDown);
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

  /** Maximum number of undoable entries (strokes and clears). Older entries are dropped first. */
  get historyLimit(): number {
    const n = Number(this.getAttribute('history-limit'));
    return this.hasAttribute('history-limit') && Number.isInteger(n) && n >= 0 ? n : DEFAULT_HISTORY_LIMIT;
  }

  set historyLimit(value: number) {
    this.setAttribute('history-limit', String(value));
  }

  get canUndo(): boolean {
    return this.#history.canUndo;
  }

  get canRedo(): boolean {
    return this.#history.canRedo;
  }

  /** Removes the last stroke, or reverts the last clear. Fires `change` when something was undone. */
  undo(): void {
    if (this.#history.undo()) this.#commit();
  }

  /** Re-applies the most recently undone entry. Fires `change` when something was redone. */
  redo(): void {
    if (this.#history.redo()) this.#commit();
  }

  /** Removes all ink as one undoable entry. Does nothing while the field is empty. */
  clear(): void {
    if (this.empty) return;
    this.#history.push(EMPTY);
    this.#commit();
  }

  /** `true` while there is no ink. */
  get empty(): boolean {
    return this.#strokes.length === 0;
  }

  /** The signature as an SVG data URL, or `null` while the field is empty. */
  get value(): string | null {
    const { size } = this.#history.present;
    if (this.#strokes.length === 0 || !size) return null;
    return toSvgDataUrl(this.#strokes, size, this.#renderOptions);
  }

  /**
   * Loads a signature as the base layer with a fresh history, or empties the field for `null` / `''`.
   * Never fires `change`. Writing the value the field already has does nothing, so the history is kept
   * when a framework binding writes back the value the field just emitted (ADR-0006).
   */
  set value(value: string | SignatureData | null) {
    if (this.#isCurrentValue(value)) return;
    const loaded = parseValue(value);
    this.#active = null;
    this.#history.reset(loaded ? { size: loaded.size, base: loaded.base, strokes: [] } : EMPTY);
    this.#render();
    this.#syncHistoryState();
  }

  #isCurrentValue(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return this.empty;
    if (typeof value === 'string') return value === this.value;
    const { size } = this.#history.present;
    return !this.empty && !!size && JSON.stringify(value) === JSON.stringify(toSignatureData(this.#strokes, size));
  }

  /** Disables each built-in button while its action would do nothing. */
  #updateActionButtons(): void {
    const available: Record<HistoryAction, boolean> = {
      undo: this.canUndo,
      redo: this.canRedo,
      clear: !this.empty,
    };
    for (const button of this.#actions.querySelectorAll<HTMLButtonElement>('button[data-action]')) {
      button.disabled = !available[button.dataset['action'] as HistoryAction];
    }
  }

  readonly #onActionClick = (e: MouseEvent): void => {
    const button = (e.target as Element).closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled) return;
    this.#run(button.dataset['action'] as HistoryAction);
  };

  /** Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo. Keydowns reach the host only while focus is inside the field. */
  readonly #onKeyDown = (e: KeyboardEvent): void => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const key = e.key.toLowerCase();
    const action: HistoryAction | null =
      key === 'z' ? (e.shiftKey ? 'redo' : 'undo') : key === 'y' && !e.shiftKey ? 'redo' : null;
    if (!action) return;
    e.preventDefault();
    this.#run(action);
  };

  #run(action: HistoryAction): void {
    if (action === 'undo') this.undo();
    else if (action === 'redo') this.redo();
    else this.clear();
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
    const rect = this.#area.getBoundingClientRect();
    const size = (!this.empty && this.#history.present.size) || { width: rect.width, height: rect.height };
    this.#active = {
      pointerId: e.pointerId,
      stroke: { color: this.penColor, width: this.penWidth, points: [] },
      size,
    };
    this.#active.stroke.points.push(this.#point(e));
    this.#render();
  };

  readonly #onPointerMove = (e: PointerEvent): void => {
    if (!this.#active || e.pointerId !== this.#active.pointerId) return;
    this.#active.stroke.points.push(this.#point(e));
    this.#render();
  };

  readonly #onPointerUp = (e: PointerEvent): void => {
    if (!this.#active || e.pointerId !== this.#active.pointerId) return;
    const { stroke, size } = this.#active;
    this.#active = null;
    if (strokeLength(stroke) < this.minStrokeLength) {
      this.#render();
      return;
    }
    const { base, strokes } = this.#history.present;
    this.#history.push({ size, base, strokes: [...strokes, stroke] });
    this.#commit();
  };

  readonly #onPointerCancel = (e: PointerEvent): void => {
    if (!this.#active || e.pointerId !== this.#active.pointerId) return;
    this.#active = null;
    this.#render();
  };

  /** All ink: the base layer's strokes, then the strokes drawn on top. */
  get #strokes(): readonly Stroke[] {
    const { base, strokes } = this.#history.present;
    return base ? [...base.strokes, ...strokes] : strokes;
  }

  /** Size of the ink on screen: the stroke being drawn's while drawing, else the history's. */
  get #size(): Size | null {
    return this.#active?.size ?? this.#history.present.size;
  }

  /** After the history moved: redraw and tell listeners about the new value. */
  #commit(): void {
    this.#render();
    this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: this.value } }));
    this.#syncHistoryState();
  }

  /** Fires `dsf-history-change` when `canUndo`, `canRedo` or `empty` differ from what was last reported. */
  #syncHistoryState(): void {
    const next: HistoryState = { canUndo: this.canUndo, canRedo: this.canRedo, empty: this.empty };
    const prev = this.#historyState;
    if (next.canUndo === prev.canUndo && next.canRedo === prev.canRedo && next.empty === prev.empty) return;
    this.#historyState = next;
    this.#updateActionButtons();
    this.dispatchEvent(new CustomEvent('dsf-history-change', { bubbles: true, detail: { ...next } }));
  }

  #render(): void {
    const strokes = this.#active ? [...this.#strokes, this.#active.stroke] : this.#strokes;
    const size = this.#size;
    if (size) this.#ink.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
    this.#ink.innerHTML = toSvgMarkup(strokes, this.#renderOptions);
  }
}
