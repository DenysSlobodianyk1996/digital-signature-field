import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { DsfSignatureValue } from '@digital-signature-field/angular';

/** Shows a signature value: the `<img>` preview (values are data URLs) and the raw value, collapsed. */
@Component({
  selector: 'app-value-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src(); as src) {
      <img [src]="src" alt="Signature preview" />
    }
    <details>
      <summary>Raw value</summary>
      <output data-testid="value">{{ raw() }}</output>
    </details>
  `,
  host: { class: 'value' },
})
export class ValueView {
  readonly value = input<DsfSignatureValue>(null);
  protected readonly src = computed(() => {
    const value = this.value();
    return typeof value === 'string' ? value : null;
  });
  protected readonly raw = computed(() => {
    const value = this.value();
    return value === null ? 'null' : typeof value === 'string' ? value : JSON.stringify(value);
  });
}
