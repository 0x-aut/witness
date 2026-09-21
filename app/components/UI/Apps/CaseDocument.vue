<script setup lang="ts">
import { computed } from "vue";
import type { Id } from "@@/convex/_generated/dataModel";
import { api } from "@@/convex/_generated/api";

const props = defineProps<{
  caseId: Id<"cases">;
  fallbackText?: string;
}>();

const documentQuery = useConvexQuery(
  api.cases.document.get,
  computed(() => ({
    caseId: props.caseId,
  })),
);

const blocks = computed(
  () => documentQuery.data.value?.blocks ?? [],
);

console.log(blocks.value)

const showFallback = computed(
  () =>
    documentQuery.data.value !== undefined &&
    blocks.value.length === 0 &&
    !!props.fallbackText?.trim(),
);
</script>

<template>
  <div class="space-y-8">
    <template
      v-for="block in blocks"
      :key="block._id"
    >
      <p
        v-if="block.type === 'narrative'"
        class="max-w-3xl text-[16px] leading-7 text-black/70"
      >
        {{ block.text }}
      </p>

      <UIAppsCaseWidgetBlock
        v-else
        :widgets="block.widgets"
      />
    </template>
  </div>
</template>