import { ChangeDetectionStrategy, Component, type ElementRef, signal, viewChild } from '@angular/core';
import { DsfSignature, type DsfSignatureValue } from '@digital-signature-field/angular';
import { ValueView } from './value-view';

/**
 * Variant 5, preview + dialog: the form keeps a small preview, and a native `<dialog>` holds the field.
 * The dialog edits a `draft` copy: Save copies it into the form state, Cancel discards it.
 * (With Angular Material, open a `MatDialog` with the value as `data` and close it with the draft.)
 */
@Component({
  selector: 'app-dialog-section',
  imports: [DsfSignature, ValueView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section data-testid="dialog">
      <h2>Preview + dialog</h2>
      <p>
        The form shows the value as an <code>&lt;img&gt;</code>. The dialog edits a copy: <b>Save</b> copies it into
        the form, <b>Cancel</b> discards it.
      </p>
      <app-value-view [value]="signature()" />
      <button type="button" (click)="open()">{{ signature() ? 'Change signature' : 'Add signature' }}</button>

      <dialog #dialog aria-labelledby="ng-dialog-title">
        <h3 id="ng-dialog-title">Sign here</h3>
        <dsf-signature [(value)]="draft" />
        <div class="toolbar">
          <button type="button" (click)="dialog.close()">Cancel</button>
          <button type="button" (click)="save()">Save</button>
        </div>
      </dialog>
    </section>
  `,
})
export class DialogSection {
  protected readonly signature = signal<DsfSignatureValue>(null);
  protected readonly draft = signal<DsfSignatureValue>(null);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected open(): void {
    // `[(value)]` loads the saved value (and a fresh history) into the dialog's field.
    this.draft.set(this.signature());
    this.dialog().nativeElement.showModal();
  }

  protected save(): void {
    this.signature.set(this.draft());
    this.dialog().nativeElement.close();
  }
}
