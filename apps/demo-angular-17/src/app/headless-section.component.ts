import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DsfSignature, type DsfSignatureValue } from '@digital-signature-field/angular';
import type { HistoryState } from '@digital-signature-field/element';
import { ValueView } from './value-view.component';

/** Variant 4: `actions="none"`, the app's own toolbar driven by `(historyChange)`. */
@Component({
  selector: 'app-headless-section',
  standalone: true,
  imports: [DsfSignature, ValueView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section data-testid="headless">
      <h2>Headless with the app's own toolbar</h2>
      <p>
        <code>actions="none"</code> hides the built-in bar. The buttons below call <code>undo()</code>,
        <code>redo()</code> and <code>clear()</code> on the component, and <code>(historyChange)</code> enables them.
      </p>
      <dsf-signature #sig actions="none" [(value)]="value" (historyChange)="history.set($event)" />
      <div class="toolbar" role="toolbar" aria-label="Signature">
        <button type="button" (click)="sig.undo()" [disabled]="!history().canUndo">Undo</button>
        <button type="button" (click)="sig.redo()" [disabled]="!history().canRedo">Redo</button>
        <button type="button" (click)="sig.clear()" [disabled]="history().empty">Start over</button>
      </div>
      <app-value-view [value]="value()" />
    </section>
  `,
})
export class HeadlessSection {
  protected readonly history = signal<HistoryState>({ canUndo: false, canRedo: false, empty: true });
  protected readonly value = signal<DsfSignatureValue>(null);
}
