/**
 * Native form participation through `ElementInternals` (ADR-0001): the form value,
 * constraint validation and the `empty` / `invalid` custom states.
 *
 * The element tells this module what the field holds after every change (`sync`);
 * everything the form and CSS can observe is derived from that here.
 */

/** What the form needs to know about the field after each change. */
export interface FieldState {
  /** The current value, or `null` while the field is empty (no `FormData` entry). */
  value: string | null;
  /** Number of kept strokes. Taps are discarded before they become strokes, so they never count. */
  strokeCount: number;
  required: boolean;
  minStrokes: number;
}

export const DEFAULT_VALIDATION_MESSAGES = {
  valueMissing: 'Please sign in this field.',
  tooShort: (minStrokes: number): string =>
    `Please complete your signature (at least ${minStrokes} strokes).`,
};

/** The constraint the field currently violates, if any. Like native inputs, `tooShort` never applies to an empty field. */
export function validityOf(state: FieldState): { flags: ValidityStateFlags; message: string } {
  if (state.strokeCount === 0) {
    return state.required
      ? { flags: { valueMissing: true }, message: DEFAULT_VALIDATION_MESSAGES.valueMissing }
      : { flags: {}, message: '' };
  }
  if (state.strokeCount < state.minStrokes) {
    return { flags: { tooShort: true }, message: DEFAULT_VALIDATION_MESSAGES.tooShort(state.minStrokes) };
  }
  return { flags: {}, message: '' };
}

/**
 * Owns the host's `ElementInternals`. Custom states:
 * - `empty` while there is no ink;
 * - `invalid` while the field is invalid *and* the user has interacted with it (drawn, undone,
 *   cleared, or moved focus out) or a submit was attempted, like `:user-invalid`. A form reset hides it again.
 */
export class FormField {
  readonly #internals: ElementInternals;
  /** Where the browser anchors its validation bubble. */
  readonly #anchor: HTMLElement;
  /** Whether invalidity may be shown yet: after user interaction or a submit attempt. */
  #interacted = false;

  constructor(host: HTMLElement, anchor: HTMLElement) {
    this.#internals = host.attachInternals();
    this.#anchor = anchor;
    // Fired on the host when form validation fails: a submit attempt or `checkValidity()` / `reportValidity()`.
    host.addEventListener('invalid', () => this.markInteracted());
    host.addEventListener('blur', () => this.markInteracted());
  }

  /** From now on, show `:state(invalid)` whenever the field is invalid. */
  markInteracted(): void {
    this.#interacted = true;
    this.#syncInvalidState();
  }

  /** Back to the pristine state (form reset): invalidity is hidden until the next interaction. */
  resetInteraction(): void {
    this.#interacted = false;
    this.#syncInvalidState();
  }

  #syncInvalidState(): void {
    this.#toggleState('invalid', this.#interacted && !this.#internals.validity.valid);
  }

  #toggleState(state: string, on: boolean): void {
    if (on) this.#internals.states.add(state);
    else this.#internals.states.delete(state);
  }

  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  get validity(): ValidityState {
    return this.#internals.validity;
  }

  get validationMessage(): string {
    return this.#internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.#internals.willValidate;
  }

  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }

  reportValidity(): boolean {
    return this.#internals.reportValidity();
  }

  sync(state: FieldState): void {
    this.#internals.setFormValue(state.value);
    const { flags, message } = validityOf(state);
    if (message) this.#internals.setValidity(flags, message, this.#anchor);
    else this.#internals.setValidity({});
    this.#toggleState('empty', state.value === null);
    this.#syncInvalidState();
  }
}
