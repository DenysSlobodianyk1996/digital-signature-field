import { DestroyRef, Directive, forwardRef, inject } from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DsfSignature, type DsfSignatureValue } from './dsf-signature';

/**
 * CVA mode (ADR-0003): `<dsf-signature dsfCva formControlName="…">` for Angular 17–21, which cannot
 * bind forms to a component without a `ControlValueAccessor`. Opt-in; never combine with `[formField]`.
 */
@Directive({
  selector: 'dsf-signature[dsfCva]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DsfSignatureCva), multi: true }],
})
export class DsfSignatureCva implements ControlValueAccessor {
  readonly #signature = inject(DsfSignature, { self: true });
  #onChange: (value: DsfSignatureValue) => void = () => {};
  #onTouched: () => void = () => {};

  constructor() {
    const unsubscribe = this.#signature.ɵonUserInput((value) => this.#onChange(value));
    const touch = this.#signature.touch.subscribe(() => this.#onTouched());
    inject(DestroyRef).onDestroy(() => {
      unsubscribe();
      touch.unsubscribe();
    });
  }

  writeValue(value: DsfSignatureValue | undefined): void {
    this.#signature.value.set(value ?? null);
  }

  registerOnChange(fn: (value: DsfSignatureValue) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.#signature.ɵsetCvaDisabled(disabled);
  }
}
