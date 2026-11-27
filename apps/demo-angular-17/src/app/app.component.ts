import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DsfSignature, DsfSignatureCva, type DsfSignatureValue } from '@digital-signature-field/angular';
import { DialogSection } from './dialog-section.component';
import { HeadlessSection } from './headless-section.component';
import { ValueView } from './value-view.component';

/** Extra sheet adopted into the field's shadow root through the `styles` input. */
const FIELD_STYLES = `
  [part~="guide"] { border-top-style: solid; }
  [part~="action"] { text-transform: uppercase; letter-spacing: 0.04em; }
`;

/**
 * Angular 17 demo, one section per recipe in docs/variants/. The Default section binds
 * `<dsf-signature>` to a reactive form through CVA mode (`dsfCva`).
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DsfSignature, DsfSignatureCva, ReactiveFormsModule, ValueView, HeadlessSection, DialogSection],
  template: `
    <h1>digital-signature-field · Angular 17</h1>

    <section data-testid="default">
      <h2>Default</h2>
      <p>The default layout, actions bar below the drawing area, bound to a required reactive form control.</p>
      <div data-testid="reactive-forms">
        <h3>Reactive forms in CVA mode <code>dsfCva formControlName</code></h3>
        <form [formGroup]="group">
          <dsf-signature dsfCva formControlName="signature" />
        </form>
        <p>Status: <span data-testid="status">{{ group.controls.signature.valid ? 'valid' : 'invalid' }}</span></p>
        <app-value-view [value]="group.controls.signature.value" />
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
export class AppComponent {
  readonly group = new FormGroup({ signature: new FormControl<string | null>(null, Validators.required) });

  protected readonly fieldStyles = FIELD_STYLES;
  protected readonly penColors = ['#000', '#1a3fbf', '#b91c1c'];
  protected readonly hebrewLabels = { undo: 'בטל', redo: 'בצע שוב', clear: 'נקה' };
  protected readonly styledValue = signal<DsfSignatureValue>(null);
  protected readonly penOptionsValue = signal<DsfSignatureValue>(null);
  protected readonly sideRailValue = signal<DsfSignatureValue>(null);
}
