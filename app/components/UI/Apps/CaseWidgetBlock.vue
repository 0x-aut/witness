<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  widgets: Array<{
    _id: string;
    type: string;
    data: Record<string, unknown>;
  }>;
}>();

const widgets = computed(() => props.widgets);
</script>

<template>
  <div
    v-if="widgets.length"
    class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3"
  >
    <template
      v-for="widget in widgets"
      :key="widget._id"
    >
      <UIElementsCaseWebsiteWidget
        v-if="widget.type === 'link'"
        :data="widget.data"
      />

      <UIElementsCaseResearchWidget
        v-else-if="widget.type === 'research'"
        :data="widget.data"
      />

      <!-- Existing widget types -->
      <UIElementsCaseGenericWidget
        v-else
        :type="widget.type"
        :data="widget.data"
      />
    </template>
  </div>
</template>