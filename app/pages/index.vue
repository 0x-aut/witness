<script setup lang="ts">
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Inbox,
  Mail,
  Search,
  Sparkles,
} from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";
import { authClient } from "@@/lib/auth-client";

useSeoMeta({
  title: "Witness — Give the annoying stuff to someone else",
  description:
    "Witness is your personal AI Agent for getting real things done. Give it the emails, research, paperwork, refunds and problems you don't want to deal with.",
});

const prompt = ref("");

const examples = [
  "Get me the refund they owe me.",
  "Find out why my bill suddenly went up.",
  "Write to my landlord about the leak.",
  "Figure out what this letter actually means.",
];

const activeExample = ref(0);

const tasks = [
  {
    time: "8:42",
    text: "Reply to the email from the airline",
    status: "done",
  },
  {
    time: "9:10",
    text: "Find out what this charge on my card is",
    status: "working",
  },
  {
    time: "10:30",
    text: "Send the landlord another message",
    status: "waiting",
  },
  {
    time: "Later",
    text: "Deal with that insurance letter",
    status: "queued",
  },
];

const everydayThings = [
  "get the refund",
  "find a better deal",
  "reply to that email",
  "read the fine print",
  "cancel the subscription",
  "book the appointment",
  "fill out the form",
  "figure out what happened",
];

const capabilities = [
  {
    icon: Search,
    eyebrow: "LOOKS",
    title: "It figures things out.",
    text: "Witness can search, compare, read and investigate instead of making you open seventeen tabs.",
  },
  {
    icon: FileText,
    eyebrow: "DOES",
    title: "It gets into the details.",
    text: "Give it a document, a thread or a messy explanation. Witness keeps the useful context together.",
  },
  {
    icon: Mail,
    eyebrow: "TALKS",
    title: "It can deal with people too.",
    text: "Draft the message, follow up, keep the conversation attached to the problem and bring you back in when needed.",
  },
];

const goToApp = async () => {
  const { data } = await authClient.getSession();

  if (data?.user?.username) {
    await navigateTo(`/${data.user.username}/agent`);
    return;
  }

  await navigateTo("/login");
};

const cycleExample = () => {
  activeExample.value =
    (activeExample.value + 1) % examples.length;

  prompt.value = examples[activeExample.value];
};

const submitPrompt = async () => {
  if (!prompt.value.trim()) {
    cycleExample();
    return;
  }

  await goToApp();
};
</script>

