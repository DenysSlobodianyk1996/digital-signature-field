<script setup lang="ts">
// The demo page: one section per recipe in docs/variants/.
import { ref } from 'vue';
import App from '../App.vue';
import DialogSection from './DialogSection.vue';
import HeadlessSection from './HeadlessSection.vue';
import ValueView from './ValueView.vue';

/** Extra sheet adopted into the field's shadow root through the `styles` property. */
const FIELD_STYLES = `
  [part~="guide"] { border-top-style: solid; }
  [part~="action"] { text-transform: uppercase; letter-spacing: 0.04em; }
`;

const defaultValue = ref<string | null>(null);
const styledValue = ref<string | null>(null);
const penOptionsValue = ref<string | null>(null);
const sideRailValue = ref<string | null>(null);

/** `change` bubbles, so the Default section hears the README recipe's field without touching it. */
function onDefaultChange(event: Event) {
  if (event instanceof CustomEvent) defaultValue.value = event.detail.value;
}
</script>

<template>
  <section data-testid="default" @change="onDefaultChange">
    <h2>Default</h2>
    <p>
      The default layout, actions bar below the drawing area, in a native form with <code>required</code>. This is the
      README's Vue recipe.
    </p>
    <App />
    <ValueView :value="defaultValue" :image="false" />
  </section>

  <HeadlessSection />

  <section data-testid="custom-styles">
    <h2>Custom styles</h2>
    <p>
      Custom properties and <code>::part()</code> in the app's stylesheet (<code>.fancy-signature</code>), plus an extra
      sheet through the <code>styles</code> property.
    </p>
    <digital-signature-field
      class="fancy-signature"
      :styles.prop="FIELD_STYLES"
      @change="styledValue = $event.detail.value"
    />
    <ValueView :value="styledValue" />
  </section>

  <DialogSection />

  <section data-testid="pen-options">
    <h2>Actions bar above, with pen options</h2>
    <p>
      <code>actions="color width undo redo clear"</code>, <code>actions-position="top"</code>,
      <code>penColors</code> and <code>pressure</code>.
    </p>
    <digital-signature-field
      actions="color width undo redo clear"
      actions-position="top"
      :penColors.prop="['#000', '#1a3fbf', '#b91c1c']"
      :pressure="true"
      @change="penOptionsValue = $event.detail.value"
    />
    <ValueView :value="penOptionsValue" />
  </section>

  <section data-testid="side-rail">
    <h2>Side rail, right to left</h2>
    <p>
      <code>actions-position="end"</code> with <code>dir="rtl"</code>: the rail moves to the left. Labels are translated
      through <code>labels</code>.
    </p>
    <digital-signature-field
      dir="rtl"
      actions="undo redo clear"
      actions-position="end"
      :labels.prop="{ undo: 'בטל', redo: 'בצע שוב', clear: 'נקה' }"
      @change="sideRailValue = $event.detail.value"
    />
    <ValueView :value="sideRailValue" />
  </section>
</template>
