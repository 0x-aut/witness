<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Share2,
} from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";

import { authClient } from "@@/lib/auth-client";
import { api } from "@@/convex/_generated/api";
import type { Id } from "@@/convex/_generated/dataModel";

definePageMeta({
  layout: "use",
});

const route = useRoute();
const router = useRouter();

const username = computed(() => String(route.params.username));
const caseId = computed(() => route.params.id as Id<"cases">);

const { data: session } = await authClient.getSession();

const caseQuery = useConvexQuery(
  api.cases.get.get,
  computed(() => ({
    id: caseId.value,
  })),
);

const { mutate: updateCase } = useConvexMutation(
  api.cases.update.update,
);

/*
 * Supports the current Case response shape as well as the expanded
 * response we're using for Agent / activity data.
 */
const queryData = computed(() => caseQuery.data.value as any);

const caseData = computed(() => {
  if (!queryData.value) return null;

  return queryData.value.caseData ?? queryData.value;
});

const agent = computed(() => queryData.value?.agent ?? null);
const thread = computed(() => queryData.value?.thread ?? null);
const activities = computed(() => queryData.value?.activities ?? []);

/*
 * Users will eventually come directly from the Case participants data.
 * For now the Case owner is the authenticated user.
 */
const caseUsers = computed(() => {
  const users = queryData.value?.users;

  if (Array.isArray(users) && users.length) {
    return users;
  }

  return [
    {
      id: session?.user.id ?? "current-user",
      displayUsername:
        session?.user.displayUsername ||
        session?.user.name ||
        username.value,
    },
  ];
});

const caseUserCount = computed(() => caseUsers.value.length);

const title = ref("");
const summary = ref("");

const statusMenuOpen = ref(false);
const savingTitle = ref(false);
const savingSummary = ref(false);

const statusOptions = [
  {
    value: "active",
    label: "Active",
  },
  {
    value: "waiting_user",
    label: "Waiting for you",
  },
  {
    value: "resolved",
    label: "Resolved",
  },
  {
    value: "archived",
    label: "Archived",
  },
] as const;

const statusLabel = computed(() => {
  return (
    statusOptions.find(
      option => option.value === caseData.value?.status,
    )?.label ?? "Active"
  );
});

watch(
  caseData,
  value => {
    if (!value) return;

    title.value = value.title;
    summary.value = value.summary ?? "";
  },
  {
    immediate: true,
  },
);

useSeoMeta({
  title: () => {
    const caseTitle = caseData.value?.title;

    return caseTitle
      ? `${caseTitle} · Witness`
      : "Case · Witness";
  },
});

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

