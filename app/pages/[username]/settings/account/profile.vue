<script setup lang="ts">
import {
  AtSign,
  Check,
  CircleUserRound,
  LoaderCircle,
  LogOut,
} from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";

import { authClient } from "@@/lib/auth-client";

definePageMeta({
  layout: "set",
});

useSeoMeta({
  title: "Profile",
});

const route = useRoute();

const session = ref<
  Awaited<ReturnType<typeof authClient.getSession>>["data"]
>(null);

const sessionPending = ref(true);

const uservalue = computed(
  () => session.value?.user ?? null,
);

const name = ref("");
const username = ref("");

const originalName = ref("");
const originalUsername = ref("");

const saving = ref(false);
const loggingOut = ref(false);

const saveState = ref<"idle" | "saved" | "error">("idle");
const errorMessage = ref("");

const hydrated = ref(false);

const dirty = computed(() => {
  return (
    name.value.trim() !== originalName.value ||
    username.value.trim() !== originalUsername.value
  );
});

const firstLetter = computed(() => {
  const value =
    name.value.trim() ||
    uservalue.value?.name?.trim() ||
    uservalue.value?.username?.trim() ||
    uservalue.value?.email?.trim() ||
    "U";

  return value.charAt(0).toUpperCase();
});

const nameError = computed(() => {
  const value = name.value.trim();

  if (!value) {
    return "Full name is required.";
  }

  if (value.length > 80) {
    return "Full name must be 80 characters or less.";
  }

  return "";
});

const usernameError = computed(() => {
  const value = username.value.trim();

  if (!value) {
    return "Username is required.";
  }

  if (value.length < 3) {
    return "Username must be at least 3 characters.";
  }

  if (value.length > 30) {
    return "Username must be 30 characters or less.";
  }

  if (!/^[a-zA-Z0-9_.]+$/.test(value)) {
    return "Use only letters, numbers, underscores, and periods.";
  }

  return "";
});

async function loadSession() {
  sessionPending.value = true;

  try {
    const result = await authClient.getSession();

    session.value = result.data;

    const user = result.data?.user;

    if (user && !hydrated.value) {
      name.value = user.name ?? "";
      username.value = user.username ?? "";

      originalName.value = user.name ?? "";
      originalUsername.value = user.username ?? "";

      hydrated.value = true;
    }
  } catch (error) {
    saveState.value = "error";

    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Unable to load your profile.";
  } finally {
    sessionPending.value = false;
  }
}

async function saveProfile() {
  if (!uservalue.value || saving.value || !dirty.value) {
    return;
  }

  if (nameError.value) {
    saveState.value = "error";
    errorMessage.value = nameError.value;
    return;
  }

  if (usernameError.value) {
    saveState.value = "error";
    errorMessage.value = usernameError.value;
    return;
  }

  const nextName = name.value.trim();
  const nextUsername = username.value.trim();

  saving.value = true;
  saveState.value = "idle";
  errorMessage.value = "";

  try {
    if (nextUsername !== originalUsername.value) {
      const {
        data: availability,
        error: availabilityError,
      } = await authClient.isUsernameAvailable({
        username: nextUsername,
      });

      if (availabilityError) {
        throw new Error(
          availabilityError.message ||
            "Unable to check username availability.",
        );
      }

      if (!availability?.available) {
        throw new Error(
          "That username is already taken.",
        );
      }
    }

    const { error } =
      await authClient.updateUser({
        name: nextName,
        username: nextUsername,
      });

    if (error) {
      throw new Error(
        error.message ||
          "Unable to save your profile.",
      );
    }

    originalName.value = nextName;
    originalUsername.value = nextUsername;

    /*
     * Refresh our local session so the layout/avatar/etc.
     * immediately reflects the updated Better Auth user.
     */
    const refreshed = await authClient.getSession();

    session.value = refreshed.data;

    saveState.value = "saved";

    const currentRouteUsername =
      route.params.username as string;

    if (nextUsername !== currentRouteUsername) {
      await navigateTo(
        `/${nextUsername}/settings/account/profile`,
        {
          replace: true,
        },
      );

      return;
    }

    window.setTimeout(() => {
      if (!saving.value) {
        saveState.value = "idle";
      }
    }, 1800);
  } catch (error) {
    saveState.value = "error";

    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Something went wrong while saving your profile.";
  } finally {
    saving.value = false;
  }
}

async function logout() {
  if (loggingOut.value) return;

  loggingOut.value = true;

  try {
    const { error } = await authClient.signOut();

    if (error) {
      throw new Error(
        error.message || "Unable to log out.",
      );
    }

    await navigateTo("/", {
      replace: true,
    });
  } catch (error) {
    loggingOut.value = false;

    saveState.value = "error";

    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Unable to log out.";
  }
}

