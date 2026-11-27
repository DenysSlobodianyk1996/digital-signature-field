<script setup lang="ts">
// Shows a signature value: the `<img>` preview (values are data URLs) and the raw value, collapsed.
withDefaults(defineProps<{ value: string | null; image?: boolean }>(), { image: true });
</script>

<template>
  <div class="value">
    <img v-if="image && value" :src="value" alt="Signature preview" />
    <details>
      <summary>Raw value</summary>
      <output data-testid="value">{{ value ?? 'null' }}</output>
    </details>
  </div>
</template>
