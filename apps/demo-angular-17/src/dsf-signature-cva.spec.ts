// Seam 2: the wrapper in CVA mode (`dsfCva`) inside real Angular 17 reactive forms.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DsfSignature, DsfSignatureCva } from '@digital-signature-field/angular';
import { SVG_DATA_URL, draw, signatureField } from './testing/draw';

@Component({
  standalone: true,
  imports: [DsfSignature, DsfSignatureCva, ReactiveFormsModule],
  template: `<form [formGroup]="group"><dsf-signature style="width: 400px" dsfCva formControlName="signature" /></form>`,
})
class CvaHost {
  readonly group = new FormGroup({ signature: new FormControl<string | null>(null, Validators.required) });
}

async function render() {
  const fixture = TestBed.createComponent(CvaHost);
  fixture.autoDetectChanges(true);
  await fixture.whenStable();
  const field = signatureField(fixture.nativeElement as Element);
  return { fixture, field, control: fixture.componentInstance.group.controls.signature };
}

describe('<dsf-signature dsfCva> with reactive forms (Angular 17)', () => {
  it('is invalid (required) while empty, then drawing sets an SVG value and makes it valid, dirty and touched', async () => {
    const { fixture, field, control } = await render();
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

  it('loads values the form writes into the field without marking the control dirty', async () => {
    const { fixture, field, control } = await render();
    draw(field);
    await fixture.whenStable();
    const saved = control.value;

    control.reset();
    fixture.detectChanges(); // the test body runs outside the Angular zone
    expect(field.value).toBeNull();

    control.setValue(saved);
    fixture.detectChanges();
    expect(field.value).toBe(saved);
    expect(control.dirty).toBe(false);
  });

  it('reflects a disabled control on the element', async () => {
    const { fixture, field, control } = await render();
    control.disable();
    fixture.detectChanges(); // the test body runs outside the Angular zone
    expect(field.hasAttribute('disabled')).toBe(true);
  });
});
