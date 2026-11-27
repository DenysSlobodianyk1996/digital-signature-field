<script setup lang="ts">
// Variant 4: `actions="none"`, the app's own toolbar driven by `dsf-history-change`.
import type { DigitalSignatureFieldElement, HistoryState } from '@digital-signature-field/element';
import { ref, useTemplateRef } from 'vue';
import ValueView from './ValueView.vue';

const sig = useTemplateRef<DigitalSignatureFieldElement>('sig');
const history = ref<HistoryState>({ canUndo: false, canRedo: false, empty: true });
const value = ref<string | null>(null);
</script>

<template>
  <section data-testid="headless">
    <h2>Headless with the app's own toolbar</h2>
    <p>
      <code>actions="none"</code> hides the built-in bar. The buttons below call <code>undo()</code>,
      <code>redo()</code> and <code>clear()</code>, and <code>dsf-history-change</code> enables them.
    </p>
    <digital-signature-field
      ref="sig"
      actions="none"
      @dsf-history-change="history = $event.detail"
      @change="value = $event.detail.value"
    />
    <div class="toolbar" role="toolbar" aria-label="Signature">
      <button type="button" :disabled="!history.canUndo" @click="sig?.undo()">Undo</button>
      <button type="button" :disabled="!history.canRedo" @click="sig?.redo()">Redo</button>
      <button type="button" :disabled="history.empty" @click="sig?.clear()">Start over</button>
    </div>
    <ValueView :value="value" />
  </section>
</template>
