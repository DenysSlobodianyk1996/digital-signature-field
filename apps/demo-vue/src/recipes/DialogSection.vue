<script setup lang="ts">
// Variant 5, preview + dialog: the form keeps a small preview, and a native `<dialog>` holds the field.
// The dialog edits a `draft` copy: Save copies it into the form state, Cancel discards it.
import { ref, useTemplateRef } from 'vue';
import ValueView from './ValueView.vue';

const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const signature = ref<string | null>(null);
const draft = ref<string | null>(null);

function open() {
  // `:value` loads the saved value (and a fresh history) into the dialog's field.
  draft.value = signature.value;
  dialog.value!.showModal();
}

function save() {
  signature.value = draft.value;
  dialog.value!.close();
}
</script>

<template>
  <section data-testid="dialog">
    <h2>Preview + dialog</h2>
    <p>
      The form shows the value as an <code>&lt;img&gt;</code>. The dialog edits a copy: <b>Save</b> copies it into the
      form, <b>Cancel</b> discards it.
    </p>
    <ValueView :value="signature" />
    <button type="button" @click="open">{{ signature ? 'Change signature' : 'Add signature' }}</button>

    <dialog ref="dialog" aria-labelledby="vue-dialog-title">
      <h3 id="vue-dialog-title">Sign here</h3>
      <digital-signature-field :value="draft" @change="draft = $event.detail.value" />
      <div class="toolbar">
        <button type="button" @click="dialog?.close()">Cancel</button>
        <button type="button" @click="save">Save</button>
      </div>
    </dialog>
  </section>
</template>
