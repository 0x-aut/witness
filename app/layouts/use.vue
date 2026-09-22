<script setup lang="ts">
import { ref } from "vue";
import { SmoothCorners } from "@lisse/vue";
import {
  Inbox,
  FolderKey,
  Cloud,
  Vault,
  ChevronDown,
  SquarePen,
  Settings,
  Bot,
  BriefcaseBusiness,
  Trash2,
} from "@lucide/vue";
import { authClient } from "@@/lib/auth-client";
import { api } from "@@/convex/_generated/api";



const session = ref<Awaited<ReturnType<typeof authClient.getSession>>["data"]>(null);

const convex = useConvexClient();

onMounted(async () => {
  const result = await authClient.getSession();
  session.value = result.data;

  if (result.data?.user) {
      try {
        await convex.action(api.agentmails.actions.ensureInbox, {
          username: result.data.user.username,
        });
      } catch (error) {
        console.error("Failed to provision AgentMail inbox:", error);
      }
    }
});

const route = useRoute();

const username = route.params.username as string;

const { 
  mutate: deleteThread
} = useConvexMutation(
  api.agents.threads.remove,
)

const recentChatsQuery = useConvexQuery(
  api.agents.threads.list,
  {
    paginationOpts: {
      cursor: null,
      numItems: 5,
    },
  },
);

const recentChats = computed(
  () => recentChatsQuery.data.value?.page ?? [],
);


async function handleDeleteChat(
  event: MouseEvent,
  threadId: string,
) {
  event.preventDefault();
  event.stopPropagation();

  await deleteThread({ threadId });
  if (route.params.threadId === threadId) {
    await navigateTo(`/${username}/agent`)
  }
}


const navigation = [
  {
    name: "Inbox",
    to: `/${username}/inbox`,
    icon: Inbox,
    tooltip: "Review important messages and notifications related to your cases.",
  },
  {
    name: "Cases",
    to: `/${username}/cases`,
    icon: BriefcaseBusiness,
    tooltip: "Track the issues you're working to resolve.",
  },
  {
    name: "Agent",
    to: `/${username}/agent`,
    icon: Bot,
    tooltip: "Tell Witness what you need handled and let an agent do the work.",
  },
  {
    name: "Vault",
    to: `/${username}/vault`,
    icon: FolderKey,
    tooltip: "Store important documents, evidence, research, and case results.",
  },
];

const navbar = computed(() => {
  const path = route.path;
  const username = route.params.username as string;

  if (path.startsWith(`/${username}/inbox`)) {
    return {
      // label: "Inbox",
    };
  }

  if (path.startsWith(`/${username}/cases`)) {
    return {
      // label: "Cases",
    };
  }

  if (path.startsWith(`/${username}/agents`)) {
    return {
      label: "Agents",
      action: {
        label: "New agent",
        to: `/${username}/agents/new`,
        icon: Cloud,
      },
    };
  }

  if (path.startsWith(`/${username}/vault`)) {
    return {
      // label: "Vault",
    };
  }

  if (path.startsWith(`/${username}/settings`)) {
    return {
      label: "Settings",
    };
  }

  return {
    label: "Witness",
  };
});