function formatActivityDate(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

async function saveTitle() {
  if (!caseData.value) return;

  const nextTitle = title.value.trim();

  if (!nextTitle) {
    title.value = caseData.value.title;
    return;
  }

  if (nextTitle === caseData.value.title) return;

  savingTitle.value = true;

  try {
    await updateCase({
      id: caseId.value,
      title: nextTitle,
    });
  } finally {
    savingTitle.value = false;
  }
}

async function saveSummary() {
  if (!caseData.value) return;

  const nextSummary = summary.value.trim();

  if (nextSummary === (caseData.value.summary ?? "")) {
    return;
  }

  savingSummary.value = true;

  try {
    await updateCase({
      id: caseId.value,
      summary: nextSummary || undefined,
    });
  } finally {
    savingSummary.value = false;
  }
}

async function changeStatus(
  status:
    | "active"
    | "waiting_user"
    | "resolved"
    | "archived",
) {
  statusMenuOpen.value = false;

  if (!caseData.value) return;

  if (caseData.value.status === status) {
    return;
  }

  await updateCase({
    id: caseId.value,
    status,
  });
}

function goBack() {
  router.push(`/${username.value}/cases`);
}

function openConversation() {
  if (!thread.value?.externalThreadId) return;

  router.push(
    `/${username.value}/agent/${thread.value.externalThreadId}`,
  );
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <!-- LOADING -->
    <div
      v-if="caseQuery.data.value === undefined"
      class="flex h-full items-center justify-center"
    >
      <Loader color="#111111" />
    </div>

    <!-- NOT FOUND -->
    <div
      v-else-if="caseQuery.data.value === null"
      class="flex h-full flex-col items-center justify-center"
    >
      <p class="text-sm text-black/40">
        Case not found.
      </p>

      <button
        type="button"
        class="mt-4 text-sm font-medium text-black/55 transition-colors hover:text-black"
        @click="goBack"
      >
        Back to Cases
      </button>
    </div>

    <!-- CASE -->
    <div
      v-else-if="caseData"
      class="mx-auto grid w-full max-w-[1280px] grid-cols-[minmax(0,1fr)_280px] gap-x-16 px-8 pb-28 pt-7"
    >
      <!-- MAIN -->
      <main class="min-w-0">
        <!-- Back to Cases -->
        <button
          type="button"
          class="group mb-11 inline-flex items-center gap-x-1.5 rounded-full px-2 py-1.5 text-sm text-black/42 transition-colors duration-150 hover:bg-black/[0.035] hover:text-black"
          @click="goBack"
        >
          <ArrowLeft
            :size="15"
            :stroke-width="1.8"
            class="transition-transform duration-200 group-hover:-translate-x-0.5"
          />
      
          <span>
            Back to Cases
          </span>
        </button>
      
        <!-- TITLE -->
        <header class="mb-12">
          <input
            v-model="title"
            type="text"
            aria-label="Case title"
            class="block w-full max-w-4xl bg-transparent p-0 text-[42px] font-medium leading-[1.06] tracking-[-0.045em] text-[#111111] outline-none placeholder:text-black/20"
            placeholder="Untitled case"
            @blur="saveTitle"
            @keydown.enter.prevent="saveTitle"
          />
      
          <textarea
            v-model="summary"
            rows="2"
            aria-label="Case summary"
            class="mt-4 block w-full max-w-3xl resize-none bg-transparent p-0 text-[17px] leading-7 tracking-[-0.012em] text-black/45 outline-none placeholder:text-black/20"
            placeholder="Add a short description of what this case is about..."
            @blur="saveSummary"
          />
      
          <div
            v-if="savingTitle || savingSummary"
            class="mt-2 text-[11px] text-black/25"
          >
            Saving…
          </div>
        </header>
      
        <!-- DOCUMENT -->
        <UIAppsCaseDocument
          :case-id="caseId"
          :fallback-text="caseData.originalPrompt"
        />
      </main>

      <!-- RIGHT RAIL -->
      <aside class="pt-[82px]">
        <div class="space-y-4">
          <!-- STATUS -->
          <SmoothCorners
            as-child
            :corners="{
              radius: 13,
              smoothing: 0.65,
            }"
          >
            <section
              class="bg-[#F1F1F1] p-3"
            >
              <div class="relative">
                <SmoothCorners
                  as-child
                  :corners="{
                    radius: 10,
                    smoothing: 0.65,
                  }"
                >
                  <button
                    type="button"
                    class="flex w-full items-center justify-between bg-white px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[#F8F8F8]"
                    @click="statusMenuOpen = !statusMenuOpen"
                  >
                    <span
                      class="text-sm font-medium text-[#171717]"
                    >
                      {{ statusLabel }}
                    </span>

                    <ChevronDown
                      :size="15"
                      :stroke-width="1.7"
                      class="text-black/35 transition-transform duration-150"
                      :class="{
                        'rotate-180': statusMenuOpen,
                      }"
                    />
                  </button>
                </SmoothCorners>

                <SmoothCorners
                  v-if="statusMenuOpen"
                  as-child
                  :corners="{
                    radius: 10,
                    smoothing: 0.65,
                  }"
                >
                  <div
                    class="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden bg-white p-1 shadow-[0_14px_35px_rgba(0,0,0,0.09)]"
                  >
                    <button
                      v-for="option in statusOptions"
                      :key="option.value"
                      type="button"
                      class="flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-sm text-black/60 transition-colors hover:bg-black/[0.035] hover:text-black"
                      @click="changeStatus(option.value)"
                    >
                      <span>
                        {{ option.label }}
                      </span>

                      <Check
                        v-if="
                          option.value ===
                          caseData.status
                        "
                        :size="14"
                        :stroke-width="1.8"
                        class="text-black/45"
                      />
                    </button>
                  </div>
                </SmoothCorners>
              </div>

              <!-- META -->
              <div class="mt-2.5 space-y-0.5">
                <div class="px-2 py-2">
                  <p class="text-[11px] text-black/32">
                    Category
                  </p>

                  <p class="mt-0.5 text-sm text-black/65">
                    {{ caseData.category || "General" }}
                  </p>
                </div>

                <div class="px-2 py-2">
                  <p class="text-[11px] text-black/32">
                    Created
                  </p>

                  <p class="mt-0.5 text-sm text-black/65">
                    {{ formatDate(caseData._creationTime) }}
                  </p>
                </div>

                <div class="px-2 py-2">
                  <p class="text-[11px] text-black/32">
                    Updated
                  </p>

                  <p class="mt-0.5 text-sm text-black/65">
                    {{ formatDate(caseData.updatedAt) }}
                  </p>
                </div>
              </div>
            </section>
          </SmoothCorners>

          <!-- AGENT -->
          <SmoothCorners
            as-child
            :corners="{
              radius: 13,
              smoothing: 0.65,
            }"
          >
            <section
              class="bg-[#F1F1F1] p-3"
            >
              <div
                class="flex items-center justify-between px-1"
              >
                <span
                  class="text-xs font-medium text-black/35"
                >
                  Agent
                </span>

                <span
                  v-if="agent"
                  class="text-[11px] text-black/28"
                >
                  {{ agent.status }}
                </span>
              </div>

              <div
                v-if="agent"
                class="mt-3 px-1"
              >
                <p
                  class="text-sm font-medium text-black/78"
                >
                  {{ agent.name }}
                </p>

                <p
                  v-if="agent.task"
                  class="mt-1 text-xs leading-5 text-black/42"
                >
                  {{ agent.task }}
                </p>

                <button
                  v-if="thread?.externalThreadId"
                  type="button"
                  class="group mt-3.5 inline-flex items-center gap-x-1.5 text-xs font-medium text-black/45 transition-colors hover:text-black"
                  @click="openConversation"
                >
                  Open conversation

                  <ArrowUpRight
                    :size="13"
                    :stroke-width="1.8"
                    class="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </button>
              </div>

              <p
                v-else
                class="mt-3 px-1 text-sm text-black/30"
              >
                No agent attached yet.
              </p>
            </section>
          </SmoothCorners>

          <!-- USERS -->
          <SmoothCorners
            as-child
            :corners="{
              radius: 13,
              smoothing: 0.65,
            }"
          >
            <section
              class="bg-[#F1F1F1] p-3"
            >
              <div
                class="flex items-center justify-between px-1"
              >
                <div
                  class="flex items-center gap-x-1.5"
                >
                  <span
                    class="text-xs font-medium text-black/35"
                  >
                    Users
                  </span>

                  <span
                    class="text-xs text-black/28"
                  >
                    {{ caseUserCount }}
                  </span>
                </div>

                <button
                  type="button"
                  class="group inline-flex items-center gap-x-1.5 text-xs font-medium text-black/42 transition-colors hover:text-black"
                >
                  <Share2
                    :size="13"
                    :stroke-width="1.8"
                    class="transition-transform duration-150 group-hover:scale-[1.04]"
                  />

                  <span>
                    Share
                  </span>
                </button>
              </div>

              <div
                class="mt-3 flex items-center justify-between px-1"
              >
                <!-- USER STACK -->
                <div class="flex items-center">
                  <SmoothCorners
                    v-for="(user, index) in caseUsers"
                    :key="user.id"
                    as-child
                    :corners="{
                      radius: 7,
                      smoothing: 0.65,
                    }"
                  >
                    <div
                      class="relative flex h-6 w-6 shrink-0 items-center justify-center border-2 border-[#F1F1F1] bg-[#273BE2] text-white"
                      :style="{
                        marginLeft:
                          index === 0
                            ? '0'
                            : '-6px',
                        zIndex:
                          caseUsers.length - index,
                      }"
                      :title="user.displayUsername"
                    >
                      <span
                        class="font-sans text-sm leading-none"
                      >
                        {{
                          user.displayUsername
                            ?.charAt(0)
                            .toUpperCase()
                        }}
                      </span>
                    </div>
                  </SmoothCorners>
                </div>

                <span
                  class="text-[11px] text-black/30"
                >
                  {{
                    caseUserCount === 1
                      ? "1 person"
                      : `${caseUserCount} people`
                  }}
                </span>
              </div>
            </section>
          </SmoothCorners>
        </div>
      </aside>
    </div>
  </div>
</template>