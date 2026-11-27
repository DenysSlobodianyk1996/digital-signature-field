import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, form, required } from '@angular/forms/signals';
import { DsfSignature } from '@digital-signature-field/angular';

/** Latest-Angular demo: `<dsf-signature>` bound with signal forms and with reactive forms, no extra directive. */
@Component({
  selector: 'app-root',
  imports: [DsfSignature, FormField, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>digital-signature-field · Angular</h1>

    <section data-testid="signal-forms">
      <h2>Signal forms <code>[formField]</code></h2>
      <dsf-signature [formField]="signatureForm.signature" />
      <p>Status: <span data-testid="status">{{ signatureForm.signature().valid() ? 'valid' : 'invalid' }}</span></p>
      <output data-testid="value">{{ signatureForm.signature().value() ?? 'null' }}</output>
    </section>

    <section data-testid="reactive-forms">
      <h2>Reactive forms <code>formControlName</code></h2>
      <form [formGroup]="group">
        <dsf-signature formControlName="signature" />
      </form>
      <p>Status: <span data-testid="status">{{ reactiveStatus() }}</span></p>
      <output data-testid="value">{{ reactiveValue() ?? 'null' }}</output>
    </section>
  `,
})
export class App {
  readonly model = signal<{ signature: string | null }>({ signature: null });
  readonly signatureForm = form(this.model, (path) => {
    required(path.signature);
  });

  readonly group = new FormGroup({ signature: new FormControl<string | null>(null, Validators.required) });
  // Mirrored into signals so the OnPush, zoneless view updates when the control changes.
  protected readonly reactiveValue = signal<string | null>(null);
  protected readonly reactiveStatus = signal<'valid' | 'invalid'>('invalid');

  constructor() {
    this.group.controls.signature.events.subscribe(() => {
      const control = this.group.controls.signature;
      this.reactiveValue.set(control.value);
      this.reactiveStatus.set(control.valid ? 'valid' : 'invalid');
    });
  }
}
