<script setup lang="ts">
import {
  Check,
  CircleAlert,
  LoaderCircle,
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

const route =
  useRoute();

const username =
  route.params.username as string;

const providerParam =
  typeof route.query.provider ===
  "string"
    ? route.query.provider
    : null;

const status =
  typeof route.query.status ===
  "string"
    ? route.query.status
    : null;

const connectedAccountId =
  typeof route.query
      .connected_account_id ===
    "string"
    ? route.query
        .connected_account_id
    : null;

const integration =
  providerParam
    ? INTEGRATIONS[
        providerParam as IntegrationProvider
      ]
    : undefined;

const convex =
  useConvexClient();

const state = ref<
  "processing" |
  "success" |
  "error"
>("processing");

const errorMessage =
  ref<string | null>(null);

function integrationPath() {
  if (
    providerParam &&
    integration
  ) {
    return `/${encodeURIComponent(username)}/settings/integrations/${encodeURIComponent(providerParam)}`;
  }

  return `/${encodeURIComponent(username)}/settings/integrations`;
}

async function completeConnection() {
  if (!providerParam) {
    state.value = "error";
    errorMessage.value =
      "No integration provider was returned.";
    return;
  }

  if (!integration) {
    state.value = "error";
    errorMessage.value =
      "The requested integration is not supported.";
    return;
  }

  if (status !== "success") {
    state.value = "error";
    errorMessage.value =
      "The integration connection was not completed.";
    return;
  }

  if (!connectedAccountId) {
    state.value = "error";
    errorMessage.value =
      "Composio did not return a connected account.";
    return;
  }

  try {
    await convex.action(
      api.integrations
        .completeConnection,
      {
        provider:
          providerParam,

        connectedAccountId,
      },
    );

    state.value = "success";

    await navigateTo(
      integrationPath(),
      {
        replace: true,
      },
    );
  } catch (error) {
    console.error(
      "Failed to complete integration connection:",
      error,
    );

    state.value = "error";

    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Failed to complete the integration connection.";
  }
}

onMounted(() => {
  void completeConnection();
});

useSeoMeta({
  title: "Connecting integration",
});
</script>

<template>
  <div
    class="flex h-full w-full items-center justify-center"
  >
    <div
      class="flex flex-col items-center gap-y-3 text-center"
    >
      <template
        v-if="state === 'processing'"
      >
        <LoaderCircle
          :size="20"
          :stroke-width="1.7"
          class="animate-spin text-[#6B6B6B]"
        />

        <p
          class="font-sans text-sm text-[#6B6B6B]"
        >
          Connecting your account…
        </p>
      </template>

      <template
        v-else-if="state === 'success'"
      >
        <SmoothCorners
          :corners="{
            radius: 999,
            smoothing: 0.6,
          }"
        >
          <div
            class="flex h-9 w-9 items-center justify-center bg-[#F3F3F3]"
          >
            <Check
              :size="17"
              :stroke-width="1.8"
              class="text-[#121212]"
            />
          </div>
        </SmoothCorners>

        <p
          class="font-sans text-sm text-[#6B6B6B]"
        >
          Integration connected.
        </p>
      </template>

      <template v-else>
        <SmoothCorners
          :corners="{
            radius: 999,
            smoothing: 0.6,
          }"
        >
          <div
            class="flex h-9 w-9 items-center justify-center bg-[#F3F3F3]"
          >
            <CircleAlert
              :size="17"
              :stroke-width="1.8"
              class="text-[#121212]"
            />
          </div>
        </SmoothCorners>

        <p
          class="max-w-80 font-sans text-sm leading-5 text-[#6B6B6B]"
        >
          {{ errorMessage }}
        </p>

        <button
          type="button"
          class="font-sans text-xs font-medium text-[#121212] underline underline-offset-2"
          @click="
            navigateTo(
              integrationPath(),
              { replace: true },
            )
          "
        >
          Return to integration
        </button>
      </template>
    </div>
  </div>
</template>