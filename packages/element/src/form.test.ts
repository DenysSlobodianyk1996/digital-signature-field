import { afterEach, describe, expect, it } from 'vitest';
import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';
import { area, changes, draw, inkStrokes } from './test-utils';

afterEach(() => {
  document.body.replaceChildren();
});

/** A real `<form>` with the field inside it, plus a submit button. */
function mountInForm(attrs: Record<string, string> = {}): { form: HTMLFormElement; el: DigitalSignatureFieldElement } {
  const form = document.createElement('form');
  form.addEventListener('submit', (e) => e.preventDefault());
  const el = document.createElement('digital-signature-field');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.style.width = '400px';
  const submit = document.createElement('button');
  submit.type = 'submit';
  form.append(el, submit);
  document.body.append(form);
  return { form, el };
}

describe('form participation', () => {
  it('puts the current value into FormData under its name', () => {
    const { form, el } = mountInForm({ name: 'signature' });
    draw(el, [[10, 10], [80, 40]]);
    expect(new FormData(form).get('signature')).toBe(el.value);
    expect(el.value).not.toBeNull();
  });

  it('has no FormData entry while the field is empty', () => {
    const { form } = mountInForm({ name: 'signature' });
    expect(new FormData(form).has('signature')).toBe(false);
  });

  it('removes the FormData entry again after clear', () => {
    const { form, el } = mountInForm({ name: 'signature' });
    draw(el, [[10, 10], [80, 40]]);
    el.clear();
    expect(new FormData(form).has('signature')).toBe(false);
  });

  it('tracks undo and redo in FormData', () => {
    const { form, el } = mountInForm({ name: 'signature' });
    draw(el, [[10, 10], [80, 40]]);
    const one = el.value;
    draw(el, [[10, 60], [80, 90]]);
    el.undo();
    expect(new FormData(form).get('signature')).toBe(one);
  });

  it('exposes its form and name', () => {
    const { form, el } = mountInForm({ name: 'signature' });
    expect(el.form).toBe(form);
    expect(el.name).toBe('signature');
    el.name = 'sig';
    expect(el.getAttribute('name')).toBe('sig');
  });
});

/** Counts `submit` events that actually reach the form. */
function submits(form: HTMLFormElement): { count: number } {
  const seen = { count: 0 };
  form.addEventListener('submit', () => seen.count++);
  return seen;
}

describe('validity', () => {
  it('is valid when empty and not required', () => {
    const { form, el } = mountInForm({ name: 'signature' });
    expect(el.validity.valid).toBe(true);
    expect(form.checkValidity()).toBe(true);
  });

  it('is valueMissing while required and empty, with a validation message', () => {
    const { el } = mountInForm({ name: 'signature', required: '' });
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validity.valid).toBe(false);
    expect(el.validationMessage).not.toBe('');
  });

  it('becomes valid once a stroke is drawn, and invalid again after clear', () => {
    const { el } = mountInForm({ required: '' });
    draw(el, [[10, 10], [80, 40]]);
    expect(el.validity.valid).toBe(true);
    expect(el.validationMessage).toBe('');
    el.clear();
    expect(el.validity.valueMissing).toBe(true);
  });

  it('blocks native submission while required and empty', () => {
    const { form, el } = mountInForm({ required: '' });
    const seen = submits(form);
    expect(form.reportValidity()).toBe(false);
    form.requestSubmit();
    expect(seen.count).toBe(0);
    draw(el, [[10, 10], [80, 40]]);
    form.requestSubmit();
    expect(seen.count).toBe(1);
  });

  it('reacts to the required property being toggled', () => {
    const { el } = mountInForm();
    el.required = true;
    expect(el.hasAttribute('required')).toBe(true);
    expect(el.validity.valueMissing).toBe(true);
    el.required = false;
    expect(el.validity.valid).toBe(true);
  });

  it('is tooShort with fewer strokes than min-strokes', () => {
    const { form, el } = mountInForm({ 'min-strokes': '2' });
    const seen = submits(form);
    draw(el, [[10, 10], [80, 40]]);
    expect(el.validity.tooShort).toBe(true);
    expect(el.validationMessage).not.toBe('');
    form.requestSubmit();
    expect(seen.count).toBe(0);
    draw(el, [[10, 60], [80, 90]]);
    expect(el.validity.valid).toBe(true);
    form.requestSubmit();
    expect(seen.count).toBe(1);
  });

  it('does not report tooShort for an empty field that is not required', () => {
    const { el } = mountInForm({ 'min-strokes': '3' });
    expect(el.validity.valid).toBe(true);
  });

  it('defaults min-strokes to 1 and re-validates when it changes', () => {
    const { el } = mountInForm();
    expect(el.minStrokes).toBe(1);
    draw(el, [[10, 10], [80, 40]]);
    el.minStrokes = 2;
    expect(el.getAttribute('min-strokes')).toBe('2');
    expect(el.validity.tooShort).toBe(true);
  });

  it('exposes checkValidity, reportValidity and willValidate', () => {
    const { el } = mountInForm({ required: '' });
    expect(el.willValidate).toBe(true);
    expect(el.checkValidity()).toBe(false);
    expect(el.reportValidity()).toBe(false);
  });
});

