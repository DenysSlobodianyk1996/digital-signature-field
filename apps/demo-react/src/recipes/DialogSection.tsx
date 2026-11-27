import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';
import { useRef, useState } from 'react';
import { ValueView } from './ValueView';

/**
 * Variant 5, preview + dialog: the form keeps a small preview, and a native `<dialog>` holds the field.
 * The dialog edits a copy: Save copies the field's value into the form state, Cancel discards it.
 */
export function DialogSection() {
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<DigitalSignatureFieldElement>(null);
  const [signature, setSignature] = useState<string | null>(null);

  function open() {
    // Load the saved value (and a fresh history) into the dialog's field.
    field.current!.value = signature;
    dialog.current!.showModal();
  }

  function save() {
    setSignature(field.current!.value as string | null);
    dialog.current!.close();
  }

  return (
    <section data-testid="dialog">
      <h2>Preview + dialog</h2>
      <p>
        The form shows the value as an <code>&lt;img&gt;</code>. The dialog edits a copy: <b>Save</b> copies it into
        the form, <b>Cancel</b> discards it.
      </p>
      <ValueView value={signature} />
      <button type="button" onClick={open}>
        {signature ? 'Change signature' : 'Add signature'}
      </button>

      <dialog ref={dialog} aria-labelledby="react-dialog-title">
        <h3 id="react-dialog-title">Sign here</h3>
        <digital-signature-field ref={field} />
        <div className="toolbar">
          <button type="button" onClick={() => dialog.current!.close()}>
            Cancel
          </button>
          <button type="button" onClick={save}>
            Save
          </button>
        </div>
      </dialog>
    </section>
  );
}