onMounted(loadSession);

watch(
  [name, username],
  () => {
    if (saveState.value !== "idle") {
      saveState.value = "idle";
      errorMessage.value = "";
    }
  },
);
</script>
<template>
  <div class="h-full w-full overflow-y-auto">
    <div
      class="mx-auto flex min-h-full w-full max-w-175 flex-col gap-y-8 px-6 py-12"
    >
      <!-- HEADER -->
      <header>
        <h1
          class="font-sans text-2xl font-medium tracking-[-0.025em] text-[#121212]"
        >
          Profile
        </h1>

        <p
          class="mt-1.5 max-w-130 font-sans text-sm leading-5 text-[#6B6B6B]"
        >
          View and edit details about your account
        </p>
      </header>

      <!-- PROFILE -->
      <SmoothCorners
        as-child
        :corners="{
          radius: 15,
          smoothing: 0.6,
        }"
        :middleborder="{
          width: 1,
          color: '#E3E3E3',
          opacity: 1,
        }"
      >
        <div class="flex w-full flex-col overflow-hidden bg-white">
          <!-- PROFILE -->
          <div
            class="flex min-h-20 items-center justify-between px-4 py-3.5"
          >
            <div class="flex items-center gap-x-2.5">
              <SmoothCorners
                as-child
                :corners="{
                  radius: 12,
                  smoothing: 0.6,
                }"
              >
                <div
                  class="flex h-10 w-10 items-center justify-center bg-[#F0F0F0]"
                >
                  <span
                    class="font-sans text-sm font-semibold text-[#575757]"
                  >
                    {{ firstLetter }}
                  </span>
                </div>
              </SmoothCorners>

              <div>
                <span
                  class="unmodified-font-sans text-sm font-medium text-[#121212]"
                >
                  Profile picture
                </span>

                <p
                  class="mt-0.5 font-sans text-xs text-[#8A8A8A]"
                >
                  Your profile is represented by the first letter of your name.
                </p>
              </div>
            </div>
          </div>

          <div class="h-px w-full bg-[#EEEEEE]" />

          <!-- EMAIL -->
          <div
            class="flex min-h-20 items-center justify-between gap-x-6 px-4 py-3.5"
          >
            <div class="flex items-center gap-x-2.5">
              <div
                class="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3F3F3]"
              >
                <CircleUserRound
                  :size="14"
                  :stroke-width="1.7"
                  class="text-[#777777]"
                />
              </div>

              <div>
                <span
                  class="unmodified-font-sans text-sm font-medium text-[#121212]"
                >
                  Email
                </span>

                <p
                  class="mt-0.5 font-sans text-xs text-[#8A8A8A]"
                >
                  Used to sign in to your account
                </p>
              </div>
            </div>

            <span
              class="max-w-65 truncate font-sans text-sm text-[#555555]"
            >
              {{ uservalue?.email || "—" }}
            </span>
          </div>

          <div class="h-px w-full bg-[#EEEEEE]" />

          <!-- FULL NAME -->
          <div
            class="flex min-h-20 items-center justify-between gap-x-6 px-4 py-3.5"
          >
            <div class="flex min-w-0 items-center gap-x-2.5">
              <div
                class="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3F3F3]"
              >
                <CircleUserRound
                  :size="14"
                  :stroke-width="1.7"
                  class="text-[#777777]"
                />
              </div>

              <div>
                <span
                  class="unmodified-font-sans text-sm font-medium text-[#121212]"
                >
                  Full name
                </span>

                <p
                  class="mt-0.5 font-sans text-xs text-[#8A8A8A]"
                >
                  Your name shown across Witness
                </p>
              </div>
            </div>

            <SmoothCorners
              as-child
              :corners="{
                radius: 9,
                smoothing: 0.6,
              }"
            >
              <input
                v-model="name"
                type="text"
                autocomplete="name"
                maxlength="80"
                placeholder="Your full name"
                class="h-9 w-64 border border-[#E1E1E1] bg-[#FAFAFA] px-3 font-sans text-sm text-[#121212] outline-none transition-colors placeholder:text-[#A2A2A2] focus:border-[#BDBDBD] focus:bg-white"
              />
            </SmoothCorners>
          </div>

          <div class="h-px w-full bg-[#EEEEEE]" />

          <!-- USERNAME -->
          <div
            class="flex min-h-20 items-center justify-between gap-x-6 px-4 py-3.5"
          >
            <div class="flex min-w-0 items-center gap-x-2.5">
              <div
                class="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3F3F3]"
              >
                <AtSign
                  :size="14"
                  :stroke-width="1.7"
                  class="text-[#777777]"
                />
              </div>

              <div>
                <span
                  class="unmodified-font-sans text-sm font-medium text-[#121212]"
                >
                  Username
                </span>

                <p
                  class="mt-0.5 font-sans text-xs text-[#8A8A8A]"
                >
                  Your unique Witness handle
                </p>
              </div>
            </div>

            <SmoothCorners
              as-child
              :corners="{
                radius: 9,
                smoothing: 0.6,
              }"
            >
              <div
                class="flex h-9 w-64 items-center border border-[#E1E1E1] bg-[#FAFAFA] px-3 focus-within:border-[#BDBDBD] focus-within:bg-white"
              >
                <span
                  class="mr-0.5 font-sans text-sm text-[#8A8A8A]"
                >
                  @
                </span>

                <input
                  v-model="username"
                  type="text"
                  autocomplete="username"
                  autocapitalize="none"
                  spellcheck="false"
                  maxlength="30"
                  placeholder="username"
                  class="min-w-0 flex-1 bg-transparent font-sans text-sm text-[#121212] outline-none placeholder:text-[#A2A2A2]"
                />
              </div>
            </SmoothCorners>
          </div>

          <!-- SAVE -->
          <div
            class="flex items-center justify-between gap-x-4 border-t border-[#EEEEEE] bg-[#FCFCFC] px-4 py-3"
          >
            <div class="min-w-0">
              <span
                v-if="errorMessage"
                class="font-sans text-xs text-[#A34D4D]"
              >
                {{ errorMessage }}
              </span>

              <div
                v-else-if="saveState === 'saved'"
                class="flex items-center gap-x-1.5"
              >
                <Check
                  :size="14"
                  :stroke-width="1.8"
                  class="text-[#4B7A58]"
                />

                <span
                  class="font-sans text-xs text-[#5D735F]"
                >
                  Your changes have been saved.
                </span>
              </div>

              <span
                v-else-if="dirty"
                class="font-sans text-xs text-[#8A8A8A]"
              >
                You have unsaved changes.
              </span>
            </div>

            <SmoothCorners
              as-child
              :corners="{
                radius: 999,
                smoothing: 0.6,
              }"
            >
              <button
                type="button"
                :disabled="
                  !dirty ||
                  saving ||
                  sessionPending ||
                  !!nameError ||
                  !!usernameError
                "
                class="flex h-9 min-w-25 items-center justify-center gap-x-1.5 bg-[#121212] px-3.5 transition-opacity duration-100 disabled:cursor-not-allowed disabled:opacity-30"
                @click="saveProfile"
              >
                <LoaderCircle
                  v-if="saving"
                  :size="14"
                  :stroke-width="1.8"
                  class="animate-spin text-white"
                />

                <Check
                  v-else-if="saveState === 'saved'"
                  :size="14"
                  :stroke-width="1.8"
                  class="text-white"
                />

                <span
                  class="unmodified-font-sans text-xs font-medium text-white"
                >
                  {{
                    saving
                      ? "Saving"
                      : saveState === "saved"
                        ? "Saved"
                        : "Save changes"
                  }}
                </span>
              </button>
            </SmoothCorners>
          </div>
        </div>
      </SmoothCorners>

      <!-- LOGOUT -->
      <SmoothCorners
        as-child
        :corners="{
          radius: 15,
          smoothing: 0.6,
        }"
        :middleborder="{
          width: 1,
          color: '#E3E3E3',
          opacity: 1,
        }"
      >
        <div
          class="flex min-h-17 w-full items-center justify-between gap-x-6 bg-white px-4 py-3"
        >
          <div>
            <span
              class="unmodified-font-sans text-sm font-medium text-[#121212]"
            >
              Log out of your account
            </span>

            <p
              class="mt-0.5 font-sans text-xs text-[#8A8A8A]"
            >
              End your current Witness session on this device.
            </p>
          </div>

          <SmoothCorners
            as-child
            :corners="{
              radius: 999,
              smoothing: 0.6,
            }"
          >
            <button
              type="button"
              :disabled="loggingOut"
              class="flex h-9 shrink-0 items-center gap-x-1.5 bg-[#121212] px-3.5 transition-opacity duration-100 disabled:cursor-not-allowed disabled:opacity-50"
              @click="logout"
            >
              <LoaderCircle
                v-if="loggingOut"
                :size="14"
                :stroke-width="1.8"
                class="animate-spin text-white"
              />

              <LogOut
                v-else
                :size="14"
                :stroke-width="1.8"
                class="text-white"
              />

              <span
                class="unmodified-font-sans text-xs font-medium text-white"
              >
                {{ loggingOut ? "Logging out" : "Log out" }}
              </span>
            </button>
          </SmoothCorners>
        </div>
      </SmoothCorners>
    </div>
  </div>
</template>