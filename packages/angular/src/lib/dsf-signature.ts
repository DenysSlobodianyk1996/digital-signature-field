import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  type ElementRef,
  EventEmitter,
  Output,
  computed,
  effect,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import '@digital-signature-field/element';
import type { DigitalSignatureFieldElement, SignatureData } from '@digital-signature-field/element';

/** The field's value: a data URL or `SignatureData` (per `value-format`), or `null` while empty. */
export type DsfSignatureValue = string | SignatureData | null;

/**
 * `<dsf-signature>`: renders `<digital-signature-field>` and carries its value.
 *
 * Its form contract has the `FormValueControl` shape (ADR-0003), matched by structure and never
 * imported: `value` is a `model()`, `disabled` an input, `touch` an output. Angular 22+ binds it with
 * `[formField]`, `formControlName` or `ngModel`; Angular 17–21 needs the opt-in `dsfCva` directive.
 *
 * Built with Angular 17.2, so it uses `@Output()` (the `output()` function arrived in 17.3).
 */
@Component({
  selector: 'dsf-signature',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<digital-signature-field
    #field
    [attr.disabled]="isDisabled() ? '' : null"
    (change)="onElementChange($event)"
    (focusout)="touch.emit()"
  ></digital-signature-field>`,
  styles: [':host { display: block; }'],
})
export class DsfSignature {
  /** The signature (an SVG data URL by default), or `null` while the field is empty. Two-way: `[(value)]`. */
  readonly value = model<DsfSignatureValue>(null);
  /** Disables drawing. */
  readonly disabled = input(false);
  /** Fires when the user has interacted with the field: a stroke ended or focus left it. */
  @Output() readonly touch = new EventEmitter<void>();

  private readonly field = viewChild<ElementRef<DigitalSignatureFieldElement>>('field');
  /** Disabled state set through CVA mode (`dsfCva`), which cannot write to the `disabled` input. */
  readonly #cvaDisabled = signal(false);
  /** Listeners for values the user produced (not programmatic writes); used by CVA mode. */
  readonly #userInput = new Set<(value: DsfSignatureValue) => void>();

  protected readonly isDisabled = computed(() => this.disabled() || this.#cvaDisabled());

  constructor() {
    // Push value writes down to the element. The element ignores a write of the value it already
    // has, so the round-trip of a value it just emitted keeps the drawing and its history.
    effect(() => {
      const value = this.value();
      const el = this.field()?.nativeElement;
      if (el) el.value = value;
    });
  }

  protected onElementChange(event: Event): void {
    // Only the element's own `change` (a CustomEvent with `detail.value`) carries the value.
    if (!(event instanceof CustomEvent) || event.target !== this.field()?.nativeElement) return;
    const value = (event.detail as { value: DsfSignatureValue }).value;
    this.value.set(value);
    for (const listener of this.#userInput) listener(value);
    this.touch.emit();
  }

  /** @internal Used by `dsfCva`. */
  ɵsetCvaDisabled(disabled: boolean): void {
    this.#cvaDisabled.set(disabled);
  }

  /** @internal Used by `dsfCva`: subscribe to values the user produced. Returns an unsubscribe. */
  ɵonUserInput(listener: (value: DsfSignatureValue) => void): () => void {
    this.#userInput.add(listener);
    return () => this.#userInput.delete(listener);
  }
}
