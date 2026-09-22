<script setup lang="ts">
import {
  Plug,
  ChevronLeft,
} from "@lucide/vue";

import { SmoothCorners } from "@lisse/vue";

import {
  INTEGRATIONS,
  type IntegrationProvider,
} from "@@/shared/integrations";

import { api } from "@@/convex/_generated/api";

definePageMeta({
  layout: "set",
});

const route = useRoute();

const username = route.params.username as string;

const slugName = route.params.slug as string;

const provider = slugName as IntegrationProvider;

const integration = INTEGRATIONS[provider];

if (!integration) {
  throw createError({
    statusCode: 404,
    statusMessage:
      "Integration not found.",
  });
}

useSeoMeta({
  title: `${integration.name} Integration`,
});

const convex = useConvexClient();

const isConnecting = ref(false);

const connectionError = ref<string | null>(null);

async function connectIntegration() {
  if (isConnecting.value) {
    return;
  }

  isConnecting.value = true;
  connectionError.value = null;

  try {
    const callbackUrl = new URL(window.location.origin);

    callbackUrl.pathname = `/${encodeURIComponent(username)}/settings/integrations/callback`;

    callbackUrl.searchParams.set(
      "provider",
      slugName,
    );

    const result =
      await convex.action(
        api.integrations.createConnection,
        {
          provider:slugName,
          callbackUrl: callbackUrl.toString(),
        },
      );

    if (
      !result?.redirectUrl
    ) {
      throw new Error(
        "Composio did not return a connection URL.",
      );
    }

    window.location.assign(
      result.redirectUrl,
    );
  } catch (error) {
    console.error(
      "Failed to start integration connection:",
      error,
    );

    connectionError.value =
      error instanceof Error
        ? error.message
        : "Failed to connect this integration.";

    isConnecting.value = false;
  }
}

const { data: connection } = useConvexQuery(api.integrationQueries.getConnection, { provider: slugName });

const isDisconnecting = ref(false);

const isConnected = computed(() => connection.value?.status === "connected");

async function disconnectIntegration() {
  if (isDisconnecting.value || !isConnected.value) return;

  if (!window.confirm(`Disconnect ${integration.name}?`)) return;

  isDisconnecting.value = true;

  try {
    await convex.action(api.integrations.disconnectConnection, { provider: slugName });
  } catch (error) {
    console.error("Failed to disconnect integration:", error);
  } finally {
    isDisconnecting.value = false;
  }
}

function goBack() {
  return navigateTo(
    `/${encodeURIComponent(username)}/settings/integrations`,
  );
}
</script>

<template>
  <div
    class="h-full w-full overflow-y-auto px-3 py-3"
  >
    <SmoothCorners
      as-child
      :corners="{
        radius: 999,
        smoothing: 0.6,
      }"
    >
      <button
        type="button"
        class="group flex items-center gap-x-1 px-1.5 py-0.75 font-sans text-xs text-[#5F5F5F] transition-colors duration-100 hover:bg-[#EBEBEB]"
        @click="goBack"
      >
        <ChevronLeft
          :size="15"
          :stroke-width="1.7"
        />

        <span>
          Back to integrations
        </span>
      </button>
    </SmoothCorners>

    <main
      class="mx-auto flex w-full max-w-175 flex-col gap-y-5 px-6 py-12 pb-16"
    >
      <header
        class="flex w-full"
      >
        <div
          class="flex w-full items-start gap-x-5"
        >
          <SmoothCorners
            :corners="{
              radius: 14,
              smoothing: 0.6,
            }"
            :middle-border="{
              width: 1,
              color: '#E3E3E3',
              opacity: 1,
            }"
          >
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center bg-white"
              style="
                box-shadow:
                  inset 0 0 0 1px #e3e3e3;
              "
            >
              <NuxtImg
                :src="integration.logo"
                :alt="`${integration.name} logo`"
                class="h-7 w-7 object-contain"
              />
            </div>
          </SmoothCorners>

          <div
            class="flex min-w-0 flex-col gap-y-1.5"
          >
            <h1
              class="unmodified-font-sans text-xl font-medium leading-6 text-[#121212]"
            >
              {{ integration.name }}
            </h1>

            <p
              class="max-w-120 font-sans text-sm leading-5 text-[#6B6B6B]"
            >
              {{ integration.shortDescription }}
            </p>
            <p v-if="isConnected" class="font-sans text-xs text-[#6B6B6B]">
              Connected
            </p>
          </div>
        </div>
      </header>

      <SmoothCorners
        :corners="{
          radius: 14,
          smoothing: 0.6,
        }"
        :middle-border="{
          width: 1,
          color: '#E3E3E3',
          opacity: 1,
        }"
        class="mt-8"
      >
        <section
          class="flex flex-col gap-y-4 bg-white p-4"
          style="
            box-shadow:
              inset 0 0 0 1px #e3e3e3;
          "
        >
          <p
            class="max-w-140 font-sans text-sm leading-5 text-[#5F5F5F]"
          >
            {{ integration.description }}
          </p>

          <p
            v-if="connectionError"
            class="font-sans text-xs leading-4 text-[#B42318]"
          >
            {{ connectionError }}
          </p>

          <div
            class="flex justify-end"
          >
            <SmoothCorners as-child :corners="{ radius: 999, smoothing: 0.6 }">
              <button
                v-if="isConnected"
                type="button"
                :disabled="isDisconnecting"
                class="group flex items-center gap-x-1.5 border border-[#E3E3E3] px-3 py-1.5 font-sans text-xs font-medium text-[#121212] transition-colors duration-150 hover:bg-[#EBEBEB] disabled:cursor-not-allowed disabled:opacity-60"
                @click="disconnectIntegration"
              >
                <span v-if="isDisconnecting">
                  <Loader />
                </span>
                <span v-else>Disconnect</span>
              </button>
            
              <button
                v-else
                type="button"
                :disabled="isConnecting"
                class="group flex items-center gap-x-1.5 bg-[#121212] px-3 py-1.5 unmodified-font-sans text-xs font-medium text-white transition-colors duration-150 hover:bg-[#2A2A2A] disabled:cursor-not-allowed disabled:opacity-60"
                @click="connectIntegration"
              >
                <Plug v-if="!isConnecting" :size="13" :stroke-width="1.8" />
                <div>
                  <span v-if="isConnecting">
                    <Loader />
                  </span>
                  <span v-else>Connect</span>
                </div>
              </button>
            </SmoothCorners>
          </div>
        </section>
      </SmoothCorners>
    </main>
  </div>
</template>