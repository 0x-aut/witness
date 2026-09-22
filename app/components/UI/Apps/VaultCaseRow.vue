<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronRight, FileText, X } from "@lucide/vue";
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

const selectedDocument = ref<DocumentItem | null>(null);

const resources = computed(() => [
  ...props.documents.map(document => ({
    kind: "document" as const,
    id: document.id,
    document,
  })),
  ...props.websites.map(website => ({
    kind: "website" as const,
    id: website.id,
    website,
  })),
]);

function isImage(document: DocumentItem) {
  return document.mimeType.startsWith("image/");
}

function isPdf(document: DocumentItem) {
  return document.mimeType === "application/pdf";
}

function openDocument(document: DocumentItem) {
  selectedDocument.value = document;
}

function closeDocument() {
  selectedDocument.value = null;
}
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
        {{ resources.length }}
        {{ resources.length === 1 ? "item" : "items" }}
      </span>
    </NuxtLink>

    <!-- RESOURCE ROW -->
    <div
      v-if="resources.length"
      class="mt-2 flex min-w-0 gap-1 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <template
        v-for="resource in resources"
        :key="resource.id"
      >
        <!-- DOCUMENT -->
        <button
          v-if="resource.kind === 'document'"
          type="button"
          class="group/document relative h-[72px] w-[72px] shrink-0 text-left"
          :aria-label="`Open ${resource.document.filename}`"
          @click="openDocument(resource.document)"
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
              class="relative h-full w-full overflow-hidden bg-white shadow-[0_4px_12px_rgba(0,0,0,0.07)] transition-transform duration-200 group-hover/document:-translate-y-0.5"
            >
              <img
                v-if="
                  resource.document.url &&
                  isImage(resource.document)
                "
                :src="resource.document.url"
                :alt="resource.document.filename"
                draggable="false"
                class="h-full w-full object-cover"
              />

              <iframe
                v-else-if="
                  resource.document.url &&
                  isPdf(resource.document)
                "
                :src="`${resource.document.url}#page=1&toolbar=0&navpanes=0&scrollbar=0`"
                :title="resource.document.filename"
                class="pointer-events-none h-full w-full border-0"
              />

              <div
                v-else
                class="flex h-full w-full items-center justify-center bg-[#F7F7F7]"
              >
                <FileText
                  :size="28"
                  :stroke-width="1.6"
                  class="text-[#6B6B6B]"
                />
              </div>

              <div
                class="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-black/70 px-2 py-1.5 transition-transform duration-200 group-hover/document:translate-y-0"
              >
                <p
                  class="truncate text-[8px] font-medium text-white"
                >
                  {{ resource.document.filename }}
                </p>
              </div>
            </div>
          </SmoothCorners>
        </button>

        <!-- WEBSITE -->
        <UIElementsCaseWebsiteWidget
          v-else-if="resource.website.url"
          :data="resource.website"
        />
      </template>
    </div>

    <!-- EMPTY CASE -->
    <div
      v-else
      class="mt-2 flex h-[72px] items-center rounded-[10px] border border-dashed border-black/[0.08] px-3 text-xs text-black/25"
    >
      No documents or saved websites yet.
    </div>

    <!-- DOCUMENT PREVIEW -->
    <Teleport to="body">
      <div
        v-if="selectedDocument"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-6 backdrop-blur-[2px]"
        @click.self="closeDocument"
      >
        <SmoothCorners
          as-child
          :corners="{
            radius: 18,
            smoothing: 0.7,
          }"
          :middle-border="{
            width: 1,
            color: '#E3E3E3',
            opacity: 1,
          }"
        >
          <div
            class="relative flex h-[min(86vh,760px)] w-[min(86vw,900px)] flex-col overflow-hidden bg-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]"
          >
            <div
              class="flex shrink-0 items-center justify-between border-b border-[#EEEEEE] px-4 py-3"
            >
              <div class="min-w-0 pr-4">
                <p
                  class="truncate text-sm font-medium text-[#151515]"
                >
                  {{ selectedDocument.filename }}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close preview"
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black/35 transition-colors hover:bg-black/[0.04] hover:text-black"
                @click="closeDocument"
              >
                <X
                  :size="15"
                  :stroke-width="1.8"
                />
              </button>
            </div>

            <div class="min-h-0 flex-1 bg-[#F5F5F5]">
              <img
                v-if="
                  selectedDocument.url &&
                  isImage(selectedDocument)
                "
                :src="selectedDocument.url"
                :alt="selectedDocument.filename"
                class="h-full w-full object-contain"
              />

              <iframe
                v-else-if="
                  selectedDocument.url &&
                  isPdf(selectedDocument)
                "
                :src="`${selectedDocument.url}#toolbar=1&navpanes=0`"
                :title="selectedDocument.filename"
                class="h-full w-full border-0"
              />

              <div
                v-else
                class="flex h-full flex-col items-center justify-center text-center"
              >
                <FileText
                  :size="42"
                  :stroke-width="1.4"
                  class="text-black/30"
                />

                <p
                  class="mt-3 max-w-sm text-sm text-black/45"
                >
                  Preview isn't available for this file type.
                </p>

                <a
                  v-if="selectedDocument.url"
                  :href="selectedDocument.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-4 text-xs font-medium text-black/55 underline underline-offset-4 transition-colors hover:text-black"
                >
                  Open file
                </a>
              </div>
            </div>
          </div>
        </SmoothCorners>
      </div>
    </Teleport>
  </section>
</template>