describe('taps and validity', () => {
  it('a tap does not satisfy required', () => {
    const { el } = mountInForm({ required: '' });
    draw(el, [[10, 10], [12, 11]]);
    expect(el.validity.valueMissing).toBe(true);
  });

  it('a tap does not count towards min-strokes', () => {
    const { el } = mountInForm({ 'min-strokes': '2' });
    draw(el, [[10, 10], [80, 40]]);
    draw(el, [[10, 60], [12, 61]]);
    expect(el.validity.tooShort).toBe(true);
  });

  it('min-stroke-length is configurable: a longer threshold turns short strokes into taps', () => {
    const { el } = mountInForm({ required: '', 'min-stroke-length': '50' });
    draw(el, [[10, 10], [40, 10]]);
    expect(el.validity.valueMissing).toBe(true);
    draw(el, [[10, 10], [70, 10]]);
    expect(el.validity.valid).toBe(true);
  });
});

describe('form reset', () => {
  it('restores the initial (empty) value without firing change', () => {
    const { form, el } = mountInForm({ name: 'signature', required: '' });
    draw(el, [[10, 10], [80, 40]]);
    draw(el, [[10, 60], [80, 90]]);
    const seen = changes(el);
    form.reset();
    expect(seen).toHaveLength(0);
    expect(el.value).toBeNull();
    expect(el.empty).toBe(true);
    expect(inkStrokes(el)).toHaveLength(0);
    expect(new FormData(form).has('signature')).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
  });

  it('starts an empty history: nothing to undo or redo after reset', () => {
    const { form, el } = mountInForm();
    draw(el, [[10, 10], [80, 40]]);
    form.reset();
    expect(el.canUndo).toBe(false);
    expect(el.canRedo).toBe(false);
    el.undo();
    expect(el.value).toBeNull();
  });

  it('keeps working after reset: the next stroke fires change', () => {
    const { form, el } = mountInForm({ name: 'signature' });
    draw(el, [[10, 10], [80, 40]]);
    form.reset();
    const seen = changes(el);
    draw(el, [[10, 60], [80, 90]]);
    expect(seen).toHaveLength(1);
    expect(new FormData(form).get('signature')).toBe(el.value);
  });

  function savedSignature(): string {
    const source = document.createElement('digital-signature-field');
    source.style.width = '400px';
    document.body.append(source);
    draw(source, [[10, 10], [80, 40]]);
    draw(source, [[10, 60], [80, 90]]);
    const value = source.value as string;
    source.remove();
    return value;
  }

  it('restores the value the field was first loaded with, as a base layer, without firing change', () => {
    const initial = savedSignature();
    const { form, el } = mountInForm({ name: 'signature' });
    el.value = initial;
    el.clear();
    draw(el, [[100, 10], [180, 40]]);
    const seen = changes(el);
    form.reset();
    expect(seen).toHaveLength(0);
    expect(el.value).toBe(initial);
    expect(inkStrokes(el)).toHaveLength(2);
    expect(new FormData(form).get('signature')).toBe(initial);
    expect(el.canUndo).toBe(false);
    // A base layer: clear removes it, undo brings it back.
    el.clear();
    el.undo();
    expect(el.value).toBe(initial);
  });

  it('restores the first loaded value even after later values were written', () => {
    const initial = savedSignature();
    const { form, el } = mountInForm();
    el.value = initial;
    el.value = null;
    form.reset();
    expect(el.value).toBe(initial);
  });
});

