<script setup lang="ts">
import { FileText } from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";

type DocumentData = {
  fileId?: string;
  storageId?: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string | null;
};

const props = defineProps<{
  documents: DocumentData[];
}>();

const documents = computed(() =>
  props.documents.slice(0, 4),
);

const rotations = [5, -7, 7, -5];

function isImage(document: DocumentData) {
  return document.mimeType.startsWith("image/");
}

function isPdf(document: DocumentData) {
  return document.mimeType === "application/pdf";
}

function fileStackStyle(index: number) {
  const gap = 30;

  return {
    left: `${index * gap}px`,
    top: "0px",
    transform: `rotate(${rotations[index % rotations.length]}deg)`,
    zIndex: 10 + index,
  };
}
</script>

<template>
  <div
    class="relative h-[72px] shrink-0"
    :style="{
      width: `${72 + Math.max(documents.length - 1, 0) * 30}px`,
    }"
  >
    <div
      v-for="(document, index) in documents"
      :key="
        document.fileId ??
        document.storageId ??
        `${document.filename}-${index}`
      "
      class="absolute left-0 top-0 h-[72px] w-[72px] transition-transform duration-200"
      :style="fileStackStyle(index)"
    >
      <SmoothCorners
        as-child
        :corners="{
          radius: 10,
          smoothing: 0.65,
        }"
        :middle-border="{
          width: 1,
          color: '#E3E3E3',
          opacity: 1,
        }"
      >
        <div
          class="relative h-[72px] w-[72px] overflow-hidden bg-white shadow-[0_4px_12px_rgba(0,0,0,0.09)]"
        >
          <img
            v-if="document.url && isImage(document)"
            :src="document.url"
            :alt="document.filename"
            draggable="false"
            class="h-full w-full object-cover"
          />

          <iframe
            v-else-if="document.url && isPdf(document)"
            :src="`${document.url}#page=1&toolbar=0&navpanes=0&scrollbar=0`"
            :title="document.filename"
            class="pointer-events-none h-full w-full border-0"
          />

          <div
            v-else
            class="flex h-full w-full items-center justify-center bg-[#F7F7F7]"
          >
            <FileText
              :size="28"
              :stroke-width="1.65"
              class="text-[#6B6B6B]"
            />
          </div>
        </div>
      </SmoothCorners>
    </div>
  </div>
</template>