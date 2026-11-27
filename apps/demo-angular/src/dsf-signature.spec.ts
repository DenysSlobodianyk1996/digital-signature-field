// Seam 2, without forms: <dsf-signature> passes its inputs to the element, re-exposes the element's
// events as outputs and its methods on the component, and supports [(value)] with no forms module.
import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DsfSignature, type DsfSignatureValue } from '@digital-signature-field/angular';
import type { HistoryState, Labels, SignatureData } from '@digital-signature-field/element';
import { SVG_DATA_URL, draw, focusAndLeave, settle, signatureField } from './testing/draw';

@Component({
  imports: [DsfSignature],
  template: `<dsf-signature
    style="width: 400px"
    [(value)]="value"
    (historyChange)="events.push(['historyChange', $event])"
    (strokeStart)="events.push(['strokeStart', $event])"
    (strokeEnd)="events.push(['strokeEnd', $event])"
    (touch)="events.push(['touch', null])"
  />`,
})
class TwoWayHost {
  readonly value = signal<DsfSignatureValue>(null);
  readonly events: Array<[string, unknown]> = [];
  readonly signature = viewChild.required(DsfSignature);
}

@Component({
  imports: [DsfSignature],
  template: `<dsf-signature
    name="signature"
    required
    readonly
    valueFormat="json"
    background="transparent"
    penColor="#1a3fbf"
    [penWidth]="4"
    pressure
    [smoothing]="0"
    [minStrokes]="2"
    [minStrokeLength]="3"
    [historyLimit]="5"
    actions="undo redo clear color"
    actionsPosition="top"
    [labels]="labels"
    [penColors]="penColors"
    styles=":host { --dsf-height: 120px; }"
  />`,
})
class InputsHost {
  readonly labels: Partial<Labels> = { undo: 'Rückgängig' };
  readonly penColors = ['#1a3fbf', '#c00'];
}

async function render<T>(host: new () => T) {
  const fixture = TestBed.createComponent(host);
  await settle(fixture);
  return { fixture, host: fixture.componentInstance, field: signatureField(fixture.nativeElement as Element) };
}

describe('<dsf-signature> inputs', () => {
  it('passes every element setting to the element under the same name', async () => {
    const { field } = await render(InputsHost);
    expect(field.name).toBe('signature');
    expect(field.required).toBe(true);
    expect(field.readOnly).toBe(true);
    expect(field.valueFormat).toBe('json');
    expect(field.background).toBe('transparent');
    expect(field.penColor).toBe('#1a3fbf');
    expect(field.penWidth).toBe(4);
    expect(field.pressure).toBe(true);
    expect(field.smoothing).toBe(0);
    expect(field.minStrokes).toBe(2);
    expect(field.minStrokeLength).toBe(3);
    expect(field.historyLimit).toBe(5);
    expect(field.actions).toBe('undo redo clear color');
    expect(field.actionsPosition).toBe('top');
    expect(field.labels.undo).toBe('Rückgängig');
    expect(field.penColors).toEqual(['#1a3fbf', '#c00']);
    expect(field.styles).toBe(':host { --dsf-height: 120px; }');
  });

  it('leaves the element defaults alone for settings that are not bound', async () => {
    const { field } = await render(TwoWayHost);
    expect(field.valueFormat).toBe('svg');
    expect(field.penColor).toBe('#000');
    expect(field.actions).toBe('undo clear');
    expect(field.disabled).toBe(false);
    expect(field.readOnly).toBe(false);
  });
});

describe('<dsf-signature> [(value)] without forms', () => {
  it('writes drawn values to the bound signal and loads values set on it', async () => {
    const { fixture, host, field } = await render(TwoWayHost);
    draw(field);
    await fixture.whenStable();
    const drawn = host.value();
    expect(drawn).toMatch(SVG_DATA_URL);

    host.value.set(null);
    await settle(fixture);
    expect(field.value).toBeNull();

    host.value.set(drawn);
    await settle(fixture);
    expect(field.value).toBe(drawn);
    expect(field.canUndo).toBe(false); // loaded, not drawn
  });
});

describe('<dsf-signature> outputs', () => {
  it('re-exposes history changes and stroke start/end, and touches when the first stroke ends', async () => {
    const { fixture, host, field } = await render(TwoWayHost);
    draw(field);
    await fixture.whenStable();
    expect(host.events).toEqual([
      ['strokeStart', { strokeCount: 1 }],
      ['historyChange', { canUndo: true, canRedo: false, empty: false } satisfies HistoryState],
      ['strokeEnd', { strokeCount: 1 }],
      ['touch', null],
    ]);
  });

  it('touches when focus leaves the field', async () => {
    const { fixture, host, field } = await render(TwoWayHost);
    focusAndLeave(field);
    await fixture.whenStable();
    expect(host.events).toEqual([['touch', null]]);
  });
});

describe('<dsf-signature> methods', () => {
  it('undoes, redoes and clears, updating the value', async () => {
    const { fixture, host, field } = await render(TwoWayHost);
    const signature = host.signature();
    draw(field);
    await fixture.whenStable();
    const drawn = host.value();

    signature.undo();
    await fixture.whenStable();
    expect(host.value()).toBeNull();
    signature.redo();
    await fixture.whenStable();
    expect(host.value()).toBe(drawn);
    signature.clear();
    await fixture.whenStable();
    expect(host.value()).toBeNull();
  });

  it('exports SVG, PNG and signature data whatever the value format', async () => {
    const { fixture, host, field } = await render(TwoWayHost);
    const signature = host.signature();
    expect(signature.toJSON()).toBeNull();
    draw(field);
    await fixture.whenStable();
    expect(signature.toSVG()).toMatch(SVG_DATA_URL);
    expect(await signature.toPNG({ scale: 2 })).toMatch(/^data:image\/png;base64,/);
    const data = signature.toJSON() as SignatureData;
    expect(data.version).toBe(1);
    expect(data.strokes).toHaveLength(1);
  });
});
