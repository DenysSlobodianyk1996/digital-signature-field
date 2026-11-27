// Seam 2: the wrapper in CVA mode (`dsfCva`) inside real Angular 17 reactive and template-driven
// forms. Each flavour runs the same checks: value, validity, touched, dirty and disabled.
import { Component, ViewChild, type Type } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, FormsModule, NgModel, ReactiveFormsModule, Validators } from '@angular/forms';
import { DsfSignature, DsfSignatureCva } from '@digital-signature-field/angular';
import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';
import { SVG_DATA_URL, draw, focusAndLeave, settle, signatureField } from './testing/draw';

/** What the checks need from a form control, whatever the forms flavour. */
interface ControlProbe {
  value(): unknown;
  valid(): boolean;
  dirty(): boolean;
  touched(): boolean;
  /** Writes a value from the form side (initial data, a reset, a patch). */
  load(value: string | null): void;
  /** Forgets earlier edits, as after saving. */
  markPristine(): void;
  setDisabled(disabled: boolean): void;
}

interface Host {
  probe(): ControlProbe;
}

@Component({
  standalone: true,
  imports: [DsfSignature, DsfSignatureCva, ReactiveFormsModule],
  template: `<form [formGroup]="group"><dsf-signature style="width: 400px" dsfCva formControlName="signature" /></form>`,
})
class ReactiveHost implements Host {
  readonly group = new FormGroup({ signature: new FormControl<string | null>(null, Validators.required) });

  probe(): ControlProbe {
    const control = this.group.controls.signature;
    return {
      value: () => control.value,
      valid: () => control.valid,
      dirty: () => control.dirty,
      touched: () => control.touched,
      load: (value) => control.setValue(value),
      markPristine: () => control.markAsPristine(),
      setDisabled: (value) => (value ? control.disable() : control.enable()),
    };
  }
}

@Component({
  standalone: true,
  imports: [DsfSignature, DsfSignatureCva, FormsModule],
  template: `<dsf-signature
    style="width: 400px"
    dsfCva
    name="signature"
    required
    [disabled]="locked"
    [(ngModel)]="signature"
  />`,
})
class TemplateHost implements Host {
  signature: string | null = null;
  locked = false;
  @ViewChild(NgModel, { static: true }) ngModel!: NgModel;

  probe(): ControlProbe {
    const control = () => this.ngModel.control;
    return {
      value: () => control().value,
      valid: () => control().valid,
      dirty: () => control().dirty,
      touched: () => control().touched,
      load: (value) => (this.signature = value),
      markPristine: () => control().markAsPristine(),
      setDisabled: (value) => (this.locked = value),
    };
  }
}

const flavours: Array<[string, Type<Host>]> = [
  ['reactive forms (formControlName)', ReactiveHost],
  ['template-driven forms (ngModel)', TemplateHost],
];

for (const [flavour, host] of flavours) describe(`<dsf-signature dsfCva> with ${flavour} (Angular 17)`, () => {
  let fixture: ComponentFixture<Host>;
  let field: DigitalSignatureFieldElement;
  let control: ControlProbe;

  beforeEach(async () => {
    fixture = TestBed.createComponent(host);
    fixture.autoDetectChanges(true);
    await settle(fixture);
    field = signatureField(fixture.nativeElement as Element);
    control = fixture.componentInstance.probe();
  });

  it('is invalid (required) while empty, then drawing sets an SVG value and makes it valid, dirty and touched', async () => {
    expect(control.value()).toBeNull();
    expect(control.valid()).toBe(false);
    expect(control.dirty()).toBe(false);
    expect(control.touched()).toBe(false);

    draw(field);
    await settle(fixture);

    expect(control.value()).toMatch(SVG_DATA_URL);
    expect(field.value).toBe(control.value() as string);
    expect(control.valid()).toBe(true);
    expect(control.dirty()).toBe(true);
    expect(control.touched()).toBe(true);
  });

  it('loads a value written by the form into the field without marking the control dirty', async () => {
    draw(field);
    await settle(fixture);
    const saved = field.value as string;
    control.markPristine();

    control.load(null);
    await settle(fixture);
    expect(field.value).toBeNull();

    control.load(saved);
    await settle(fixture);
    expect(field.value).toBe(saved);
    expect(control.value()).toBe(saved);
    expect(control.valid()).toBe(true);
    expect(control.dirty()).toBe(false);
  });

  it('marks the control touched when focus leaves the field', async () => {
    focusAndLeave(field);
    await settle(fixture);
    expect(control.touched()).toBe(true);
    expect(control.dirty()).toBe(false);
  });

  it('disables drawing and the actions while the control is disabled', async () => {
    control.setDisabled(true);
    await settle(fixture);
    expect(field.disabled).toBe(true);
    draw(field);
    await settle(fixture);
    expect(field.value).toBeNull();
    expect(control.value()).toBeNull();

    control.setDisabled(false);
    await settle(fixture);
    expect(field.disabled).toBe(false);
    draw(field);
    await settle(fixture);
    expect(control.value()).toMatch(SVG_DATA_URL);
  });
});
