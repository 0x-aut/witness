<script setup lang="ts">
import { api } from "@@/convex/_generated/api";
import { Trash2 } from "@lucide/dev";

definePageMeta({
  layout: "use",
});

const route = useRoute();

const username = route.params.username as string;

const { 
  mutate: removeCase
} = useConvexMutation(
  api.cases.remove.remove,
);

async function deleteCase(id: string) {
  if (!window.confirm("Delete this case?")) {
    return;
  }

  await removeCase({ id });
}

const casesQuery = useConvexQuery(
  api.cases.list.list,
  {},
);

const cases = computed(
  () => casesQuery.data.value ?? [],
);

function openCase(id: string) {
  navigateTo(`/${username}/cases/${id}`);
}

useSeoMeta({
  title: "Cases",
});
</script>

<template>
  <div class="mx-auto w-full max-w-300 px-0 py-0 flex flex-col">
    <nav
      class="flex h-11 w-full shrink-0 items-center justify-between border-b border-[#E3E3E3] px-3"
     >
        <!-- LEFT SIDE -->
      <div class="flex min-w-0 items-center">
        <span
          class="unmodified-font-sans px-1.5 text-sm font-medium text-[#121212]"
        >
          Cases
        </span>
      </div>
    </nav>

    <div class="w-full h-full px-3 py-3">
      <GSAPTransition
        v-if="cases.length"
        group
        :stagger="0.05"
        :hidden="{ opacity: 0, y: 10 }"
        :duration="0.3"
      >
        <div
          class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3"
        >
          <UIElementsCaseCard
            v-for="caseItem in cases"
            :key="caseItem._id"
            :case-item="caseItem"
            @click="openCase(caseItem._id)"
            @delete="deleteCase(caseItem._id)"
          />
        </div>
      </GSAPTransition>
  
      <div
        v-else-if="casesQuery.isPending.value"
        class="flex min-h-60 items-center justify-center text-sm text-[#888]"
      >
        Loading cases…
      </div>
  
      <div
        v-else
        class="flex min-h-60 flex-col items-center justify-center text-center"
      >
        <p class="text-sm font-medium text-[#555]">
          No cases yet
        </p>
  
        <p class="mt-1 max-w-sm text-sm text-[#999]">
          Tell Witness what went wrong to create your first case.
        </p>
      </div>
    </div>
  </div>
</template>