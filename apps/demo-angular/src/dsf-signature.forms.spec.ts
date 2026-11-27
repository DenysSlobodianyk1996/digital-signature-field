// Seam 2: the Angular wrapper (built with Angular 17.2) inside real latest-Angular forms.
// This is also the ADR-0003 spike check: no extra directive is used on <dsf-signature>.
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { DsfSignature } from '@digital-signature-field/angular';
import { SVG_DATA_URL, draw, signatureField } from './testing/draw';

@Component({
  imports: [DsfSignature, FormField],
  template: `<dsf-signature style="width: 400px" [formField]="signatureForm.signature" />`,
})
class SignalFormsHost {
  readonly model = signal<{ signature: string | null }>({ signature: null });
  readonly locked = signal(false);
  readonly signatureForm = form(this.model, (path) => {
    required(path.signature);
    disabled(path.signature, () => this.locked());
  });
}

@Component({
  imports: [DsfSignature, ReactiveFormsModule],
  template: `<form [formGroup]="group"><dsf-signature style="width: 400px" formControlName="signature" /></form>`,
})
class ReactiveFormsHost {
  readonly group = new FormGroup({ signature: new FormControl<string | null>(null, Validators.required) });
}

async function render<T>(host: new () => T) {
  const fixture = TestBed.createComponent(host);
  await fixture.whenStable();
  const field = signatureField(fixture.nativeElement as Element);
  return { fixture, field, host: fixture.componentInstance };
}

describe('<dsf-signature> with signal forms ([formField])', () => {
  it('is invalid (required) while empty, then drawing sets an SVG value and makes it valid, dirty and touched', async () => {
    const { fixture, field, host } = await render(SignalFormsHost);
    const state = host.signatureForm.signature();
    expect(state.value()).toBeNull();
    expect(state.valid()).toBe(false);
    expect(state.dirty()).toBe(false);

    draw(field);
    await fixture.whenStable();

    expect(state.value()).toMatch(SVG_DATA_URL);
    expect(host.model().signature).toMatch(SVG_DATA_URL);
    expect(state.valid()).toBe(true);
    expect(state.dirty()).toBe(true);
    expect(state.touched()).toBe(true);
  });

  it('reflects a disabled field on the element', async () => {
    const { fixture, field, host } = await render(SignalFormsHost);
    expect(field.hasAttribute('disabled')).toBe(false);
    host.locked.set(true);
    await fixture.whenStable();
    expect(field.hasAttribute('disabled')).toBe(true);
  });
});

describe('<dsf-signature> with reactive forms (formControlName)', () => {
  it('is invalid (required) while empty, then drawing sets an SVG value and makes it valid, dirty and touched', async () => {
    const { fixture, field, host } = await render(ReactiveFormsHost);
    const control = host.group.controls.signature;
    expect(control.value).toBeNull();
    expect(control.valid).toBe(false);
    expect(control.dirty).toBe(false);

    draw(field);
    await fixture.whenStable();

    expect(control.value).toMatch(SVG_DATA_URL);
    expect(control.valid).toBe(true);
    expect(control.dirty).toBe(true);
    expect(control.touched).toBe(true);
  });

  it('reflects a disabled control on the element', async () => {
    const { fixture, field, host } = await render(ReactiveFormsHost);
    host.group.controls.signature.disable();
    await fixture.whenStable();
    expect(field.hasAttribute('disabled')).toBe(true);
  });
});
