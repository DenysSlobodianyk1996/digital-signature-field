import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, form, required } from '@angular/forms/signals';
import { DsfSignature, type DsfSignatureValue } from '@digital-signature-field/angular';
import { DialogSection } from './dialog-section';
import { HeadlessSection } from './headless-section';
import { ValueView } from './value-view';

/** Extra sheet adopted into the field's shadow root through the `styles` input. */
const FIELD_STYLES = `
  [part~="guide"] { border-top-style: solid; }
  [part~="action"] { text-transform: uppercase; letter-spacing: 0.04em; }
`;

/**
 * Latest-Angular demo, one section per recipe in docs/variants/. The Default section binds the same
 * `<dsf-signature>` with signal forms and with reactive forms, no extra directive.
 */
@Component({
  selector: 'app-root',
  imports: [DsfSignature, FormField, ReactiveFormsModule, ValueView, HeadlessSection, DialogSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>digital-signature-field · Angular</h1>

    <section data-testid="default">
      <h2>Default</h2>
      <p>The default layout, actions bar below the drawing area, bound to a required form control two ways.</p>
      <div class="side-by-side">
        <div data-testid="signal-forms">
          <h3>Signal forms <code>[formField]</code></h3>
          <dsf-signature [formField]="signatureForm.signature" />
          <p>
            Status: <span data-testid="status">{{ signatureForm.signature().valid() ? 'valid' : 'invalid' }}</span>
          </p>
          <app-value-view [value]="signatureForm.signature().value()" />
        </div>

        <div data-testid="reactive-forms">
          <h3>Reactive forms <code>formControlName</code></h3>
          <form [formGroup]="group">
            <dsf-signature formControlName="signature" />
          </form>
          <p>Status: <span data-testid="status">{{ reactiveStatus() }}</span></p>
          <app-value-view [value]="reactiveValue()" />
        </div>
      </div>
    </section>

    <app-headless-section />

    <section data-testid="custom-styles">
      <h2>Custom styles</h2>
      <p>
        Custom properties and <code>::part()</code> in the app's stylesheet (<code>.fancy-signature</code>), plus an
        extra sheet through the <code>styles</code> input.
      </p>
      <dsf-signature class="fancy-signature" [styles]="fieldStyles" [(value)]="styledValue" />
      <app-value-view [value]="styledValue()" />
    </section>

    <app-dialog-section />

    <section data-testid="pen-options">
      <h2>Actions bar above, with pen options</h2>
      <p>
        <code>actions="color width undo redo clear"</code>, <code>actionsPosition="top"</code>,
        <code>[penColors]</code> and <code>pressure</code>.
      </p>
      <dsf-signature
        actions="color width undo redo clear"
        actionsPosition="top"
        [penColors]="penColors"
        pressure
        [(value)]="penOptionsValue"
      />
      <app-value-view [value]="penOptionsValue()" />
    </section>

    <section data-testid="side-rail">
      <h2>Side rail, right to left</h2>
      <p>
        <code>actionsPosition="end"</code> with <code>dir="rtl"</code>: the rail moves to the left. Labels are
        translated through <code>[labels]</code>.
      </p>
      <dsf-signature
        dir="rtl"
        actions="undo redo clear"
        actionsPosition="end"
        [labels]="hebrewLabels"
        [(value)]="sideRailValue"
      />
      <app-value-view [value]="sideRailValue()" />
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

  protected readonly fieldStyles = FIELD_STYLES;
  protected readonly penColors = ['#000', '#1a3fbf', '#b91c1c'];
  protected readonly hebrewLabels = { undo: 'בטל', redo: 'בצע שוב', clear: 'נקה' };
  protected readonly styledValue = signal<DsfSignatureValue>(null);
  protected readonly penOptionsValue = signal<DsfSignatureValue>(null);
  protected readonly sideRailValue = signal<DsfSignatureValue>(null);

  constructor() {
    this.group.controls.signature.events.subscribe(() => {
      const control = this.group.controls.signature;
      this.reactiveValue.set(control.value);
      this.reactiveStatus.set(control.valid ? 'valid' : 'invalid');
    });
  }
}
