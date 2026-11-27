import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  type ElementRef,
  EventEmitter,
  Output,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
// Types only: the element module registers the custom element when it is evaluated, which needs a
// browser. The component loads it with a dynamic import after the first render in the browser.
import type {
  ActionsPosition,
  DigitalSignatureFieldElement,
  HistoryState,
  Labels,
  SignatureData,
  Styles,
  ValueFormat,
} from '@digital-signature-field/element';

/** The field's value: a data URL or `SignatureData` (per `valueFormat`), or `null` while empty. */
export type DsfSignatureValue = string | SignatureData | null;

/** Detail of the `strokeStart` and `strokeEnd` outputs. */
export interface DsfStrokeEvent {
  /** Number of strokes in the field, including this one. */
  strokeCount: number;
}

/** Element settings mirrored one to one; `undefined` leaves the element's default. */
type Settings = Partial<{
  valueFormat: ValueFormat;
  background: string;
  penColor: string;
  penWidth: number;
  pressure: boolean;
  smoothing: number;
  minStrokes: number;
  minStrokeLength: number;
  historyLimit: number;
  actions: string;
  actionsPosition: ActionsPosition;
  labels: Partial<Labels>;
  penColors: readonly string[];
  styles: Styles;
}>;

const optionalBoolean = (value: unknown): boolean | undefined => (value == null ? undefined : booleanAttribute(value));

/**
 * `<dsf-signature>`: renders `<digital-signature-field>` and carries its value.
 *
 * Its form contract has the `FormValueControl` shape (ADR-0003), matched by structure and never
 * imported: `value` is a `model()`; `disabled`, `readonly`, `invalid`, `required`, `touched` and
 * `name` are inputs; `touch` is an output. Angular 22+ binds it with `[formField]`, `formControlName`
 * or `ngModel`; Angular 17–21 needs the opt-in `dsfCva` directive.
 *
 * Every other element setting is an input with the element property's name. The element's events are
 * the `historyChange`, `strokeStart` and `strokeEnd` outputs, and its methods are on the component.
 *
 * Safe under server-side rendering: the element module is only loaded, and the element only touched,
 * in the browser after the first render.
 *
 * Built with Angular 17.2, so it uses `@Output()` (the `output()` function arrived in 17.3).
 */
@Component({
  selector: 'dsf-signature',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.dsf-invalid]': 'invalid()' },
  template: `<digital-signature-field
    #field
    (change)="onElementChange($event)"
    (dsf-history-change)="onHistoryChange($event)"
    (dsf-stroke-start)="onStrokeStart($event)"
    (dsf-stroke-end)="onStrokeEnd($event)"
    (blur)="touch.emit()"
  ></digital-signature-field>`,
  styles: [':host { display: block; }'],
})
export class DsfSignature {
  // Form contract.
  /** The signature (an SVG data URL by default), or `null` while the field is empty. Two-way: `[(value)]`. */
  readonly value = model<DsfSignatureValue>(null);
  /** Blocks drawing and all actions. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Shows the ink and blocks drawing and actions. */
  readonly readonly = input(false, { transform: booleanAttribute });
  /** Set by forms when the control is invalid; adds the `dsf-invalid` class to the host. */
  readonly invalid = input(false, { transform: booleanAttribute });
  /** Invalid (`valueMissing`) while empty. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Set by forms once the control is touched. */
  readonly touched = input(false, { transform: booleanAttribute });
  /** Form field name, used when the field sits in a native `<form>`. */
  readonly name = input('');
  /** Fires when focus leaves the field, and when a stroke ends while the control is untouched. */
  @Output() readonly touch = new EventEmitter<void>();

  // Element settings (docs/api.md). Unset inputs keep the element's defaults.
  readonly valueFormat = input<ValueFormat>();
  readonly background = input<string>();
  readonly penColor = input<string>();
  readonly penWidth = input<number>();
  readonly pressure = input<boolean | undefined, unknown>(undefined, { transform: optionalBoolean });
  readonly smoothing = input<number>();
  readonly minStrokes = input<number>();
  readonly minStrokeLength = input<number>();
  readonly historyLimit = input<number>();
  readonly actions = input<string>();
  readonly actionsPosition = input<ActionsPosition>();
  readonly labels = input<Partial<Labels>>();
  readonly penColors = input<readonly string[]>();
  readonly styles = input<Styles>();

  /** `{ canUndo, canRedo, empty }` whenever any of them changes. */
  @Output() readonly historyChange = new EventEmitter<HistoryState>();
  /** A stroke became long enough to be kept (not a tap). */
  @Output() readonly strokeStart = new EventEmitter<DsfStrokeEvent>();
  /** A stroke was kept. */
  @Output() readonly strokeEnd = new EventEmitter<DsfStrokeEvent>();

