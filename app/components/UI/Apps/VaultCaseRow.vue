<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import {
  ChevronRight,
  FileText,
} from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";

type DocumentItem = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  storageId: string;
  url?: string | null;
};

type WebsiteItem = {
  id: string;
  type: string;
  url: string | null;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  favicon?: string | null;
};

const props = defineProps<{
  caseData: {
    _id: string;
    title: string;
    summary?: string;
    originalPrompt: string;
  };
  documents: DocumentItem[];
  websites: WebsiteItem[];
  username: string;
}>();

const scrollRef = ref<HTMLElement | null>(null);
const resourceRefs = ref<HTMLElement[]>([]);
const observedResources = new WeakSet<HTMLElement>();

const gsap = useGSAP();

const documentClusters = computed(() => {
  const clusters: DocumentItem[][] = [];

  for (
    let index = 0;
    index < props.documents.length;
    index += 4
  ) {
    clusters.push(
      props.documents.slice(index, index + 4),
    );
  }

  return clusters;
});

const resources = computed(() => [
  ...documentClusters.value.map(
    (documents, index) => ({
      kind: "documents" as const,
      id: `documents-${index}`,
      documents,
    }),
  ),

  ...props.websites
    .filter(website => !!website.url)
    .map(website => ({
      kind: "website" as const,
      id: website.id,
      website,
    })),
]);

function setResourceRef(
  element: Element | ComponentPublicInstance | null,
) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  if (!resourceRefs.value.includes(element)) {
    resourceRefs.value.push(element);
  }
}

function animateResource(
  element: HTMLElement,
  index: number,
) {
  if (observedResources.has(element)) {
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      const entry = entries[0];

      if (!entry?.isIntersecting) {
        return;
      }

      gsap.to(element, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        delay: index * 0.045,
        ease: "power3.out",
      });

      observer.disconnect();
      observedResources.add(element);
    },
    {
      root: scrollRef.value,
      threshold: 0.15,
    },
  );

  observer.observe(element);
}

function smoothWheel(event: WheelEvent) {
  const element = scrollRef.value;

  if (!element) {
    return;
  }

  const hasHorizontalOverflow =
    element.scrollWidth > element.clientWidth;

  if (!hasHorizontalOverflow) {
    return;
  }

  const delta =
    Math.abs(event.deltaX) >
    Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;

  if (!delta) {
    return;
  }

  event.preventDefault();

  gsap.to(element, {
    scrollLeft:
      element.scrollLeft + delta * 1.15,
    duration: 0.42,
    ease: "power3.out",
    overwrite: "auto",
  });
}

let revealObserver: IntersectionObserver | null = null;

onMounted(async () => {
  await nextTick();

  const elements =
    resourceRefs.value;

  elements.forEach(
    (element, index) => {
      gsap.set(element, {
        opacity: 0,
        y: 10,
        scale: 0.98,
      });

      animateResource(
        element,
        index,
      );
    },
  );

  revealObserver =
    new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const index = elements.indexOf(
            entry.target as HTMLElement,
          );

          animateResource(
            entry.target as HTMLElement,
            Math.max(index, 0),
          );
        }
      },
      {
        threshold: 0.1,
      },
    );

  for (const element of elements) {
    revealObserver.observe(element);
  }
});

onUnmounted(() => {
  revealObserver?.disconnect();
  revealObserver = null;
});
</script>

<template>
  <section class="group">
    <!-- CASE HEADER -->
    <NuxtLink
      :to="`/${username}/cases/${caseData._id}`"
      class="group/header flex w-full items-center justify-between py-1.5"
    >
      <div class="flex min-w-0 items-center gap-x-2">
        <h2
          class="truncate text-[15px] font-medium tracking-[-0.012em] text-[#151515]"
        >
          {{ caseData.title }}
        </h2>

        <ChevronRight
          :size="15"
          :stroke-width="1.7"
          class="shrink-0 text-black/25 transition-all duration-200 group-hover/header:translate-x-0.5 group-hover/header:text-black/60"
        />
      </div>

      <span
        class="hidden shrink-0 text-[11px] text-black/25 sm:block"
      >
        {{
          props.documents.length +
          props.websites.length
        }}
        {{
          props.documents.length +
          props.websites.length === 1
            ? "item"
            : "items"
        }}
      </span>
    </NuxtLink>

    <!-- ONE ROW PER CASE -->
    <div
      v-if="resources.length"
      ref="scrollRef"
      class="vault-scroll mt-2 flex min-w-0 flex-nowrap items-start gap-1 overflow-x-auto overflow-y-hidden pb-3 pt-1"
      @wheel="smoothWheel"
    >
      <div
        v-for="(resource, index) in resources"
        :key="resource.id"
        :ref="setResourceRef"
        class="shrink-0"
      >
        <UIElementsVaultDocumentCluster
          v-if="resource.kind === 'documents'"
          :documents="resource.documents"
        />

        <UIElementsCaseWebsiteWidget
          v-else-if="resource.website.url"
          :data="resource.website"
        />
      </div>
    </div>

    <div
      v-else
      class="mt-2 flex h-[72px] items-center rounded-[10px] border border-dashed border-black/[0.08] px-3 text-xs text-black/25"
    >
      No documents or saved websites yet.
    </div>
  </section>
</template>

<style scoped>
.vault-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.vault-scroll::-webkit-scrollbar {
  display: none;
}
</style>