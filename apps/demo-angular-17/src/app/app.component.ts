import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DsfSignature, DsfSignatureCva } from '@digital-signature-field/angular';

/** Angular 17 demo: `<dsf-signature>` in a reactive form through CVA mode (`dsfCva`). */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DsfSignature, DsfSignatureCva, ReactiveFormsModule],
  template: `
    <h1>digital-signature-field · Angular 17</h1>

    <section data-testid="reactive-forms">
      <h2>Reactive forms in CVA mode <code>dsfCva formControlName</code></h2>
      <form [formGroup]="group">
        <dsf-signature dsfCva formControlName="signature" />
      </form>
      <p>Status: <span data-testid="status">{{ group.controls.signature.valid ? 'valid' : 'invalid' }}</span></p>
      <output data-testid="value">{{ group.controls.signature.value ?? 'null' }}</output>
    </section>
  `,
})
export class AppComponent {
  readonly group = new FormGroup({ signature: new FormControl<string | null>(null, Validators.required) });
}
