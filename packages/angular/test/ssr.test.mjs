// Server-side rendering check for the built package (`dist`), in plain Node: no DOM globals, no
// `customElements`. The wrapper must render `<dsf-signature>` without touching the element.
// Runs against Angular 17.2, the oldest supported version, in JIT mode.
import 'zone.js/node';
import '@angular/compiler';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { DsfSignature } from '../dist/fesm2022/digital-signature-field-angular.mjs';

class Host {
  value = 'data:image/svg+xml;base64,PHN2Zy8+';
}
Component({
  selector: 'app-root',
  standalone: true,
  imports: [DsfSignature],
  template: `<dsf-signature [(value)]="value" penColor="#1a3fbf" [penWidth]="3" actions="undo redo clear" [disabled]="true" />`,
})(Host);

test('renders <dsf-signature> on the server without touching the element', async () => {
  assert.equal(typeof globalThis.customElements, 'undefined');
  const html = await renderApplication(() => bootstrapApplication(Host, { providers: [provideServerRendering()] }), {
    document: '<!doctype html><html><head></head><body><app-root></app-root></body></html>',
    url: '/',
  });
  assert.match(html, /<dsf-signature[^>]*><digital-signature-field[^>]*><\/digital-signature-field><\/dsf-signature>/);
});
