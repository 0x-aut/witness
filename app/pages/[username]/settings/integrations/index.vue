
<script setup lang="ts">
import { SmoothCorners } from "@lisse/vue";

definePageMeta({
  layout: "set",
});

useSeoMeta({
  title: "Integrations",
});

const route = useRoute();

const username = route.params.username as string;

const integrations = [
  {
    name: "Gmail",
    slug: "gmail",
    logo: "/integrations/gmail.svg",
    description:
      "Find relevant emails, read correspondence, and work with your messages when needed.",
    connected: true,
  },
  {
    name: "Google Drive",
    slug: "google-drive",
    logo: "/integrations/google-drive.svg",
    description:
      "Find and work with documents and files that are relevant to your cases.",
    connected: false,
  },
];
</script>

<template>
  <div class="h-full w-full overflow-y-auto">
    <div
      class="mx-auto flex min-h-full w-full max-w-175 flex-col px-6 py-12"
    >
      <!-- HEADER -->
      <header class="mb-9">
        <h1
          class="font-sans text-2xl font-medium tracking-[-0.025em] text-[#121212]"
        >
          Integrations
        </h1>

        <p
          class="mt-1.5 max-w-130 font-sans text-sm leading-5 text-[#6B6B6B]"
        >
          Enhance your experience with Witness by connecting apps and tools
          that you use everyday.
        </p>
      </header>

      <!-- GRID -->
      <GSAPTransition
        group
        :stagger="0.05"
        :hidden="{ opacity: 0, y: 8 }"
        :duration="0.25"
      >
        <div
          class="grid grid-cols-[repeat(auto-fill,180px)] justify-start gap-3"
        >
          <SmoothCorners
            v-for="integration in integrations"
            :key="integration.slug"
            as-child
            :corners="{
              radius: 16,
              smoothing: 0.6,
            }"
            :middle-border="{
              width: 1,
              color: '#E3E3E3',
              opacity: 1,
            }"
          >
            <NuxtLink
              :to="`/${username}/settings/integrations/${integration.slug}`"
              class="group flex h-35 max-h-35 w-45 max-w-45 flex-col gap-y-2 bg-transparent justify-between p-2.25 text-left transition-colors duration-150 hover:bg-[#EBEBEB]"
            >
              <!-- TOP -->
              <div class="flex min-w-0 items-center gap-x-1.5">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center"
                >
                  <NuxtImg
                    :src="integration.logo"
                    width="24"
                    height="24"
                  />
                </div>
            
                <div class="min-w-0">
                  <h3
                    class="truncate text-[15px] font-normal leading-5 text-[#121212]"
                  >
                    {{ integration.name }}
                  </h3>
            
                  <span
                    v-if="integration.connected"
                    class="block text-[11px] leading-2 text-[#777777]"
                  >
                    Connected
                  </span>
                </div>
              </div>
            
              <!-- BOTTOM -->
              <div>
                <p
                  class="line-clamp-3 text-xs leading-5 text-[#6B6B6B]"
                >
                  {{ integration.description }}
                </p>
              </div>
            </NuxtLink>
          </SmoothCorners>
        </div>
      </GSAPTransition>
    </div>
  </div>
</template>
