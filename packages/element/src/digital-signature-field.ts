import {
  ACTIONS_CSS,
  ACTIONS_POSITIONS,
  createActionButton,
  createColorGroup,
  createWidthGroup,
  DEFAULT_ACTIONS,
  DEFAULT_LABELS,
  DEFAULT_PEN_COLORS,
  parseActions,
  type ActionsPosition,
  type HistoryAction,
  type Labels,
} from './actions';
import { FormField } from './form';
import { History } from './history';
import { STYLING_CSS, toStyleSheets, type Styles } from './styles';
import { strokeLength, type Point, type Size, type Stroke } from './ink';
import { toSvgMarkup, type RenderOptions } from './render';
import {
  baseImageMarkup,
  prepareImages,
  toData,
  toPngDataUrl,
  toSvgDataUrl,
  VALUE_FORMATS,
  type ExportOptions,
  type Ink,
  type ValueFormat,
} from './serialize';
import { parseValue, type BaseLayer, type SignatureData } from './value';

const SVG_NS = 'http://www.w3.org/2000/svg';

const template = `
<style>
  :host {
    display: block;
  }
  .root {
    display: flex;
    flex-direction: column;
    gap: var(--dsf-gap, 4px);
  }
  .root[data-position='top'] .actions,
  .root[data-position='start'] .actions {
    order: -1;
  }
  .root[data-position='start'],
  .root[data-position='end'] {
    flex-direction: row;
  }
  .root[data-position='start'] .area,
  .root[data-position='end'] .area {
    flex: 1;
    min-width: 0;
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
  .placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    pointer-events: none;
  }
  .placeholder[hidden] {
    display: none;
  }
  .status {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  ${ACTIONS_CSS}
  ${STYLING_CSS}
</style>
<div part="root" class="root" data-position="bottom">
  <div part="area" class="area" tabindex="0" role="img">
    <div part="guide" class="guide" aria-hidden="true"></div>
    <svg part="ink" class="ink" xmlns="${SVG_NS}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg>
    <div class="placeholder"><slot name="placeholder"></slot></div>
  </div>
  <div part="actions" class="actions">
    <slot name="actions">
      <slot name="actions-start"></slot>
      <div class="builtins"></div>
      <slot name="actions-end"></slot>
    </slot>
  </div>
  <div part="status" class="status" role="status" aria-live="polite"></div>
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
  /** Set once the stroke is long enough to be kept, when `dsf-stroke-start` has fired. */
  started: boolean;
}

const DEFAULT_MIN_STROKE_LENGTH = 8;
const DEFAULT_MIN_STROKES = 1;
const DEFAULT_PEN_COLOR = '#000';
const DEFAULT_PEN_WIDTH = 2;
const DEFAULT_SMOOTHING = 0.5;
const DEFAULT_HISTORY_LIMIT = 50;
const DEFAULT_VALUE_FORMAT: ValueFormat = 'svg';
const DEFAULT_BACKGROUND = '#fff';

export class DigitalSignatureFieldElement extends HTMLElement {
  static readonly formAssociated = true;
  static readonly observedAttributes = [
    'smoothing',
    'pressure',
    'history-limit',
    'actions',
    'actions-position',
    'pen-color',
    'pen-width',
    'disabled',
    'readonly',
    'required',
    'min-strokes',
  ];

  readonly #root: HTMLDivElement;
  readonly #area: HTMLDivElement;
  readonly #ink: SVGSVGElement;
  readonly #placeholder: HTMLDivElement;
  readonly #actions: HTMLDivElement;
  /** The built-in buttons: fallback content of the `actions` slot, between `actions-start` and `actions-end`. */
  readonly #builtins: HTMLDivElement;
  readonly #status: HTMLDivElement;
  readonly #formField: FormField;

  /** The `styles` value, and the sheets adopted for it (after the built-in styles). */
  #styles: Styles | null = null;
  #injectedSheets: CSSStyleSheet[] = [];

  #labels: Labels = DEFAULT_LABELS;
  #penColors: readonly string[] = DEFAULT_PEN_COLORS;

  /** Kept strokes (in drawing-area coordinates) and their undo/redo history. The SVG is always redrawn from this. */
  readonly #history = new History<InkState>(EMPTY, DEFAULT_HISTORY_LIMIT);
  /** What a native form reset restores: the value the field was first loaded with (empty until a value is loaded). */
  #initialState: InkState | null = null;
  /** Disabled by its own `disabled` attribute or by a disabled ancestor `<fieldset>`. */
  #formDisabled = false;
  #active: ActiveStroke | null = null;
  /** Last `{ canUndo, canRedo, empty }` reported through `dsf-history-change`. */
  #historyState: HistoryState = { canUndo: false, canRedo: false, empty: true };

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
    root.innerHTML = template;
    this.#root = root.querySelector('.root') as HTMLDivElement;
    this.#area = root.querySelector('.area') as HTMLDivElement;
    this.#ink = root.querySelector('.ink') as SVGSVGElement;
    this.#placeholder = root.querySelector('.placeholder') as HTMLDivElement;
    this.#actions = root.querySelector('.actions') as HTMLDivElement;
    this.#builtins = root.querySelector('.builtins') as HTMLDivElement;
    this.#status = root.querySelector('.status') as HTMLDivElement;
    this.#formField = new FormField(this, this.#area);
    this.#builtins.addEventListener('click', this.#onActionClick);
    this.#renderActions();
    this.#updateEmptyState();
    this.#syncForm();
  }

  attributeChangedCallback(name: string): void {
    switch (name) {
      case 'history-limit':
        this.#history.limit = this.historyLimit;
        this.#syncHistoryState();
        break;
      case 'actions':
        this.#renderActions();
        break;
      case 'actions-position':
        this.#root.dataset['position'] = this.actionsPosition;
        break;
      case 'pen-color':
      case 'pen-width':
        this.#updateActionButtons();
        break;
      case 'disabled':
      case 'readonly':
        this.#syncInteractivity();
        break;
      case 'required':
      case 'min-strokes':
        this.#syncForm();
        break;
      default:
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
    if (Object.hasOwn(this, 'styles')) {
      const styles: unknown = (this as { styles?: unknown }).styles;
      delete (this as { styles?: unknown }).styles;
      this.styles = styles as Styles | null;
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
    this.#setActive(null);
  }

  /** Called by the browser for `disabled` on the field or on an ancestor `<fieldset>`. */
  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.#syncInteractivity();
  }

  /** Native form reset: back to the initial value, as a load (no `change`, fresh history). */
  formResetCallback(): void {
    this.#load(this.#initialState ?? EMPTY);
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

  /** Format of `value` and of the `change` detail. Switching it emits nothing; the next `change` uses it. */
  get valueFormat(): ValueFormat {
    const format = this.getAttribute('value-format')?.trim().toLowerCase() as ValueFormat | undefined;
    return format && VALUE_FORMATS.includes(format) ? format : DEFAULT_VALUE_FORMAT;
  }

  set valueFormat(value: ValueFormat) {
    this.setAttribute('value-format', value);
  }

  /** Colour painted under the ink in SVG and PNG exports: any CSS colour, or `'transparent'`. */
  get background(): string {
    return this.getAttribute('background')?.trim() || DEFAULT_BACKGROUND;
  }

  set background(value: string) {
    this.setAttribute('background', value);
  }

  get #exportOptions(): ExportOptions {
    return { render: this.#renderOptions, background: this.background };
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
    return this.#formDisabled || this.disabled || this.readOnly;
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

  /** Space-separated built-in actions: `undo`, `redo`, `clear`, `color`, `width`, or `none` (headless mode). */
  get actions(): string {
    return this.getAttribute('actions') ?? DEFAULT_ACTIONS;
  }

  set actions(value: string) {
    this.setAttribute('actions', value);
  }

  /** Where the actions bar sits. `start` and `end` are logical sides that follow `dir`. */
  get actionsPosition(): ActionsPosition {
    const value = this.getAttribute('actions-position')?.trim().toLowerCase();
    return ACTIONS_POSITIONS.find((p) => p === value) ?? 'bottom';
  }

  set actionsPosition(value: ActionsPosition) {
    this.setAttribute('actions-position', value);
  }

  /** Texts of the built-in buttons, the drawing area's name and the status messages. Unset keys stay English. */
  get labels(): Labels {
    return { ...this.#labels };
  }

  set labels(value: Partial<Labels> | null | undefined) {
    this.#labels = { ...DEFAULT_LABELS, ...value };
    this.#renderActions();
    this.#updateEmptyState();
  }

  /** Swatches offered by the `color` action. */
  get penColors(): string[] {
    return [...this.#penColors];
  }

  set penColors(value: readonly string[] | null | undefined) {
    this.#penColors = value?.length ? [...value] : DEFAULT_PEN_COLORS;
    this.#renderActions();
  }

  /**
   * Extra style sheets, adopted after the built-in styles (ADR-0007). Setting it again replaces the
   * previously injected sheets; `null` removes them. Selectors inside the shadow root are not covered by semver.
   */
  get styles(): Styles | null {
    return this.#styles;
  }

  set styles(value: Styles | null | undefined) {
    const sheets = toStyleSheets(value);
    const root = this.shadowRoot!;
    const previous = new Set(this.#injectedSheets);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets.filter((s) => !previous.has(s)), ...sheets];
    this.#injectedSheets = sheets;
    this.#styles = value ?? null;
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

  /** `true` while there is no ink (no strokes and no base-layer image). */
  get empty(): boolean {
    return this.#inkToExport === null;
  }

  /** The signature in `valueFormat` (an SVG or PNG data URL, or signature data), or `null` while the field is empty. */
  get value(): string | SignatureData | null {
    const ink = this.#inkToExport;
    if (!ink) return null;
    switch (this.valueFormat) {
      case 'json':
        return toData(ink);
      case 'png':
        return toPngDataUrl(ink, this.#exportOptions);
      default:
        return toSvgDataUrl(ink, this.#exportOptions);
    }
  }

  /** The signature as an SVG data URL, whatever `valueFormat` is. An empty field gives an image of the background only. */
  toSVG(): string {
    return toSvgDataUrl(this.#inkOrBlank, this.#exportOptions);
  }

  /** The signature as a PNG data URL, `scale` times the drawing-area size (default 1), whatever `valueFormat` is. */
  async toPNG({ scale = 1 }: { scale?: number } = {}): Promise<string> {
    const ink = this.#inkOrBlank;
    await prepareImages(ink);
    return toPngDataUrl(ink, this.#exportOptions, scale);
  }

  /** Lossless signature data, or `null` while the field is empty, whatever `valueFormat` is. */
  toJSON(): SignatureData | null {
    const ink = this.#inkToExport;
    return ink && toData(ink);
  }

  /** The present ink, or `null` while there is none. */
  get #inkToExport(): Ink | null {
    const { size, base, strokes } = this.#history.present;
    if (!size || (strokes.length === 0 && !base?.strokes.length && !base?.image)) return null;
    return { size, base, strokes };
  }

  /** The present ink, or nothing at the drawing area's current size. */
  get #inkOrBlank(): Ink {
    if (this.#inkToExport) return this.#inkToExport;
    const rect = this.#surface();
    return { size: { width: rect.width || 300, height: rect.height || 150 }, base: null, strokes: [] };
  }

  /** Applies disabled / readonly: drops a stroke in progress, updates the buttons and the tab order. */
  #syncInteractivity(): void {
    if (this.#locked && this.#active) {
      this.#setActive(null);
      this.#render();
    }
    this.#area.tabIndex = this.#formDisabled ? -1 : 0;
    if (this.#formDisabled) this.#area.setAttribute('aria-disabled', 'true');
    else this.#area.removeAttribute('aria-disabled');
    this.#updateActionButtons();
  }

  /**
   * Loads a signature as the base layer with a fresh history, or empties the field for `null` / `''`.
   * Never fires `change`. Writing the value the field already has does nothing, so the history is kept
   * when a framework binding writes back the value the field just emitted (ADR-0006).
   */
  set value(value: string | SignatureData | null) {
    if (this.#isCurrentValue(value)) return;
    const loaded = parseValue(value);
    if (loaded) void prepareImages(loaded);
    const state: InkState = loaded ? { size: loaded.size, base: loaded.base, strokes: [] } : EMPTY;
    this.#initialState ??= state;
    this.#load(state);
  }

  #isCurrentValue(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return this.empty;
    const current = this.#inkToExport;
    if (!current) return false;
    if (typeof value === 'string') return value === this.value || value === toSvgDataUrl(current, this.#exportOptions);
    const loaded = parseValue(value);
    return !!loaded && JSON.stringify(toData({ ...loaded, strokes: [] })) === JSON.stringify(toData(current));
  }

  /** Rebuilds the built-in buttons from `actions`, `labels` and `penColors`. */
  #renderActions(): void {
    const actions = parseActions(this.actions);
    this.#actions.hidden = actions === null;
    this.#builtins.replaceChildren(
      ...(actions ?? []).map((action) =>
        action === 'color'
          ? createColorGroup(this.#penColors, this.#labels)
          : action === 'width'
            ? createWidthGroup(this.#labels)
            : createActionButton(action, this.#labels[action]),
      ),
    );
    this.#updateActionButtons();
  }

  /**
   * Disables every built-in button while the field is disabled or readonly, and each history button while
   * its action would do nothing. Marks the swatch and width matching the current pen as pressed.
   */
  #updateActionButtons(): void {
    const locked = this.#locked;
    const available: Record<HistoryAction, boolean> = {
      undo: this.canUndo,
      redo: this.canRedo,
      clear: !this.empty,
    };
    const penColor = this.penColor.toLowerCase();
    for (const button of this.#builtins.querySelectorAll<HTMLButtonElement>('button[data-action]')) {
      const action = button.dataset['action'];
      const value = button.dataset['value'] ?? '';
      if (action === 'color') {
        button.setAttribute('aria-pressed', String(value.trim().toLowerCase() === penColor));
        button.disabled = locked;
      } else if (action === 'width') {
        button.setAttribute('aria-pressed', String(Number(value) === this.penWidth));
        button.disabled = locked;
      } else {
        button.disabled = locked || !available[action as HistoryAction];
      }
    }
  }

  /** Names the drawing area, shows the placeholder while empty, and sets the text the live region announces. */
  #updateEmptyState(): void {
    this.#area.setAttribute('aria-label', this.#labels.drawingArea);
    this.#placeholder.hidden = !this.empty;
    this.#status.textContent = this.empty ? this.#labels.emptyStatus : this.#labels.signedStatus;
  }

  readonly #onActionClick = (e: MouseEvent): void => {
    const button = (e.target as Element).closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset['action'];
    const value = button.dataset['value'] ?? '';
    if (action === 'color') this.penColor = value;
    else if (action === 'width') this.penWidth = Number(value);
    else this.#run(action as HistoryAction);
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
   * The box the ink is painted in: the ink SVG fills the area inside its border, and its viewBox is fitted
   * into exactly this box. Sizes and pointer positions are measured here, not on the area's border box.
   */
  #surface(): DOMRect {
    return this.#ink.getBoundingClientRect();
  }

  /**
   * The pointer position in stroke coordinates. Strokes keep the size the area had when the first one
   * was drawn; the ink is scaled to fit the current area and centred (ADR-0004), so map back through that.
   */
  #point(e: PointerEvent): Point {
    const rect = this.#surface();
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
    const rect = this.#surface();
    const size = (!this.empty && this.#history.present.size) || { width: rect.width, height: rect.height };
    const active: ActiveStroke = {
      pointerId: e.pointerId,
      stroke: { color: this.penColor, width: this.penWidth, points: [] },
      size,
      started: false,
    };
    this.#setActive(active);
    active.stroke.points.push(this.#point(e));
    this.#render();
  };

  readonly #onPointerMove = (e: PointerEvent): void => {
    if (!this.#active || e.pointerId !== this.#active.pointerId) return;
    this.#active.stroke.points.push(this.#point(e));
    if (!this.#active.started && strokeLength(this.#active.stroke) >= this.minStrokeLength) {
      this.#active.started = true;
      this.#dispatchStroke('dsf-stroke-start', this.#strokes.length + 1);
    }
    this.#render();
  };

  readonly #onPointerUp = (e: PointerEvent): void => {
    if (!this.#active || e.pointerId !== this.#active.pointerId) return;
    const { stroke, size, started } = this.#active;
    this.#setActive(null);
    if (strokeLength(stroke) < this.minStrokeLength) {
      this.#render();
      return;
    }
    if (!started) this.#dispatchStroke('dsf-stroke-start', this.#strokes.length + 1);
    const { base, strokes } = this.#history.present;
    this.#history.push({ size, base, strokes: [...strokes, stroke] });
    this.#commit();
    this.#dispatchStroke('dsf-stroke-end', this.#strokes.length);
  };

  /** `dsf-stroke-start` (the stroke became long enough to keep) / `dsf-stroke-end` (it was kept), with the stroke count including it. */
  #dispatchStroke(type: 'dsf-stroke-start' | 'dsf-stroke-end', strokeCount: number): void {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, detail: { strokeCount } }));
  }

  readonly #onPointerCancel = (e: PointerEvent): void => {
    if (!this.#active || e.pointerId !== this.#active.pointerId) return;
    this.#setActive(null);
    this.#render();
  };

  /** Starts or ends the stroke in progress; `:state(drawing)` matches while there is one. */
  #setActive(active: ActiveStroke | null): void {
    this.#active = active;
    this.#formField.drawing = active !== null;
  }

  /** All ink: the base layer's strokes, then the strokes drawn on top. */
  get #strokes(): readonly Stroke[] {
    const { base, strokes } = this.#history.present;
    return base ? [...base.strokes, ...strokes] : strokes;
  }

  /** Size of the ink on screen: the stroke being drawn's while drawing, else the history's. */
  get #size(): Size | null {
    return this.#active?.size ?? this.#history.present.size;
  }

  /**
   * Loads ink as the floor of a fresh history (the base layer, ADR-0006). Never fires `change`.
   * The single load path: form reset uses it, and so does writing `value`.
   */
  #load(state: InkState): void {
    this.#setActive(null);
    this.#history.reset(state);
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
    const value = this.value;
    const strokeCount = this.#strokes.length;
    this.#formField.sync({
      // Forms submit text: signature data (`value-format="json"`) is submitted as its JSON.
      value: value === null || typeof value === 'string' ? value : JSON.stringify(value),
      // A loaded image cannot be counted stroke by stroke; it counts as a complete signature.
      strokeCount: this.#history.present.base?.image ? Math.max(1, this.minStrokes, strokeCount) : strokeCount,
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
    this.#updateEmptyState();
    this.dispatchEvent(new CustomEvent('dsf-history-change', { bubbles: true, detail: { ...next } }));
  }

  #render(): void {
    const strokes = this.#active ? [...this.#strokes, this.#active.stroke] : this.#strokes;
    const size = this.#size;
    if (size) this.#ink.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
    const image = size ? baseImageMarkup({ size, base: this.#history.present.base }) : '';
    // Built from parsed data only (escaped attributes, a rebuilt image data URL): a loaded value is never injected as markup.
    this.#ink.innerHTML = image + toSvgMarkup(strokes, this.#renderOptions);
  }
}