function actionButtons(el: DigitalSignatureFieldElement): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part~="action"]')];
}

/** Ctrl+Z sent from inside the drawing area, as the keyboard would while it has focus. */
function pressUndo(el: DigitalSignatureFieldElement): void {
  area(el).dispatchEvent(
    new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, composed: true, cancelable: true }),
  );
}

describe('disabled', () => {
  function signedThenDisabled(attrs: Record<string, string> = {}) {
    const mounted = mountInForm({ name: 'signature', ...attrs });
    draw(mounted.el, [[10, 10], [80, 40]]);
    draw(mounted.el, [[10, 60], [80, 90]]);
    return mounted;
  }

  it('blocks drawing', () => {
    const { el } = mountInForm({ disabled: '' });
    const seen = changes(el);
    draw(el, [[10, 10], [80, 40]]);
    expect(seen).toHaveLength(0);
    expect(el.value).toBeNull();
    expect(inkStrokes(el)).toHaveLength(0);
  });

  it('disables every action button and ignores the keyboard shortcuts', () => {
    const { el } = signedThenDisabled();
    el.disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(actionButtons(el).length).toBeGreaterThan(0);
    expect(actionButtons(el).every((b) => b.disabled)).toBe(true);
    const seen = changes(el);
    pressUndo(el);
    expect(seen).toHaveLength(0);
    expect(inkStrokes(el)).toHaveLength(2);
  });

  it('is excluded from FormData but keeps showing its ink', () => {
    const { form, el } = signedThenDisabled();
    el.disabled = true;
    expect(new FormData(form).has('signature')).toBe(false);
    expect(inkStrokes(el)).toHaveLength(2);
  });

  it('matches :disabled and is barred from validation', () => {
    const { form, el } = mountInForm({ required: '', disabled: '' });
    expect(el.matches(':disabled')).toBe(true);
    expect(el.willValidate).toBe(false);
    expect(form.checkValidity()).toBe(true);
  });

  it('takes the drawing area out of the tab order', () => {
    const { el } = mountInForm({ disabled: '' });
    expect(area(el).tabIndex).toBe(-1);
  });

  it('is disabled by a disabled <fieldset> too', () => {
    const { form, el } = mountInForm({ name: 'signature' });
    const fieldset = document.createElement('fieldset');
    form.prepend(fieldset);
    fieldset.append(el);
    draw(el, [[10, 10], [80, 40]]);
    fieldset.disabled = true;
    expect(el.matches(':disabled')).toBe(true);
    expect(new FormData(form).has('signature')).toBe(false);
    const seen = changes(el);
    draw(el, [[10, 60], [80, 90]]);
    expect(seen).toHaveLength(0);
    expect(actionButtons(el).every((b) => b.disabled)).toBe(true);
  });

  it('works again once re-enabled', () => {
    const { form, el } = signedThenDisabled();
    el.disabled = true;
    el.disabled = false;
    expect(el.matches(':disabled')).toBe(false);
    expect(new FormData(form).get('signature')).toBe(el.value);
    expect(actionButtons(el).find((b) => b.dataset['action'] === 'undo')!.disabled).toBe(false);
    expect(area(el).tabIndex).toBe(0);
    const seen = changes(el);
    draw(el, [[100, 10], [180, 40]]);
    expect(seen).toHaveLength(1);
  });
});

describe('readonly', () => {
  it('blocks drawing, the action buttons and the keyboard shortcuts', () => {
    const { el } = mountInForm({ name: 'signature' });
    draw(el, [[10, 10], [80, 40]]);
    el.readOnly = true;
    expect(el.hasAttribute('readonly')).toBe(true);
    const seen = changes(el);
    draw(el, [[10, 60], [80, 90]]);
    pressUndo(el);
    expect(seen).toHaveLength(0);
    expect(inkStrokes(el)).toHaveLength(1);
    expect(actionButtons(el).every((b) => b.disabled)).toBe(true);
  });

  it('still submits its value and stays focusable', () => {
    const { form, el } = mountInForm({ name: 'signature' });
    draw(el, [[10, 10], [80, 40]]);
    el.readOnly = true;
    expect(new FormData(form).get('signature')).toBe(el.value);
    expect(area(el).tabIndex).toBe(0);
  });

  it('restores the buttons when readonly is removed', () => {
    const { el } = mountInForm();
    draw(el, [[10, 10], [80, 40]]);
    el.readOnly = true;
    el.readOnly = false;
    expect(actionButtons(el).find((b) => b.dataset['action'] === 'clear')!.disabled).toBe(false);
    const seen = changes(el);
    pressUndo(el);
    expect(seen).toHaveLength(1);
  });
});

