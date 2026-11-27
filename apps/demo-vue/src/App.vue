<script setup lang="ts">
import '@digital-signature-field/element';
import { ref } from 'vue';

const signature = ref<string | null>(null);
const submitted = ref<FormDataEntryValue | null>(null);

function onSubmit(event: SubmitEvent) {
  submitted.value = new FormData(event.target as HTMLFormElement).get('signature');
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <digital-signature-field
      :value="signature"
      @change="signature = $event.detail.value"
      name="signature"
      required
      actions="undo redo clear"
      :labels.prop="{ clear: 'Start over' }"
    />
    <img v-if="signature" :src="signature" alt="Your signature" />
    <button>Submit</button>
    <output v-if="submitted">{{ submitted }}</output>
  </form>
</template>