<template>
  <div class="min-h-screen overflow-x-hidden bg-[#F5F3EE] text-[#171717]">
    <!-- NAV -->
    <header
      class="relative z-50 mx-auto flex max-w-[1420px] items-center justify-between px-6 py-6 sm:px-10 lg:px-14"
    >
      <NuxtLink
        to="/"
        class="flex items-center gap-x-2"
      >
        <div
          class="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#171717]"
        >
          <span
            class="font-sans text-[11px] font-semibold text-white"
          >
            W
          </span>
        </div>

        <span
          class="font-sans text-[15px] font-medium tracking-[-0.045em]"
        >
          Witness
        </span>
      </NuxtLink>

      <nav class="hidden items-center gap-x-8 md:flex">
        <a
          href="#why"
          class="font-sans text-[13px] text-[#77736D] transition-colors hover:text-[#171717]"
        >
          Why Witness
        </a>

        <a
          href="#how"
          class="font-sans text-[13px] text-[#77736D] transition-colors hover:text-[#171717]"
        >
          How it works
        </a>

        <button
          type="button"
          class="font-sans text-[13px] text-[#77736D] transition-colors hover:text-[#171717]"
          @click="goToApp"
        >
          Sign in
        </button>

        <SmoothCorners
          as-child
          :corners="{
            radius: 999,
            smoothing: 0.65,
          }"
        >
          <button
            type="button"
            class="flex items-center gap-x-1.5 bg-[#171717] px-4 py-2.5 text-white transition-transform duration-200 hover:-translate-y-px"
            @click="goToApp"
          >
            <span
              class="font-sans text-[13px] font-medium"
            >
              Get started
            </span>

            <ArrowUpRight
              :size="13"
              :stroke-width="1.7"
            />
          </button>
        </SmoothCorners>
      </nav>

      <button
        type="button"
        class="font-sans text-[12px] text-[#5E5A55] md:hidden"
        @click="goToApp"
      >
        Get started →
      </button>
    </header>

    <main>
      <!-- HERO -->
      <section
        class="relative mx-auto flex min-h-[calc(100svh-80px)] max-w-[1420px] flex-col px-6 pb-16 pt-12 sm:px-10 sm:pt-16 lg:px-14 lg:pt-20"
      >
        <div
          v-gsap.whenVisible.once.from="{
            opacity: 0,
            y: 18,
            duration: 0.7
          }"
          class="mb-10 flex items-center gap-x-3"
        >
          <span
            class="h-px w-8 bg-[#171717]"
          />

          <span
            class="font-sans text-[10px] font-medium uppercase tracking-[0.16em] text-[#77736D]"
          >
            Your personal Agent
          </span>
        </div>

        <div
          class="grid items-start gap-y-12 lg:grid-cols-[1.12fr_0.88fr] lg:gap-x-12"
        >
          <!-- HEADLINE -->
          <div>
            <h1
              v-gsap.splitText.words.once.from="{
                opacity: 0,
                y: 30,
                stagger: 0.045,
                duration: 0.75,
                ease: 'power3.out'
              }"
              class="max-w-[920px] font-display text-[clamp(4.4rem,9.5vw,9.4rem)] leading-[0.81] tracking-[-0.07em]"
            >
              You have enough
              <span class="italic">
                to think about.
              </span>
            </h1>

            <p
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                y: 20
              }"
              class="mt-9 max-w-[620px] font-sans text-[18px] leading-7 tracking-[-0.025em] text-[#5E5A55] sm:text-[20px]"
            >
              Give Witness the things that have been sitting in the back of
              your mind. It can work through them while you get on with your
              day.
            </p>

            <div
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                y: 20
              }"
              class="mt-8 flex items-center gap-x-3"
            >
              <SmoothCorners
                as-child
                :corners="{
                  radius: 999,
                  smoothing: 0.65,
                }"
              >
                <button
                  type="button"
                  class="flex items-center gap-x-2 bg-[#171717] px-5 py-3 text-white"
                  @click="goToApp"
                >
                  <span
                    class="font-sans text-[13px] font-medium"
                  >
                    Give Witness something to do
                  </span>

                  <ArrowRight
                    :size="14"
                    :stroke-width="1.7"
                  />
                </button>
              </SmoothCorners>

              <span
                class="hidden font-sans text-[11px] text-[#97918A] sm:block"
              >
                You don't need to know how to ask.
              </span>
            </div>
          </div>

          <!-- HUMAN LIST -->
          <div
            v-gsap.whenVisible.once.from="{
              opacity: 0,
              y: 35,
              rotate: 2,
              duration: 0.9
            }"
            class="relative pt-4 lg:pt-24"
          >
            <div
              class="absolute right-10 top-2 hidden h-28 w-28 rounded-full bg-[#E7B4C6]/40 blur-3xl sm:block"
            />

            <div
              class="absolute bottom-0 left-8 hidden h-36 w-36 rounded-full bg-[#BFC0E7]/35 blur-3xl sm:block"
            />

            <div
              class="relative rotate-[1deg] border-y border-[#CFC9BF] bg-[#F8F6F1] px-5 py-6 sm:px-7 sm:py-7"
            >
              <div
                class="flex items-center justify-between"
              >
                <span
                  class="font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-[#8A847D]"
                >
                  Things I keep meaning to do
                </span>

                <span
                  class="font-display text-[15px] italic text-[#9C968D]"
                >
                  this week
                </span>
              </div>

              <div
                class="mt-8"
              >
                <div
                  v-for="(task, index) in tasks"
                  :key="task.text"
                  class="relative flex items-start gap-x-4 border-b border-[#DDD7CD] py-4 last:border-0"
                >
                  <div
                    class="flex h-5 w-5 shrink-0 items-center justify-center"
                  >
                    <Check
                      v-if="task.status === 'done'"
                      :size="14"
                      :stroke-width="1.8"
                      class="text-[#6D7E6D]"
                    />

                    <div
                      v-else-if="task.status === 'working'"
                      class="h-2.5 w-2.5 animate-pulse rounded-full bg-[#B49B6B]"
                    />

                    <div
                      v-else
                      class="h-2.5 w-2.5 rounded-full border border-[#C4BEB5]"
                    />
                  </div>

                  <div class="min-w-0">
                    <span
                      class="font-sans text-[9px] uppercase tracking-[0.1em] text-[#A29C94]"
                    >
                      {{ task.time }}
                    </span>

                    <p
                      :class="[
                        'mt-1 font-sans text-[13px] leading-5',
                        task.status === 'done'
                          ? 'text-[#99938B] line-through decoration-[#BDB7AE]'
                          : 'text-[#45413D]'
                      ]"
                    >
                      {{ task.text }}
                    </p>
                  </div>

                  <span
                    v-if="task.status === 'working'"
                    class="ml-auto shrink-0 pt-4 font-sans text-[9px] text-[#A29C94]"
                  >
                    Witness
                  </span>
                </div>
              </div>

              <div
                class="mt-5 flex items-center justify-between border-t border-[#DDD7CD] pt-5"
              >
                <span
                  class="font-sans text-[10px] text-[#928C84]"
                >
                  You don't have to do all of this yourself.
                </span>

                <Sparkles
                  :size="15"
                  :stroke-width="1.5"
                  class="text-[#8F8981]"
                />
              </div>
            </div>

            <div
              v-gsap.parallax.slower-2
              class="absolute -bottom-9 -right-2 rotate-[-5deg] bg-[#171717] px-5 py-3.5 text-white shadow-xl sm:right-[-18px]"
            >
              <span
                class="font-display text-[17px] italic tracking-[-0.03em]"
              >
                let someone else deal with it.
              </span>
            </div>
          </div>
        </div>

        <!-- PROMPT -->
        <div
          v-gsap.whenVisible.once.from="{
            opacity: 0,
            y: 25
          }"
          class="mt-auto pt-20"
        >
          <div
            class="flex max-w-[860px] flex-col gap-y-3"
          >
            <div
              class="flex items-center justify-between"
            >
              <span
                class="font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-[#8F8981]"
              >
                Try it
              </span>

              <button
                type="button"
                class="font-sans text-[10px] text-[#959089] underline underline-offset-4 transition-colors hover:text-[#171717]"
                @click="cycleExample"
              >
                Give me an idea
              </button>
            </div>

            <SmoothCorners
              as-child
              :corners="{
                radius: 14,
                smoothing: 0.7,
              }"
            >
              <div
                class="flex items-center border border-[#D7D1C8] bg-[#FBFAF7] px-4 py-3.5 transition-colors focus-within:border-[#AFA9A0]"
              >
                <input
                  v-model="prompt"
                  type="text"
                  :placeholder="examples[activeExample]"
                  class="min-w-0 flex-1 bg-transparent px-1 font-sans text-[14px] outline-none placeholder:text-[#AAA49C]"
                  @keydown.enter="submitPrompt"
                />

                <button
                  type="button"
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#171717] text-white transition-transform duration-200 hover:scale-105"
                  @click="submitPrompt"
                >
                  <ArrowRight
                    :size="14"
                    :stroke-width="1.7"
                  />
                </button>
              </div>
            </SmoothCorners>
          </div>
        </div>

        <div
          class="absolute bottom-12 right-8 hidden flex-col items-center gap-y-1 lg:flex"
        >
          <ChevronDown
            :size="14"
            :stroke-width="1.5"
            class="text-[#A19B93]"
          />

          <span
            class="font-sans text-[9px] uppercase tracking-[0.17em] text-[#A19B93]"
          >
            See what happens
          </span>
        </div>
      </section>

      <!-- HUMAN TRUTH -->
      <section
        id="why"
        class="border-y border-[#D8D2C8] bg-[#EAE6DE]"
      >
        <div
          class="mx-auto grid max-w-[1420px] gap-16 px-6 py-24 sm:px-10 sm:py-32 lg:grid-cols-[0.85fr_1.15fr] lg:px-14"
        >
          <div>
            <span
              class="font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-[#858078]"
            >
              We all have these
            </span>

            <h2
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                y: 25
              }"
              class="mt-7 max-w-[550px] font-display text-[clamp(3.3rem,5.5vw,5.8rem)] leading-[0.86] tracking-[-0.06em]"
            >
              The little things
              <span class="italic">
                take up too much space.
              </span>
            </h2>
          </div>

          <div
            class="flex flex-col justify-end"
          >
            <p
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                x: 24
              }"
              class="max-w-[680px] font-sans text-[18px] leading-7 tracking-[-0.02em] text-[#56514B] sm:text-[21px]"
            >
              Not because they're hard. Because every one of them asks you to
              stop what you're doing, remember something, find something,
              write something, wait for someone and then remember to follow up.
            </p>

            <div
              class="mt-10 flex max-w-[720px] flex-wrap gap-x-7 gap-y-4"
            >
              <span
                v-for="thing in everydayThings"
                :key="thing"
                class="font-display text-[25px] italic leading-none tracking-[-0.035em] text-[#79736B] sm:text-[30px]"
              >
                {{ thing }}
              </span>
            </div>

            <div
              class="mt-12 h-px w-full bg-[#C8C1B7]"
            />

            <p
              class="mt-5 max-w-[560px] font-sans text-[12px] leading-5 text-[#837D75]"
            >
              Witness exists for that space between “I should probably deal
              with this” and actually dealing with it.
            </p>
          </div>
        </div>
      </section>

      <!-- ONE SENTENCE -->
      <section
        class="mx-auto max-w-[1420px] px-6 py-28 sm:px-10 sm:py-36 lg:px-14"
      >
        <div
          class="relative"
        >
          <div
            class="pointer-events-none absolute -left-5 top-[-65px] font-display text-[11rem] leading-none tracking-[-0.12em] text-[#E6E1D8] sm:text-[15rem]"
          >
            “
          </div>

          <p
            v-gsap.splitText.words.once.from="{
              opacity: 0,
              y: 25,
              stagger: 0.05
            }"
            class="relative max-w-[1120px] font-display text-[clamp(3.4rem,7vw,7.4rem)] leading-[0.9] tracking-[-0.065em]"
          >
            “Can you just
            <span class="italic">
              deal with this
            </span>
            for me?”
          </p>

          <div
            class="mt-8 flex items-center gap-x-3"
          >
            <span
              class="h-px w-8 bg-[#171717]"
            />

            <span
              class="font-sans text-[11px] text-[#8A847C]"
            >
              That's basically the whole idea.
            </span>
          </div>
        </div>
      </section>

      <!-- HOW -->
      <section
        id="how"
        class="bg-[#171717] text-[#F6F2EA]"
      >
        <div
          class="mx-auto max-w-[1420px] px-6 py-24 sm:px-10 sm:py-32 lg:px-14"
        >
          <div
            class="max-w-[760px]"
          >
            <span
              class="font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-[#9A958D]"
            >
              How Witness works
            </span>

            <h2
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                y: 26
              }"
              class="mt-7 font-display text-[clamp(3.5rem,6vw,6.5rem)] leading-[0.84] tracking-[-0.06em]"
            >
              You don't manage
              <span class="italic text-[#A9A39B]">
                the Agent.
              </span>
              You give it a job.
            </h2>
          </div>

          <div
            class="mt-20 border-t border-white/15"
          >
            <article
              v-for="(item, index) in [
                {
                  n: '01',
                  title: 'Tell it what happened.',
                  text: 'A sentence is enough. Add a document or an email when it helps. You can be messy.'
                },
                {
                  n: '02',
                  title: 'Let it work.',
                  text: 'Witness can research, read, compare, write, use connected tools and keep track of what is happening.'
                },
                {
                  n: '03',
                  title: 'Hear from it when it matters.',
                  text: 'When a real decision belongs to you, Witness stops. You answer. Then it continues.'
                }
              ]"
              :key="item.n"
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                y: 25
              }"
              class="grid gap-8 border-b border-white/15 py-10 sm:grid-cols-[90px_1fr] sm:py-14"
            >
              <span
                class="font-display text-[28px] italic text-[#77716A]"
              >
                {{ item.n }}
              </span>

              <div>
                <h3
                  class="font-display text-[clamp(2.3rem,4vw,4.4rem)] leading-[0.9] tracking-[-0.05em]"
                >
                  {{ item.title }}
                </h3>

                <p
                  class="mt-5 max-w-[650px] font-sans text-[14px] leading-6 text-[#A8A29A]"
                >
                  {{ item.text }}
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- A DAY -->
      <section
        class="mx-auto max-w-[1420px] px-6 py-28 sm:px-10 sm:py-36 lg:px-14"
      >
        <div
          class="grid gap-16 lg:grid-cols-[0.72fr_1.28fr]"
        >
          <div>
            <span
              class="font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-[#8D8780]"
            >
              A normal day
            </span>

            <h2
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                y: 25
              }"
              class="mt-7 max-w-[500px] font-display text-[clamp(3.3rem,5.3vw,5.7rem)] leading-[0.86] tracking-[-0.06em]"
            >
              You keep
              <span class="italic">
                moving.
              </span>
            </h2>

            <p
              class="mt-7 max-w-[430px] font-sans text-[14px] leading-6 text-[#77716A]"
            >
              Witness keeps an eye on the things you handed off.
            </p>
          </div>

          <div
            v-gsap.whenVisible.once.from="{
              opacity: 0,
              x: 30
            }"
            class="relative border-y border-[#CFC9BF]"
          >
            <div
              class="absolute bottom-8 left-[17px] top-8 w-px bg-[#D8D2C8]"
            />

            <div
              class="relative"
            >
              <div
                v-for="(event, index) in [
                  {
                    time: '09:04',
                    label: 'Witness',
                    title: 'Found the airline refund policy.',
                    text: 'Your booking qualifies. I found the original confirmation too.'
                  },
                  {
                    time: '11:32',
                    label: 'Witness',
                    title: 'Sent the follow-up you approved.',
                    text: 'The airline has the booking details and your request.'
                  },
                  {
                    time: '14:18',
                    label: 'Witness',
                    title: 'Found something important.',
                    text: 'Your insurance letter has an appeal deadline in five days.'
                  },
                  {
                    time: '15:02',
                    label: 'You',
                    title: 'One thing needs you.',
                    text: 'Open Witness when you have a minute. The rest can wait.'
                  }
                ]"
                :key="event.time"
                class="relative flex gap-x-7 border-b border-[#D7D1C7] py-8 last:border-b-0"
              >
                <div
                  class="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center bg-[#F5F3EE]"
                >
                  <div
                    :class="[
                      'h-2.5 w-2.5 rounded-full',
                      index === 3
                        ? 'bg-[#171717]'
                        : 'border border-[#A59F97] bg-[#F5F3EE]'
                    ]"
                  />
                </div>

                <div>
                  <div
                    class="flex items-center gap-x-2.5"
                  >
                    <span
                      class="font-sans text-[10px] uppercase tracking-[0.1em] text-[#9D978F]"
                    >
                      {{ event.time }}
                    </span>

                    <span
                      class="font-sans text-[10px] font-medium uppercase tracking-[0.1em]"
                      :class="
                        index === 3
                          ? 'text-[#171717]'
                          : 'text-[#9D978F]'
                      "
                    >
                      {{ event.label }}
                    </span>
                  </div>

                  <h3
                    class="mt-2 font-display text-[23px] leading-none tracking-[-0.035em]"
                  >
                    {{ event.title }}
                  </h3>

                  <p
                    class="mt-2 max-w-[550px] font-sans text-[12px] leading-5 text-[#77716A]"
                  >
                    {{ event.text }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SERIOUS PROBLEMS -->
      <section
        class="border-y border-[#D8D2C8] bg-[#EAE6DE]"
      >
        <div
          class="mx-auto max-w-[1420px] px-6 py-24 sm:px-10 sm:py-32 lg:px-14"
        >
          <div
            class="grid gap-16 lg:grid-cols-[1.1fr_0.9fr]"
          >
            <div>
              <span
                class="font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-[#858078]"
              >
                And then there are the big ones
              </span>

              <h2
                v-gsap.whenVisible.once.from="{
                  opacity: 0,
                  y: 28
                }"
                class="mt-7 max-w-[820px] font-display text-[clamp(3.5rem,6.7vw,7rem)] leading-[0.83] tracking-[-0.065em]"
              >
                When the annoying thing
                becomes a
                <span class="italic">
                  real problem.
                </span>
              </h2>
            </div>

            <div
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                x: 28
              }"
              class="flex flex-col justify-end"
            >
              <p
                class="max-w-[500px] font-sans text-[15px] leading-6 text-[#625D56]"
              >
                Insurance denials. Property problems. Billing disputes.
                Government forms. Travel claims. The things where you need more
                than a quick answer.
              </p>

              <div
                class="mt-9 flex flex-col gap-y-3"
              >
                <div
                  v-for="item in [
                    'Insurance',
                    'Property & landlords',
                    'Bills & payments',
                    'Travel & refunds',
                    'Government & paperwork'
                  ]"
                  :key="item"
                  class="flex items-center gap-x-3 border-b border-[#D0C9BE] pb-3"
                >
                  <Check
                    :size="14"
                    :stroke-width="1.6"
                    class="text-[#77716A]"
                  />

                  <span
                    class="font-sans text-[13px] text-[#5D5851]"
                  >
                    {{ item }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- INBOX -->
      <section
        class="mx-auto max-w-[1420px] px-6 py-28 sm:px-10 sm:py-36 lg:px-14"
      >
        <div
          class="grid items-center gap-16 lg:grid-cols-[0.8fr_1.2fr]"
        >
          <div>
            <span
              class="font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-[#8D8780]"
            >
              You still get the important bits
            </span>

            <h2
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                y: 25
              }"
              class="mt-7 max-w-[560px] font-display text-[clamp(3.3rem,5.5vw,5.8rem)] leading-[0.85] tracking-[-0.06em]"
            >
              Your Agent doesn't
              <span class="italic">
                disappear
              </span>
              into the background.
            </h2>

            <p
              class="mt-7 max-w-[500px] font-sans text-[14px] leading-6 text-[#77716A]"
            >
              When someone replies, when a deadline matters or when a decision
              belongs to you, Witness brings it into your Inbox.
            </p>
          </div>

          <div
            v-gsap.whenVisible.once.from="{
              opacity: 0,
              x: 28,
              rotate: 1
            }"
            class="border-y border-[#CFC9BF] bg-[#F8F6F1]"
          >
            <div
              class="flex items-center justify-between border-b border-[#DDD7CD] px-5 py-4 sm:px-6"
            >
              <div
                class="flex items-center gap-x-2"
              >
                <Inbox
                  :size="14"
                  :stroke-width="1.6"
                  class="text-[#716B64]"
                />

                <span
                  class="font-sans text-[10px] font-medium uppercase tracking-[0.13em]"
                >
                  Inbox
                </span>
              </div>

              <span
                class="font-sans text-[9px] text-[#9C968D]"
              >
                1 needs you
              </span>
            </div>

            <div
              class="px-5 sm:px-6"
            >
              <div
                class="border-b border-[#DDD7CD] py-7"
              >
                <div
                  class="flex items-start justify-between gap-x-6"
                >
                  <div>
                    <span
                      class="font-sans text-[9px] uppercase tracking-[0.12em] text-[#99928A]"
                    >
                      Airline
                    </span>

                    <h3
                      class="mt-1.5 font-display text-[28px] leading-none tracking-[-0.04em]"
                    >
                      They finally replied.
                    </h3>
                  </div>

                  <Mail
                    :size="16"
                    :stroke-width="1.5"
                    class="mt-1 text-[#827C74]"
                  />
                </div>

                <p
                  class="mt-5 max-w-[520px] font-sans text-[12px] leading-5 text-[#6F6962]"
                >
                  “We can process the refund once the passenger confirms...”
                </p>
              </div>

              <div
                class="py-7"
              >
                <div
                  class="flex items-center gap-x-2"
                >
                  <Sparkles
                    :size="13"
                    :stroke-width="1.6"
                  />

                  <span
                    class="font-sans text-[9px] font-medium uppercase tracking-[0.13em] text-[#858078]"
                  >
                    Witness already drafted the reply
                  </span>
                </div>

                <p
                  class="mt-3 max-w-[520px] font-sans text-[12px] leading-5 text-[#6F6962]"
                >
                  Everything is ready. You just need to look at it before it
                  gets sent.
                </p>

                <button
                  type="button"
                  class="mt-5 flex items-center gap-x-2 font-sans text-[11px] font-medium text-[#171717]"
                  @click="goToApp"
                >
                  Review reply

                  <ArrowRight
                    :size="13"
                    :stroke-width="1.7"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- FINAL -->
      <section
        class="relative overflow-hidden bg-[#DCD8F0]"
      >
        <div
          class="absolute -right-20 top-[-80px] h-[380px] w-[380px] rounded-full bg-[#F6B0D3]/50 blur-3xl"
        />

        <div
          class="absolute bottom-[-100px] left-[-80px] h-[340px] w-[340px] rounded-full bg-[#B8D4E8]/55 blur-3xl"
        />

        <div
          class="relative mx-auto max-w-[1420px] px-6 py-28 sm:px-10 sm:py-36 lg:px-14"
        >
          <span
            class="font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-[#777284]"
          >
            Start small
          </span>

          <h2
            v-gsap.whenVisible.once.from="{
              opacity: 0,
              y: 30
            }"
            class="mt-7 max-w-[1000px] font-display text-[clamp(4rem,8.8vw,9rem)] leading-[0.82] tracking-[-0.07em]"
          >
            Give Witness the thing
            you've been
            <span class="italic">
              putting off.
            </span>
          </h2>

          <div
            class="mt-10 flex flex-col items-start gap-y-4 sm:flex-row sm:items-center sm:gap-x-5"
          >
            <SmoothCorners
              as-child
              :corners="{
                radius: 999,
                smoothing: 0.65,
              }"
            >
              <button
                type="button"
                class="flex items-center gap-x-2 bg-[#171717] px-5 py-3.5 text-white transition-transform duration-200 hover:-translate-y-px"
                @click="goToApp"
              >
                <span
                  class="font-sans text-[13px] font-medium"
                >
                  Start with Witness
                </span>

                <ArrowRight
                  :size="15"
                  :stroke-width="1.7"
                />
              </button>
            </SmoothCorners>

            <span
              class="font-sans text-[11px] text-[#777284]"
            >
              The email. The refund. The thing.
            </span>
          </div>
        </div>
      </section>
    </main>

    <!-- FOOTER -->
    <footer class="bg-[#171717] text-[#F5F2EB]">
      <div
        class="mx-auto flex max-w-[1420px] flex-col gap-8 px-6 py-9 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14"
      >
        <div class="flex items-center gap-x-2">
          <div
            class="flex h-7 w-7 items-center justify-center rounded-[8px] bg-white"
          >
            <span
              class="font-sans text-[11px] font-semibold text-[#171717]"
            >
              W
            </span>
          </div>

          <span
            class="font-sans text-[14px] font-medium tracking-[-0.03em]"
          >
            Witness
          </span>
        </div>

        <div class="flex items-center gap-x-6">
          <a
            href="#why"
            class="font-sans text-[11px] text-white/40 transition-colors hover:text-white"
          >
            Why Witness
          </a>

          <a
            href="#how"
            class="font-sans text-[11px] text-white/40 transition-colors hover:text-white"
          >
            How it works
          </a>

          <button
            type="button"
            class="font-sans text-[11px] text-white/40 transition-colors hover:text-white"
            @click="goToApp"
          >
            Get started
          </button>
        </div>

        <span
          class="font-sans text-[10px] text-white/25"
        >
          Give it the thing.
        </span>
      </div>
    </footer>
  </div>
</template>