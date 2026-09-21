<script setup lang="ts">
withDefaults(
  defineProps<{
    color?: string;
  }>(),
  {
    color: "#FFF",
  },
);
</script>

<template>
  <span
    class="loader"
    :style="{ borderColor: color, borderBottomColor: 'transparent' }"
  />
</template>

<style lang="css" scoped>
.loader {
  width: 18px;
  height: 18px;
  border: 2px solid;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>