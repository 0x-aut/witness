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

const showFallback = computed(
  () =>
    documentQuery.data.value !== undefined &&
    blocks.value.length === 0 &&
    !!props.fallbackText?.trim(),
);
</script>

<template>
  <article class="max-w-180">
    <!-- Document loading -->
    <div
      v-if="documentQuery.data.value === undefined"
      class="flex min-h-20 items-center"
    >
      <Loader color="#111111" />
    </div>

    <!-- Persisted blocks -->
    <div
      v-else-if="blocks.length"
      class="space-y-2.5"
    >
      <UIElementsCaseBlock
        v-for="block in blocks"
        :key="block._id"
        :block="block"
      />
    </div>

    <!-- Compatibility fallback for Cases created before blocks existed -->
    <UIElementsCaseNarrativeBlock
      v-else-if="showFallback"
      :text="fallbackText!"
    />

    <!-- Empty document -->
    <p
      v-else
      class="text-[15px] leading-8 text-black/30"
    >
      Witness has not added anything to this Case yet.
    </p>
  </article>
</template>