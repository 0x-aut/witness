<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Download, FileText } from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";

type DocumentItem = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  storageId: string;
  url?: string | null;
};

const props = defineProps<{
  documents: DocumentItem[];
}>();

const hovered = ref(false);
const clusterRef = ref<HTMLElement | null>(null);
const tileRefs = ref<HTMLElement[]>([]);

const gsap = useGSAP();

const rotations = [5, -7, 7, -5];

function setTileRef(
  element: Element | ComponentPublicInstance | null,
) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  if (!tileRefs.value.includes(element)) {
    tileRefs.value.push(element);
  }
}

function isImage(document: DocumentItem) {
  return document.mimeType.startsWith("image/");
}

function isPdf(document: DocumentItem) {
  return document.mimeType === "application/pdf";
}

function compactPosition(index: number) {
  return {
    x: index * 30,
    rotation: rotations[index % rotations.length],
  };
}

function expandedPosition(index: number) {
  return {
    x: index * 78,
    rotation: 0,
  };
}

function animateCluster(expanded: boolean) {
  const tiles = tileRefs.value;

  for (let index = 0; index < tiles.length; index++) {
    const position = expanded
      ? expandedPosition(index)
      : compactPosition(index);

    gsap.to(tiles[index], {
      x: position.x,
      rotate: position.rotation,
      duration: 0.38,
      ease: "power3.out",
      overwrite: true,
    });
  }

  if (clusterRef.value) {
    gsap.to(clusterRef.value, {
      width: expanded
        ? `${Math.max(72, props.documents.length * 78)}px`
        : `${72 + Math.max(props.documents.length - 1, 0) * 30}px`,
      duration: 0.38,
      ease: "power3.out",
      overwrite: true,
    });
  }
}

function enter() {
  hovered.value = true;
  animateCluster(true);
}

function leave() {
  hovered.value = false;
  animateCluster(false);
}

async function downloadDocument(
  document: DocumentItem,
) {
  if (!document.url) {
    return;
  }

  try {
    const response = await fetch(document.url);

    if (!response.ok) {
      throw new Error("Unable to download file.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = document.filename;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(
      "Failed to download document:",
      error,
    );

    window.open(
      document.url,
      "_blank",
      "noopener,noreferrer",
    );
  }
}

onMounted(() => {
  if (!clusterRef.value) {
    return;
  }

  animateCluster(false);
});

onUnmounted(() => {
  tileRefs.value = [];
});
</script>

<template>
  <div
    ref="clusterRef"
    class="relative h-[72px] shrink-0"
    :style="{
      width: `${72 + Math.max(documents.length - 1, 0) * 30}px`,
    }"
    @mouseenter="enter"
    @mouseleave="leave"
  >
    <div
      v-for="(document, index) in documents"
      :key="document.id"
      :ref="setTileRef"
      class="absolute left-0 top-0 h-[72px] w-[72px]"
      :style="{
        zIndex: 20 + index,
      }"
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
          class="group/file relative h-[72px] w-[72px] overflow-hidden bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
        >
          <img
            v-if="
              document.url &&
              isImage(document)
            "
            :src="document.url"
            :alt="document.filename"
            draggable="false"
            class="h-full w-full object-cover"
          />

          <iframe
            v-else-if="
              document.url &&
              isPdf(document)
            "
            :src="`${document.url}#page=1&toolbar=0&navpanes=0&scrollbar=0`"
            :title="document.filename"
            class="pointer-events-none h-full w-full border-0"
          />

          <div
            v-else
            class="flex h-full w-full items-center justify-center bg-[#F7F7F7]"
          >
            <FileText
              :size="27"
              :stroke-width="1.6"
              class="text-[#6B6B6B]"
            />
          </div>

          <!-- DOWNLOAD -->
          <button
            type="button"
            :aria-label="`Download ${document.filename}`"
            class="absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-black/45 opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur transition-all duration-150 hover:bg-white hover:text-black group-hover/file:opacity-100"
            @click.stop="downloadDocument(document)"
          >
            <Download
              :size="12"
              :stroke-width="1.9"
            />
          </button>

          <!-- FILE NAME -->
          <div
            class="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-black/72 px-2 py-1.5 transition-transform duration-200 group-hover/file:translate-y-0"
          >
            <p
              class="truncate text-[8px] font-medium text-white"
            >
              {{ document.filename }}
            </p>
          </div>
        </div>
      </SmoothCorners>
    </div>
  </div>
</template>