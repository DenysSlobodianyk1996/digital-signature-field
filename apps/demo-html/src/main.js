// Plain ES module, no bundler. The build copies the element's package build next to this file;
// a real page would load it from npm or a CDN instead (see README.md).
import './element/index.js'; // registers <digital-signature-field>

/** Shows a value in a section's value view: the `<img>` preview (values are data URLs) and the raw text. */
function showValue(view, value) {
  const img = view.querySelector('img');
  if (img) {
    img.hidden = !value;
    if (value) img.src = value;
    else img.removeAttribute('src');
  }
  view.querySelector('output').textContent = value ?? 'null';
}

/** Mirrors the field's `change` events into the value view that follows it in its section. */
function followValue(field) {
  const view = field.closest('section').querySelector('[data-value-view]');
  field.addEventListener('change', (e) => showValue(view, e.detail.value));
}

// Default: the README's Vanilla JS recipe.
{
  const form = document.querySelector('#consent');
  const sig = form.querySelector('digital-signature-field');
  const preview = document.querySelector('#consent-preview');
  const submitted = document.querySelector('#consent-submitted');
  const raw = form.closest('section').querySelector('.value output');

  sig.labels = { clear: 'Start over' };
  sig.addEventListener('change', (e) => {
    preview.hidden = !e.detail.value;
    if (e.detail.value) preview.src = e.detail.value;
    raw.textContent = e.detail.value ?? 'null';
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return; // `required` blocks the submit while the field is empty
    submitted.textContent = String(new FormData(form).get('signature')); // "data:image/svg+xml;base64,…"
    submitted.hidden = false;
  });
}

// Headless: the page's own toolbar.
{
  const sig = document.querySelector('#headless-field');
  const undo = document.querySelector('#headless-undo');
  const redo = document.querySelector('#headless-redo');
  const clear = document.querySelector('#headless-clear');

  undo.addEventListener('click', () => sig.undo());
  redo.addEventListener('click', () => sig.redo());
  clear.addEventListener('click', () => sig.clear());
  sig.addEventListener('dsf-history-change', (e) => {
    undo.disabled = !e.detail.canUndo;
    redo.disabled = !e.detail.canRedo;
    clear.disabled = e.detail.empty;
  });
  followValue(sig);
}

// Custom styles: an extra sheet adopted into the field's shadow root through the `styles` property.
{
  const sig = document.querySelector('#styled-field');
  sig.styles = `
    [part~="guide"] { border-top-style: solid; }
    [part~="action"] { text-transform: uppercase; letter-spacing: 0.04em; }
  `;
  followValue(sig);
}

// Preview + dialog: the form keeps the saved value; the dialog's field edits a copy.
{
  const section = document.querySelector('[data-testid="dialog"]');
  const view = section.querySelector('[data-value-view]');
  const openButton = document.querySelector('#dialog-open');
  const dialog = document.querySelector('#dialog');
  const sig = document.querySelector('#dialog-field');
  let signature = null;

  openButton.addEventListener('click', () => {
    sig.value = signature; // loads the saved value with a fresh history
    dialog.showModal();
  });
  document.querySelector('#dialog-cancel').addEventListener('click', () => dialog.close());
  document.querySelector('#dialog-save').addEventListener('click', () => {
    signature = sig.value;
    showValue(view, signature);
    openButton.textContent = signature ? 'Change signature' : 'Add signature';
    dialog.close();
  });
}

// Actions bar above, with pen options: `penColors` has no attribute, so it is set as a property.
{
  const sig = document.querySelector('#pen-options-field');
  sig.penColors = ['#000', '#1a3fbf', '#b91c1c'];
  followValue(sig);
}

// Side rail, right to left, with translated labels.
{
  const sig = document.querySelector('#side-rail-field');
  sig.labels = { undo: 'בטל', redo: 'בצע שוב', clear: 'נקה' };
  followValue(sig);
}