const { unreadCount, } = useInbox();

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
          :corners="{ radius: 10 }"
        >
          <button
            type="button"
            class="flex items-center gap-x-1.25 rounded-[10px] px-1 py-1 transition-colors duration-100 hover:bg-[#EBEBEB]"
          >
            <SmoothCorners
              as-child
              :corners="{ radius: 7 }"
            >
              <div
                class="flex h-6 w-6 items-center justify-center bg-[#273BE2] p-0.5"
              >
                <span class="font-sans text-sm text-white">
                  {{ session?.user.displayUsername[0] }}
                </span>
              </div>
            </SmoothCorners>
            <div class="flex items-center gap-x-0.75">
              <span
                class="font-sans text-sm font-medium text-[#121212]"
              >
                {{ session?.user.displayUsername }}
              </span>
              <ChevronDown
                :size="15"
                color="#6B6B6B"
                :stroke-width="1.5"
              />
            </div>
          </button>
        </SmoothCorners>
        <!-- NEW AGENT -->
        <div class="relative group">
          <SmoothCorners
            as-child
            :corners="{ radius: 999 }"
            :middle-border="{
              width: 1,
              color: '#EBEBEB',
              opacity: 1
            }"
          >
            <button
              type="button"
              title="New agent"
              class="flex h-7 w-7 items-center justify-center rounded-full bg-white transition-all duration-150 hover:bg-[#EBEBEB]"
              @click="$router.push(`/${username}/agent`)"
            >
              <SquarePen
                :size="14"
                :stroke-width="1.7"
                class="text-[#6B6B6B] transition-colors duration-100 group-hover:text-[#121212]"
              />
            </button>
          </SmoothCorners>
          <UIElementsNavTooltip text="Create a new agent." />
        </div>
      </div>

      <!-- NAVIGATION -->
      <nav class="flex flex-col gap-y-0.5">
        <div
          v-for="item in navigation"
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
                'flex items-center gap-x-1.5 px-1.5 py-1 transition-colors duration-100',
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
              <div
                v-if="item.to == `/${username}/inbox` && unreadCount > 0"
                class="w-fit rounded-full h-2.75 pr-1.5 pl-1.5 pt-1 pb-1 flex items-center justify-center bg-[#121212]"
              >
                <span class="unmodified-font-sans text-xs font-normal text-white">{{ unreadCount }}</span>
              </div>
            </NuxtLink>
          </SmoothCorners>
          <UIElementsNavTooltip :text="item.tooltip" />
        </div>

        <GSAPTransition
          :hidden="{ opacity: 0, y: -6 }"
          :duration="0.25"
        >
          <div
            v-if="
              route.path.startsWith(`/${username}/agent`) &&
              recentChats.length
            "
            class="mt-4"
          >
            <div class="px-1.5 pb-1.5">
              <span class="unmodified-font-sans text-sm font-medium text-[#8A8A8A]">
                Recents
              </span>
            </div>
          
            <nav class="flex flex-col gap-y-0.5">
              <SmoothCorners
                v-for="chat in recentChats"
                :key="chat._id"
                as-child
                :corners="{ radius: 10, smoothing: 0.6 }"
              >
                <NuxtLink
                  :to="`/${username}/agent/${chat._id}`"
                  :class="[
                    'group flex w-full items-center justify-between gap-x-2 px-1.5 py-1 transition-colors',
                    route.params.threadId === chat._id
                      ? 'bg-[#E3E3E3] text-[#121212]'
                      : 'text-[#6B6B6B] hover:bg-[#EBEBEB] hover:text-[#121212]',
                  ]"
                >
                  <span class="min-w-0 flex-1 truncate text-sm">
                    {{ chat.title || "New chat" }}
                  </span>
                
                  <button
                    type="button"
                    aria-label="Delete chat"
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-[#DCDCDC]"
                    @click="handleDeleteChat($event, chat._id)"
                  >
                    <Trash2
                      :size="13"
                      :stroke-width="1.8"
                      class="text-[#777] hover:text-[#121212]"
                    />
                  </button>
                </NuxtLink>
              </SmoothCorners>
            </nav>
          </div>
        </GSAPTransition>
      </nav>

      <!-- SETTINGS -->
      <div class="mt-auto">
        <div class="relative group">
          <SmoothCorners
            as-child
            :corners="{ radius: 10, smoothing: 0.6 }"
          >
            <NuxtLink
              :to="`/${username}/settings`"
              :class="[
                'flex items-center gap-x-1.5 px-1.5 py-1 transition-colors duration-100',
                route.path === `/${username}/settings`
                  ? 'bg-[#E3E3E3]'
                  : 'hover:bg-[#EBEBEB]'
              ]"
            >
              <Settings
                :size="14"
                :stroke-width="1.8"
                :class="[
                  'transition-colors duration-100',
                  route.path === `/${username}/settings`
                    ? 'text-[#121212]'
                    : 'text-[#6B6B6B] group-hover:text-[#121212]'
                ]"
              />
              <span
                :class="[
                  'unmodified-font-sans text-sm transition-colors duration-100',
                  route.path === `/${username}/settings`
                    ? 'text-[#121212]'
                    : 'text-[#6B6B6B] group-hover:text-[#121212]'
                ]"
              >
                Settings
              </span>
            </NuxtLink>
          </SmoothCorners>
          <UIElementsNavTooltip text="Manage your Accord preferences." />
        </div>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <section
      class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-[#E3E3E3] bg-[#FAFAFA]"
    >
      <!-- MAIN NAVBAR -->
      <nav
        v-if="navbar.label"
        class="flex h-11 w-full shrink-0 items-center justify-between border-b border-[#E3E3E3] px-3"
      >
        <!-- LEFT SIDE -->
        <div class="flex min-w-0 items-center">
          <span
            class="unmodified-font-sans px-1.5 text-sm font-medium text-[#121212]"
          >
            {{ navbar.label }}
          </span>
        </div>

        <!-- RIGHT SIDE -->
        <div
          v-if="navbar.action"
          class="flex shrink-0 items-center"
        >
          <SmoothCorners
            as-child
            :corners="{ radius: 9, smoothing: 0.6 }"
          >
            <NuxtLink
              :to="navbar.action.to"
              class="group flex items-center gap-x-1.5 px-2 py-1 transition-colors duration-100 hover:bg-[#EBEBEB]"
            >
              <component
                :is="navbar.action.icon"
                :size="14"
                :stroke-width="1.7"
                class="text-[#6B6B6B] transition-colors duration-100 group-hover:text-[#121212]"
              />
              <span
                class="unmodified-font-sans text-sm font-medium text-[#5F5F5F] transition-colors duration-100 group-hover:text-[#121212]"
              >
                {{ navbar.action.label }}
              </span>
            </NuxtLink>
          </SmoothCorners>
        </div>
      </nav>

      <section class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <NuxtPage />
      </section>
    </section>
  </main>
</template>