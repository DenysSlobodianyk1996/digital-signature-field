import { ACTIONS_CSS, createActionButton, DEFAULT_ACTION_LABELS, DEFAULT_ACTIONS, type HistoryAction } from './actions';
import { FormField } from './form';
import { History } from './history';
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
  .area:focus-visible {
    outline: var(--dsf-focus-ring, 2px solid #1a3fbf);
    outline-offset: 2px;
  }
  :host(:state(invalid)) .area {
    border-color: var(--dsf-invalid-color, #b3261e);
  }
  :host(:disabled) .area {
    cursor: not-allowed;
    opacity: 0.6;
  }
  :host([readonly]) .area {
    cursor: default;
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
  strokes: readonly Stroke[];
}

/** Detail of `dsf-history-change`. */
export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  empty: boolean;
}

interface ActiveStroke {
  pointerId: number;
  stroke: Stroke;
}

const DEFAULT_MIN_STROKE_LENGTH = 8;
const DEFAULT_MIN_STROKES = 1;
const DEFAULT_PEN_COLOR = '#000';
const DEFAULT_PEN_WIDTH = 2;
const DEFAULT_SMOOTHING = 0.5;
const DEFAULT_HISTORY_LIMIT = 50;

export class DigitalSignatureFieldElement extends HTMLElement {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['smoothing', 'pressure', 'history-limit', 'required', 'min-strokes', 'readonly'];

  readonly #area: HTMLDivElement;
  readonly #ink: SVGSVGElement;
  readonly #actions: HTMLDivElement;
  readonly #formField: FormField;

  /** Kept strokes (in drawing-area coordinates) and their undo/redo history. The SVG is always redrawn from this. */
  #history = new History<InkState>({ strokes: [] }, DEFAULT_HISTORY_LIMIT);
  /** What a native form reset restores: the ink the field was first loaded with (empty until a value is loaded). */
  #initialState: InkState = { strokes: [] };
  /** Disabled by its own `disabled` attribute or by a disabled ancestor `<fieldset>`. */
  #formDisabled = false;
  /** Drawing-area size the strokes are stored in; set when the first stroke starts. */
  #size: { width: number; height: number } | null = null;
  #active: ActiveStroke | null = null;
  /** Last `{ canUndo, canRedo, empty }` reported through `dsf-history-change`. */
  #historyState: HistoryState = { canUndo: false, canRedo: false, empty: true };

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
    root.innerHTML = template;
    this.#area = root.querySelector('.area') as HTMLDivElement;
    this.#ink = root.querySelector('.ink') as SVGSVGElement;
    this.#actions = root.querySelector('.actions') as HTMLDivElement;
    this.#formField = new FormField(this, this.#area);
    for (const action of DEFAULT_ACTIONS) {
      this.#actions.append(createActionButton(action, DEFAULT_ACTION_LABELS[action]));
    }
    this.#actions.addEventListener('click', this.#onActionClick);
    this.#updateActionButtons();
    this.#syncForm();
  }

  attributeChangedCallback(name: string): void {
    if (name === 'history-limit') {
      this.#history.limit = this.historyLimit;
      this.#syncHistoryState();
    } else if (name === 'required' || name === 'min-strokes') {
      this.#syncForm();
    } else if (name === 'readonly') {
      this.#syncInteractivity();
    } else {
      this.#render();
    }
  }

  connectedCallback(): void {
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

  /** Called by the browser for `disabled` on the field or on an ancestor `<fieldset>`. */
  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.#syncInteractivity();
  }

  /** Native form reset: back to the initial value, as a load (no `change`, fresh history). */
  formResetCallback(): void {
    this.#load(this.#initialState);
    this.#formField.resetInteraction();
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

  /** Form field name: the key of the value in `FormData`. */
  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(value: string) {
    this.setAttribute('name', value);
  }

  /** The `<form>` this field belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.#formField.form;
  }

  /** Blocks drawing and all actions, and leaves the value out of form submission. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** Shows the ink but blocks drawing and all actions. The value is still submitted. */
  get readOnly(): boolean {
    return this.hasAttribute('readonly');
  }

  set readOnly(value: boolean) {
    this.toggleAttribute('readonly', Boolean(value));
  }

  /** `true` while the signer may not change the ink (disabled, inside a disabled fieldset, or readonly). */
  get #locked(): boolean {
    return this.#formDisabled || this.readOnly;
  }

  /** An empty field is invalid (`valueMissing`). */
  get required(): boolean {
    return this.hasAttribute('required');
  }

  set required(value: boolean) {
    this.toggleAttribute('required', Boolean(value));
  }

  /** A signed field with fewer strokes than this is invalid (`tooShort`). Taps never count. */
  get minStrokes(): number {
    const n = Number(this.getAttribute('min-strokes'));
    return this.hasAttribute('min-strokes') && Number.isInteger(n) && n >= 0 ? n : DEFAULT_MIN_STROKES;
  }

  set minStrokes(value: number) {
    this.setAttribute('min-strokes', String(value));
  }

  get validity(): ValidityState {
    return this.#formField.validity;
  }

  get validationMessage(): string {
    return this.#formField.validationMessage;
  }

  get willValidate(): boolean {
    return this.#formField.willValidate;
  }

  checkValidity(): boolean {
    return this.#formField.checkValidity();
  }

  reportValidity(): boolean {
    return this.#formField.reportValidity();
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
    this.#history.push({ strokes: [] });
    this.#commit();
  }

  /** `true` while there is no ink. */
  get empty(): boolean {
    return this.#strokes.length === 0;
  }

  /** The signature as an SVG data URL, or `null` while the field is empty. */
  get value(): string | null {
    if (this.#strokes.length === 0 || !this.#size) return null;
    return toSvgDataUrl(this.#strokes, this.#size, this.#renderOptions);
  }

  /** Applies disabled / readonly: drops a stroke in progress, updates the buttons and the tab order. */
  #syncInteractivity(): void {
    if (this.#locked && this.#active) {
      this.#active = null;
      this.#render();
    }
    this.#area.tabIndex = this.#formDisabled ? -1 : 0;
    if (this.#formDisabled) this.#area.setAttribute('aria-disabled', 'true');
    else this.#area.removeAttribute('aria-disabled');
    this.#updateActionButtons();
  }

  /** Disables each built-in button while its action would do nothing. */
  #updateActionButtons(): void {
    const available: Record<HistoryAction, boolean> = {
      undo: this.canUndo,
      redo: this.canRedo,
      clear: !this.empty,
    };
    for (const button of this.#actions.querySelectorAll<HTMLButtonElement>('button[data-action]')) {
      button.disabled = this.#locked || !available[button.dataset['action'] as HistoryAction];
    }
  }

  readonly #onActionClick = (e: MouseEvent): void => {
    const button = (e.target as Element).closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled) return;
    this.#run(button.dataset['action'] as HistoryAction);
  };

  /** Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo. Keydowns reach the host only while focus is inside the field. */
  readonly #onKeyDown = (e: KeyboardEvent): void => {
    if (this.#locked || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    const key = e.key.toLowerCase();
    const action: HistoryAction | null =
      key === 'z' ? (e.shiftKey ? 'redo' : 'undo') : key === 'y' && !e.shiftKey ? 'redo' : null;
    if (!action) return;
    e.preventDefault();
    this.#run(action);
  };

  #run(action: HistoryAction): void {
    if (this.#locked) return;
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
    if (this.#active || e.button !== 0 || this.#locked) return;
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
    this.#history.push({ strokes: [...this.#strokes, stroke] });
    this.#commit();
  };

  readonly #onPointerCancel = (e: PointerEvent): void => {
    if (!this.#active || e.pointerId !== this.#active.pointerId) return;
    this.#active = null;
    this.#render();
  };

  get #strokes(): readonly Stroke[] {
    return this.#history.present.strokes;
  }

  /**
   * Loads ink as the floor of a fresh history (the base layer, ADR-0006). Never fires `change`.
   * The single load path: form reset uses it, and so does writing `value`.
   */
  #load(state: InkState): void {
    this.#active = null;
    this.#history = new History<InkState>(state, this.historyLimit);
    this.#render();
    this.#syncForm();
    this.#syncHistoryState();
  }

  /** After the history moved: redraw and tell listeners about the new value. */
  #commit(): void {
    this.#render();
    this.#syncForm();
    this.#formField.markInteracted();
    this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: this.value } }));
    this.#syncHistoryState();
  }

  /** Reports the current value and validity to the form. */
  #syncForm(): void {
    this.#formField.sync({
      value: this.value,
      strokeCount: this.#strokes.length,
      required: this.required,
      minStrokes: this.minStrokes,
    });
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
    if (this.#size) {
      this.#ink.setAttribute('viewBox', `0 0 ${this.#size.width} ${this.#size.height}`);
    }
    this.#ink.innerHTML = toSvgMarkup(strokes, this.#renderOptions);
  }
}