  private readonly field = viewChild.required<ElementRef<DigitalSignatureFieldElement>>('field');
  /** True once the element is defined, in the browser. Nothing touches the element before. */
  private readonly ready = signal(false);
  /** Disabled state set through CVA mode (`dsfCva`), which cannot write to the `disabled` input. */
  private readonly cvaDisabled = signal(false);
  /** Listeners for values the user produced (not programmatic writes); used by CVA mode. */
  private readonly userInput = new Set<(value: DsfSignatureValue) => void>();

  private readonly settings = computed<Settings>(() => ({
    valueFormat: this.valueFormat(),
    background: this.background(),
    penColor: this.penColor(),
    penWidth: this.penWidth(),
    pressure: this.pressure(),
    smoothing: this.smoothing(),
    minStrokes: this.minStrokes(),
    minStrokeLength: this.minStrokeLength(),
    historyLimit: this.historyLimit(),
    actions: this.actions(),
    actionsPosition: this.actionsPosition(),
    labels: this.labels(),
    penColors: this.penColors(),
    styles: this.styles(),
  }));

  constructor() {
    afterNextRender(() => {
      if (customElements.get('digital-signature-field')) this.ready.set(true);
      else void import('@digital-signature-field/element').then(() => this.ready.set(true));
    });

    // Settings first, so a value is loaded with the configured format and pen.
    effect(() => {
      const el = this.element();
      if (!el) return;
      const settings = this.settings();
      for (const key of Object.keys(settings) as Array<keyof Settings>) {
        const value = settings[key];
        if (value !== undefined) (el as unknown as Record<string, unknown>)[key] = value;
      }
    });

    effect(() => {
      const el = this.element();
      if (!el) return;
      el.disabled = this.disabled() || this.cvaDisabled();
      el.readOnly = this.readonly();
      el.required = this.required();
      if (this.name()) el.name = this.name();
      else el.removeAttribute('name');
    });

    // Push value writes down to the element. The element ignores a write of the value it already
    // has, so the round-trip of a value it just emitted keeps the drawing and its history. Loading a
    // value never fires the element's `change`, so it never reaches the form as a user edit.
    effect(() => {
      const value = this.value();
      const el = this.element();
      if (el) el.value = value;
    });
  }

  /** Steps back one history entry (a stroke or a clear). */
  undo(): void {
    this.upgraded().undo();
  }

  /** Re-applies the last undone history entry. */
  redo(): void {
    this.upgraded().redo();
  }

  /** Removes all ink, base layer included, as one undoable entry. */
  clear(): void {
    this.upgraded().clear();
  }

  /** The signature as an SVG data URL, whatever `valueFormat` is. */
  toSVG(): string {
    return this.upgraded().toSVG();
  }

  /** The signature as a PNG data URL, `scale` times the drawing-area size (default 1). */
  toPNG(options?: { scale?: number }): Promise<string> {
    return this.upgraded().toPNG(options);
  }

  /** Lossless signature data, or `null` while the field is empty. */
  toJSON(): SignatureData | null {
    return this.upgraded().toJSON();
  }

  /** Focuses the drawing area. */
  focus(): void {
    this.upgraded().focus();
  }

  protected onElementChange(event: Event): void {
    // Only the element's own `change` (a CustomEvent with `detail.value`) carries the value.
    if (!(event instanceof CustomEvent) || event.target !== this.field().nativeElement) return;
    const value = (event.detail as { value: DsfSignatureValue }).value;
    this.value.set(value);
    for (const listener of this.userInput) listener(value);
  }

  protected onHistoryChange(event: Event): void {
    this.historyChange.emit({ ...(event as CustomEvent<HistoryState>).detail });
  }

  protected onStrokeStart(event: Event): void {
    this.strokeStart.emit({ ...(event as CustomEvent<DsfStrokeEvent>).detail });
  }

  protected onStrokeEnd(event: Event): void {
    this.strokeEnd.emit({ ...(event as CustomEvent<DsfStrokeEvent>).detail });
    if (!this.touched()) this.touch.emit();
  }

  /** The element, once it is defined; `null` on the server and before the first browser render. */
  private element(): DigitalSignatureFieldElement | null {
    return this.ready() ? this.field().nativeElement : null;
  }

  private upgraded(): DigitalSignatureFieldElement {
    const el = this.element();
    if (!el) {
      throw new Error(
        '<dsf-signature>: the element is not available yet. It loads in the browser after the first render (never on the server).',
      );
    }
    return el;
  }

  /** @internal Used by `dsfCva`. */
  ɵsetCvaDisabled(disabled: boolean): void {
    this.cvaDisabled.set(disabled);
  }

  /** @internal Used by `dsfCva`: subscribe to values the user produced. Returns an unsubscribe. */
  ɵonUserInput(listener: (value: DsfSignatureValue) => void): () => void {
    this.userInput.add(listener);
    return () => this.userInput.delete(listener);
  }
}