describe('custom states', () => {
  it(':state(empty) follows the ink', () => {
    const { form, el } = mountInForm();
    expect(el.matches(':state(empty)')).toBe(true);
    draw(el, [[10, 10], [80, 40]]);
    expect(el.matches(':state(empty)')).toBe(false);
    el.clear();
    expect(el.matches(':state(empty)')).toBe(true);
    el.undo();
    form.reset();
    expect(el.matches(':state(empty)')).toBe(true);
  });

  it('does not show :state(invalid) before the user has interacted', () => {
    const { el } = mountInForm({ required: '' });
    expect(el.validity.valid).toBe(false);
    expect(el.matches(':state(invalid)')).toBe(false);
  });

  it('shows :state(invalid) after a submit attempt', () => {
    const { form, el } = mountInForm({ required: '' });
    form.requestSubmit();
    expect(el.matches(':state(invalid)')).toBe(true);
  });

  it('shows :state(invalid) after the user has drawn and cleared', () => {
    const { el } = mountInForm({ required: '' });
    draw(el, [[10, 10], [80, 40]]);
    expect(el.matches(':state(invalid)')).toBe(false);
    el.clear();
    expect(el.matches(':state(invalid)')).toBe(true);
  });

  it('shows :state(invalid) after focus has left the field', () => {
    const { el } = mountInForm({ 'min-strokes': '2', required: '' });
    el.focus();
    expect(el.matches(':state(invalid)')).toBe(false);
    outsideButton().focus();
    expect(el.matches(':state(invalid)')).toBe(true);
  });

  it('drops :state(invalid) once the field is valid, and after a form reset', () => {
    const { form, el } = mountInForm({ required: '' });
    form.requestSubmit();
    draw(el, [[10, 10], [80, 40]]);
    expect(el.matches(':state(invalid)')).toBe(false);
    el.clear();
    expect(el.matches(':state(invalid)')).toBe(true);
    form.reset();
    expect(el.validity.valueMissing).toBe(true);
    expect(el.matches(':state(invalid)')).toBe(false);
  });

  it('paints the drawing area border with --dsf-invalid-color while :state(invalid)', () => {
    const { form, el } = mountInForm({ required: '' });
    el.style.setProperty('--dsf-invalid-color', 'rgb(200, 0, 0)');
    expect(getComputedStyle(area(el)).borderTopColor).not.toBe('rgb(200, 0, 0)');
    form.requestSubmit();
    expect(getComputedStyle(area(el)).borderTopColor).toBe('rgb(200, 0, 0)');
  });
});

function outsideButton(): HTMLButtonElement {
  const outside = document.createElement('button');
  outside.textContent = 'outside';
  document.body.append(outside);
  return outside;
}

function blurs(el: DigitalSignatureFieldElement): { count: number } {
  const seen = { count: 0 };
  el.addEventListener('blur', () => seen.count++);
  return seen;
}

describe('focus and blur', () => {
  it('focus() focuses the drawing area', () => {
    const { el } = mountInForm();
    el.focus();
    expect(document.activeElement).toBe(el);
    expect(el.shadowRoot!.activeElement).toBe(area(el));
  });

  it('fires blur on the field when focus leaves it', () => {
    const { el } = mountInForm();
    const seen = blurs(el);
    el.focus();
    outsideButton().focus();
    expect(seen.count).toBe(1);
  });

  it('does not fire blur when focus moves between the drawing area and its own buttons', () => {
    const { el } = mountInForm();
    draw(el, [[10, 10], [80, 40]]);
    const seen = blurs(el);
    el.focus();
    actionButtons(el)[0]!.focus();
    expect(el.shadowRoot!.activeElement).toBe(actionButtons(el)[0]);
    expect(seen.count).toBe(0);
  });
});
