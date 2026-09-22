<script setup lang="ts">
import { ref } from "vue";
import { SmoothCorners } from "@lisse/vue";
import {
  Asterisk,
  CircleUserRound,
  ChevronLeft,
  LassoSelect,
  Blocks,
} from "@lucide/vue";
import { authClient } from "@@/lib/auth-client";

const session = ref<Awaited<ReturnType<typeof authClient.getSession>>["data"]>(null);

onMounted(async () => {
  const result = await authClient.getSession();
  session.value = result.data;
});

const route = useRoute();

const username = route.params.username as string;

const accountNavigation = [
  {
    name: "Profile",
    to: `/${username}/settings/account/profile`,
    icon: CircleUserRound,
    tooltip: "Edit important information about you",
  },
  {
    name: "Agent personalization",
    to: `/${username}/settings/account/agent`,
    icon: LassoSelect,
    tooltip: "Give AI more context about you.",
  },
];

const featureNavigation = [
  {
    name: "AI & Agents",
    to: `/${username}/settings/ai`,
    icon: Asterisk,
    tooltip: "See AI use and edit created agents.",
  },
  {
    name: "Integrations",
    to: `/${username}/settings/integrations`,
    icon: Blocks,
    tooltip: "Add or remove integrations that your agents can access.",
  },
];

</script>

<template>
  <main
    class="unmodified-font-sans flex h-screen w-full justify-start bg-[#F4F4F4] p-2.5"
  >
    <aside class="flex w-55 shrink-0 flex-col py-2.5 pr-2.5 max-md:hidden">
      <!-- USER / TOP ACTIONS -->
      <div class="mb-5 flex items-center justify-between">
        <SmoothCorners
          as-child
          :corners="{ radius: 999 }"
        >
          <button
            type="button"
            class="flex group items-center gap-x-1 px-1.5 py-0.75 transition-colors duration-100 hover:bg-[#EBEBEB]"
            @click="navigateTo(`/${username}/agent/`)"
          >
            <div
              class="flex items-center justify-center"
            >
              <ChevronLeft 
                :size="15" 
                :stroke-width="1.5"
                class="text-[#6B6B6B] duration-100 group-hover:text-[#121212]"
              />
            </div>
            <div class="flex items-center pr-0.5">
              <span
                class="font-sans text-sm font-medium text-[#6B6B6B] group-hover:text-[#121212] duration-100"
              >
                Back to app
              </span>
            </div>
          </button>
        </SmoothCorners>
      </div>

      <!-- NAVIGATION -->
      <nav class="flex flex-col gap-y-0.5">
        <span class="unmodified-font-sans text-sm font-medium text-[#5F5F5F] px-2.5 cursor-default">Account</span>
        <div
          v-for="item in accountNavigation"
          :key="item.to"
          class="relative group"
        >
          <SmoothCorners
            as-child
            :corners="{ radius: 10, smoothing: 0.6 }"
          >
            <NuxtLink
              :to="item.to"
              :class="[
                'flex items-center gap-x-1.5 px-2.5 py-1 transition-colors duration-100',
                route.path === item.to || (item.to !== `/${username}/agent` && route.path.startsWith(item.to))
                  ? 'bg-[#E3E3E3]'
                  : 'hover:bg-[#EBEBEB]'
              ]"
            >
              <component
                :is="item.icon"
                :size="14"
                :stroke-width="1.8"
                :class="[
                  'transition-colors duration-100',
                  route.path === item.to || (item.to !== `/${username}/agent` && route.path.startsWith(item.to))
                    ? 'text-[#121212]'
                    : 'text-[#6B6B6B] group-hover:text-[#121212]'
                ]"
              />
              <span
                :class="[
                  'unmodified-font-sans text-sm font-normal transition-colors duration-100',
                  route.path === item.to || (item.to !== `/${username}/agent` && route.path.startsWith(item.to))
                    ? 'text-[#121212]'
                    : 'text-[#6B6B6B] group-hover:text-[#121212]'
                ]"
              >
                {{ item.name }}
              </span>
            </NuxtLink>
          </SmoothCorners>
          <UIElementsNavTooltip :text="item.tooltip" />
        </div>
      </nav>

      <nav class="flex flex-col gap-y-0.5 mt-3">
        <span class="unmodified-font-sans text-sm font-medium text-[#5F5F5F] px-2.5 cursor-default">Features</span>
        <div
          v-for="item in featureNavigation"
          :key="item.to"
          class="relative group"
        >
          <SmoothCorners
            as-child
            :corners="{ radius: 10, smoothing: 0.6 }"
          >
            <NuxtLink
              :to="item.to"
              :class="[
                'flex items-center gap-x-1.5 px-2.5 py-1 transition-colors duration-100',
                route.path === item.to || (item.to !== `/${username}/agent` && route.path.startsWith(item.to))
                  ? 'bg-[#E3E3E3]'
                  : 'hover:bg-[#EBEBEB]'
              ]"
            >
              <component
                :is="item.icon"
                :size="14"
                :stroke-width="1.8"
                :class="[
                  'transition-colors duration-100',
                  route.path === item.to || (item.to !== `/${username}/agent` && route.path.startsWith(item.to))
                    ? 'text-[#121212]'
                    : 'text-[#6B6B6B] group-hover:text-[#121212]'
                ]"
              />
              <span
                :class="[
                  'unmodified-font-sans text-sm font-normal transition-colors duration-100',
                  route.path === item.to || (item.to !== `/${username}/agent` && route.path.startsWith(item.to))
                    ? 'text-[#121212]'
                    : 'text-[#6B6B6B] group-hover:text-[#121212]'
                ]"
              >
                {{ item.name }}
              </span>
            </NuxtLink>
          </SmoothCorners>
          <UIElementsNavTooltip :text="item.tooltip" />
        </div>
      </nav>
    </aside>

    <!-- MAIN CONTENT -->
    <section
      class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-[#E3E3E3] bg-[#FAFAFA]"
    >
      <section class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <NuxtPage />
      </section>
    </section>
  </main>
</template>