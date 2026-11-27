// Seam 2: the Angular wrapper (built with Angular 17.2) inside real latest-Angular forms, with no
// extra directive on <dsf-signature> (also the permanent ADR-0003 spike check). Each forms flavour
// runs the same checks: value, validity, touched, dirty and disabled.
import { Component, type Type, signal, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, FormsModule, NgModel, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, disabled, form, readonly, required } from '@angular/forms/signals';
import { DsfSignature } from '@digital-signature-field/angular';
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
  /** Forgets earlier edits, as after saving: pristine and untouched. */
  markPristine(): void;
  setDisabled(disabled: boolean): void;
}

@Component({
  imports: [DsfSignature, FormField],
  template: `<dsf-signature style="width: 400px" [formField]="signatureForm.signature" />`,
})
class SignalFormsHost {
  readonly model = signal<{ signature: string | null }>({ signature: null });
  readonly locked = signal(false);
  readonly readOnly = signal(false);
  readonly signatureForm = form(this.model, (path) => {
    required(path.signature);
    disabled(path.signature, () => this.locked());
    readonly(path.signature, () => this.readOnly());
  });

  probe(): ControlProbe {
    const state = () => this.signatureForm.signature();
    return {
      value: () => state().value(),
      valid: () => state().valid(),
      dirty: () => state().dirty(),
      touched: () => state().touched(),
      load: (value) => this.model.set({ signature: value }),
      markPristine: () => state().reset(),
      setDisabled: (value) => this.locked.set(value),
    };
  }
}

@Component({
  imports: [DsfSignature, ReactiveFormsModule],
  template: `<form [formGroup]="group"><dsf-signature style="width: 400px" formControlName="signature" /></form>`,
})
class ReactiveFormsHost {
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
  imports: [DsfSignature, FormsModule],
  template: `<dsf-signature style="width: 400px" name="signature" required [disabled]="locked()" [(ngModel)]="signature" />`,
})
class TemplateFormsHost {
  readonly signature = signal<string | null>(null);
  readonly locked = signal(false);
  readonly ngModel = viewChild.required(NgModel);

  probe(): ControlProbe {
    const control = () => this.ngModel().control;
    return {
      value: () => control().value,
      valid: () => control().valid,
      dirty: () => control().dirty,
      touched: () => control().touched,
      load: (value) => this.signature.set(value),
      markPristine: () => control().markAsPristine(),
      setDisabled: (value) => this.locked.set(value),
    };
  }
}

interface Host {
  probe(): ControlProbe;
}

async function render(host: Type<Host>) {
  const fixture = TestBed.createComponent(host);
  await settle(fixture);
  const field = signatureField(fixture.nativeElement as Element);
  return { fixture, field, control: fixture.componentInstance.probe() };
}

describe.each([
  ['signal forms ([formField])', SignalFormsHost],
  ['reactive forms (formControlName)', ReactiveFormsHost],
  ['template-driven forms (ngModel)', TemplateFormsHost],
] as const)('<dsf-signature> with %s', (_, host) => {
  let fixture: ComponentFixture<Host>;
  let field: DigitalSignatureFieldElement;
  let control: ControlProbe;

  beforeEach(async () => {
    ({ fixture, field, control } = await render(host));
  });

  it('is invalid (required) while empty, then drawing sets an SVG value and makes it valid, dirty and touched', async () => {
    expect(control.value()).toBeNull();
    expect(control.valid()).toBe(false);
    expect(control.dirty()).toBe(false);
    expect(control.touched()).toBe(false);

    draw(field);
    await fixture.whenStable();

    expect(control.value()).toMatch(SVG_DATA_URL);
    expect(field.value).toBe(control.value());
    expect(control.valid()).toBe(true);
    expect(control.dirty()).toBe(true);
    expect(control.touched()).toBe(true);
  });

  it('loads a value written by the form into the field without marking the control dirty', async () => {
    draw(field);
    await fixture.whenStable();
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
    await fixture.whenStable();
    expect(control.touched()).toBe(true);
    expect(control.dirty()).toBe(false);
  });

  it('disables drawing and the actions while the control is disabled', async () => {
    control.setDisabled(true);
    await settle(fixture);
    expect(field.disabled).toBe(true);
    draw(field);
    await fixture.whenStable();
    expect(field.value).toBeNull();
    expect(control.value()).toBeNull();

    control.setDisabled(false);
    await settle(fixture);
    expect(field.disabled).toBe(false);
    draw(field);
    await fixture.whenStable();
    expect(control.value()).toMatch(SVG_DATA_URL);
  });
});

describe('<dsf-signature> with signal forms: readonly', () => {
  it('makes the field readonly while the field state is readonly', async () => {
    const fixture = TestBed.createComponent(SignalFormsHost);
    await settle(fixture);
    const field = signatureField(fixture.nativeElement as Element);
    fixture.componentInstance.readOnly.set(true);
    await settle(fixture);
    expect(field.readOnly).toBe(true);
    draw(field);
    await fixture.whenStable();
    expect(fixture.componentInstance.model().signature).toBeNull();
  });
});
