<script setup lang="ts">
import { computed } from "vue";
import { FolderOpen } from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";
import { api } from "@@/convex/_generated/api";

definePageMeta({
  layout: "use",
});

useSeoMeta({
  title: "Vault"
})

const route = useRoute();

const username = computed(() =>
  String(route.params.username),
);

const vaultQuery = useConvexQuery(
  api.vault.list,
  {},
);

const cases = computed(
  () => vaultQuery.data.value ?? [],
);

const isLoading = computed(
  () => vaultQuery.data.value === undefined,
);
</script>

<template>
  <div class="mx-auto w-full max-w-[1180px] px-8 pb-24 pt-9">
    <!-- HEADER -->
    <header class="mb-10">
      <div class="flex items-center gap-x-2">
        <SmoothCorners
          as-child
          :corners="{
            radius: 10,
            smoothing: 0.65,
          }"
        >
          <div
            class="flex h-8 w-8 items-center justify-center bg-[#EEEEEE]"
          >
            <FolderOpen
              :size="16"
              :stroke-width="1.7"
              class="text-black/50"
            />
          </div>
        </SmoothCorners>

        <div>
          <h1
            class="text-[22px] font-medium tracking-[-0.025em] text-[#151515]"
          >
            Vault
          </h1>

          <p
            class="mt-0.5 text-sm text-black/35"
          >
            Documents, evidence and research from your cases.
          </p>
        </div>
      </div>
    </header>

    <!-- LOADING -->
    <div
      v-if="isLoading"
      class="flex min-h-60 items-center justify-center"
    >
      <Loader color="#111111" />
    </div>

    <!-- EMPTY -->
    <div
      v-else-if="!cases.length"
      class="flex min-h-[420px] flex-col items-center justify-center text-center"
    >
      <SmoothCorners
        as-child
        :corners="{
          radius: 14,
          smoothing: 0.65,
        }"
      >
        <div
          class="flex h-12 w-12 items-center justify-center bg-[#F0F0F0]"
        >
          <FolderOpen
            :size="21"
            :stroke-width="1.5"
            class="text-black/30"
          />
        </div>
      </SmoothCorners>

      <p
        class="mt-4 text-sm font-medium text-black/50"
      >
        Your Vault is empty.
      </p>

      <p
        class="mt-1 max-w-sm text-xs leading-5 text-black/30"
      >
        Documents and saved websites will appear here as Witness works on your cases.
      </p>
    </div>

    <!-- CASES -->
    <div
      v-else
      class="divide-y divide-[#EEEEEE]"
    >
      <div
        v-for="item in cases"
        :key="item.caseData._id"
        class="py-7 first:pt-0 last:pb-0"
      >
        <UIAppsVaultCaseRow
          :case-data="item.caseData"
          :documents="item.documents"
          :websites="item.websites"
          :username="username"
        />
      </div>
    </div>
  </div>
</template>