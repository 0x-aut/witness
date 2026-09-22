<script setup lang="ts">
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  FileText,
  Globe2,
  Inbox,
  Mail,
  Scale,
  Sparkles,
} from "@lucide/vue";
import { SmoothCorners } from "@lisse/vue";
import { authClient } from "@@/lib/auth-client";

useSeoMeta({
  title: "Witness — Get bureaucracy off your back",
  description:
    "Witness uses AI Agents to help you navigate insurance, billing, property, government, and other bureaucratic problems.",
  ogTitle: "Witness — Get bureaucracy off your back",
  ogDescription:
    "Tell Witness what happened. Your Agent investigates, handles the work, and comes back when you need to decide something.",
});

const prompt = ref("");

const examples = [
  "My insurance denied my claim.",
  "My landlord is ignoring the repair request.",
  "I was charged twice for something.",
  "The airline owes me a refund.",
];

const activeExample = ref(0);

const useCases = [
  {
    number: "01",
    title: "Insurance",
    text: "Appeals, denied claims, missing reimbursements, endless requests for the same documents.",
  },
  {
    number: "02",
    title: "Property",
    text: "Repairs, deposits, notices, management companies, landlords and the paperwork between them.",
  },
  {
    number: "03",
    title: "Money",
    text: "Billing disputes, duplicate charges, refunds, account issues and the companies that make you prove everything twice.",
  },
  {
    number: "04",
    title: "Government",
    text: "Complaints, reports, forms and official processes that are somehow still designed around paper.",
  },
  {
    number: "05",
    title: "Travel",
    text: "Airline refunds, cancellations, baggage claims and the correspondence that never seems to end.",
  },
  {
    number: "06",
    title: "Everything else",
    text: "When the problem is complicated, repetitive, inconvenient or simply shouldn't have become your problem.",
  },
];

const steps = [
  {
    number: "01",
    eyebrow: "Tell it once",
    title: "Start with the mess.",
    text: "Write what happened in whatever words make sense. Upload the document. Give Witness the thread.",
  },
  {
    number: "02",
    eyebrow: "Let it work",
    title: "Your Agent takes it from there.",
    text: "It researches, reads documents, checks connected services, drafts correspondence and keeps the Case together.",
  },
  {
    number: "03",
    eyebrow: "Come back when it matters",
    title: "You stay in control.",
    text: "When a decision, document or approval is genuinely needed, Witness brings it back to you.",
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

const useExample = (example: string) => {
  prompt.value = example;
};

const cycleExample = () => {
  activeExample.value =
    (activeExample.value + 1) % examples.length;

  prompt.value = examples[activeExample.value];
};

const handlePrompt = async () => {
  if (!prompt.value.trim()) {
    cycleExample();
    return;
  }

  await goToApp();
};
</script>

<template>
  <div class="min-h-screen overflow-x-hidden bg-[#F3F1EB] text-[#121212]">
    <!-- NAV -->
    <header
      class="relative z-50 mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-6 sm:px-10 lg:px-14"
    >
      <NuxtLink
        to="/"
        class="group flex items-center gap-x-2"
      >
        <div
          class="flex h-7 w-7 items-center justify-center bg-[#121212]"
        >
          <span
            class="font-display text-[15px] text-white"
          >
            W
          </span>
        </div>

        <span
          class="font-sans text-[15px] font-semibold tracking-[-0.04em]"
        >
          Witness
        </span>
      </NuxtLink>

      <nav class="hidden items-center gap-x-7 md:flex">
        <a
          href="#how-it-works"
          class="font-sans text-[13px] text-[#66625C] transition-colors hover:text-[#121212]"
        >
          How it works
        </a>

        <a
          href="#problems"
          class="font-sans text-[13px] text-[#66625C] transition-colors hover:text-[#121212]"
        >
          What it handles
        </a>

        <button
          type="button"
          class="font-sans text-[13px] text-[#66625C] transition-colors hover:text-[#121212]"
          @click="goToApp"
        >
          Sign in
        </button>

        <SmoothCorners
          as-child
          :corners="{ radius: 999, smoothing: 0.6 }"
        >
          <button
            type="button"
            class="flex items-center gap-x-1.5 bg-[#121212] px-4 py-2.5 text-white transition-transform duration-200 hover:-translate-y-px"
            @click="goToApp"
          >
            <span
              class="font-sans text-[13px] font-medium"
            >
              Get started
            </span>

            <ArrowUpRight
              :size="13"
              :stroke-width="1.8"
            />
          </button>
        </SmoothCorners>
      </nav>

      <SmoothCorners
        as-child
        :corners="{ radius: 999, smoothing: 0.6 }"
      >
        <button
          type="button"
          class="flex items-center gap-x-1.5 border border-[#D7D4CC] bg-[#F8F7F2] px-3.5 py-2 text-[#121212] md:hidden"
          @click="goToApp"
        >
          <span
            class="font-sans text-[12px] font-medium"
          >
            Get started
          </span>

          <ArrowUpRight
            :size="13"
            :stroke-width="1.8"
          />
        </button>
      </SmoothCorners>
    </header>

    <!-- HERO -->
    <main>
      <section
        class="relative mx-auto flex min-h-[calc(100svh-80px)] w-full max-w-[1440px] flex-col px-6 pb-20 pt-14 sm:px-10 sm:pt-20 lg:px-14 lg:pt-24"
      >
        <!-- tiny editorial label -->
        <div
          v-gsap.whenVisible.once.from="{
            opacity: 0,
            y: 14
          }"
          class="mb-10 flex items-center gap-x-3 sm:mb-14"
        >
          <span
            class="h-px w-7 bg-[#121212]"
          />

          <span
            class="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-[#68645D]"
          >
            An agent for the real world
          </span>
        </div>

        <div
          v-gsap.timeline
          class="relative max-w-[1180px]"
        >
          <div
            v-gsap.add.from="{
              opacity: 0,
              y: 40
            }"
          >
            <h1
              class="max-w-[1100px] font-display text-[clamp(4rem,9.7vw,9.7rem)] leading-[0.82] tracking-[-0.065em] text-[#111111]"
            >
              Bureaucracy
              <span class="relative inline-block italic">
                shouldn't
              </span>
              <span class="block">
                be your job.
              </span>
            </h1>
          </div>

          <div
            v-gsap.add.from="{
              opacity: 0,
              y: 24
            }"
            class="mt-10 flex max-w-[630px] flex-col gap-y-3 sm:mt-12"
          >
            <p
              class="font-sans text-[17px] leading-7 tracking-[-0.025em] text-[#56524D] sm:text-[19px]"
            >
              Witness gives you an AI Agent that can investigate the problem,
              handle the paperwork, deal with the other side, and bring you
              back in when something actually needs you.
            </p>

            <p
              class="font-sans text-[12px] leading-5 text-[#88837B]"
            >
              Insurance. Property. Billing. Government. Travel. And the
              hundred annoying things nobody teaches you how to solve.
            </p>
          </div>
        </div>

        <!-- LIVE PROMPT -->
        <div
          v-gsap.whenVisible.once.from="{
            opacity: 0,
            y: 30
          }"
          class="mt-auto pt-20 sm:pt-28"
        >
          <div
            class="relative max-w-[920px]"
          >
            <div
              class="mb-3 flex items-center justify-between"
            >
              <span
                class="font-sans text-[11px] uppercase tracking-[0.16em] text-[#817D75]"
              >
                Tell Witness what happened
              </span>

              <span
                class="hidden font-sans text-[11px] text-[#A19D95] sm:block"
              >
                No perfect prompt required.
              </span>
            </div>

            <SmoothCorners
              as-child
              :corners="{
                radius: 16,
                smoothing: 0.72
              }"
            >
              <div
                class="group relative overflow-hidden border border-[#CFCBC2] bg-[#FAF9F5] transition-colors duration-300 focus-within:border-[#A39E94]"
              >
                <textarea
                  v-model="prompt"
                  rows="3"
                  :placeholder="examples[activeExample]"
                  class="block min-h-[118px] w-full resize-none bg-transparent px-5 pb-16 pt-5 font-sans text-[16px] leading-6 tracking-[-0.025em] text-[#151515] outline-none placeholder:text-[#9A968E]"
                  @keydown.meta.enter.prevent="handlePrompt"
                  @keydown.ctrl.enter.prevent="handlePrompt"
                />

                <div
                  class="absolute bottom-3.5 left-4 right-4 flex items-center justify-between gap-x-3"
                >
                  <button
                    type="button"
                    class="flex items-center gap-x-1.5 text-[#88837B] transition-colors hover:text-[#121212]"
                    @click="cycleExample"
                  >
                    <Sparkles
                      :size="13"
                      :stroke-width="1.7"
                    />

                    <span
                      class="font-sans text-[11px]"
                    >
                      Give me an example
                    </span>
                  </button>

                  <SmoothCorners
                    as-child
                    :corners="{
                      radius: 999,
                      smoothing: 0.62
                    }"
                  >
                    <button
                      type="button"
                      class="flex items-center gap-x-2 bg-[#121212] px-4 py-2.5 text-white transition-transform duration-200 hover:translate-x-px"
                      @click="handlePrompt"
                    >
                      <span
                        class="font-sans text-[12px] font-medium"
                      >
                        Let Witness handle it
                      </span>

                      <ArrowRight
                        :size="14"
                        :stroke-width="1.8"
                      />
                    </button>
                  </SmoothCorners>
                </div>
              </div>
            </SmoothCorners>

            <div
              class="mt-4 flex flex-wrap gap-x-4 gap-y-2"
            >
              <button
                v-for="example in examples"
                :key="example"
                type="button"
                class="font-sans text-[11px] text-[#8A857C] underline decoration-[#C9C4BA] underline-offset-4 transition-colors hover:text-[#121212]"
                @click="useExample(example)"
              >
                {{ example }}
              </button>
            </div>
          </div>
        </div>

        <!-- corner marker -->
        <div
          class="absolute bottom-16 right-7 hidden flex-col items-end gap-y-1 lg:flex"
        >
          <span
            class="font-sans text-[10px] uppercase tracking-[0.17em] text-[#9A968E]"
          >
            Scroll
          </span>

          <ChevronDown
            :size="14"
            :stroke-width="1.5"
            class="text-[#9A968E]"
          />
        </div>
      </section>

      <!-- STATEMENT STRIP -->
      <section
        class="overflow-hidden border-y border-[#D8D4CB] bg-[#121212] py-5 text-[#F4F1EA]"
      >
        <div
          class="flex w-max items-center gap-x-10 whitespace-nowrap"
          v-gsap.infinitely.to="{
            xPercent: -12,
            duration: 22,
            ease: 'none'
          }"
        >
          <span
            v-for="index in 8"
            :key="index"
            class="flex items-center gap-x-10"
          >
            <span
              class="font-display text-[25px] italic tracking-[-0.045em] sm:text-[31px]"
            >
              You shouldn't have to become an expert
            </span>

            <span
              class="h-1.5 w-1.5 rounded-full bg-[#F4F1EA]"
            />
          </span>
        </div>
      </section>

      <!-- THE PROBLEM -->
      <section
        id="problems"
        class="relative mx-auto w-full max-w-[1440px] px-6 py-28 sm:px-10 sm:py-36 lg:px-14"
      >
        <div
          class="grid grid-cols-1 gap-16 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20"
        >
          <div>
            <div
              class="flex items-center gap-x-3"
            >
              <span
                class="font-sans text-[11px] font-medium tracking-[0.14em] text-[#8B867D]"
              >
                THE PROBLEM
              </span>

              <span
                class="h-px w-8 bg-[#B8B3AA]"
              />
            </div>

            <h2
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                y: 26
              }"
              class="mt-9 max-w-[440px] font-display text-[clamp(3.2rem,5vw,5.5rem)] leading-[0.88] tracking-[-0.055em]"
            >
              The system is
              <span class="italic">
                built
              </span>
              around making you chase it.
            </h2>
          </div>

          <div
            v-gsap.whenVisible.once.from="{
              opacity: 0,
              x: 30
            }"
            class="flex flex-col justify-end"
          >
            <p
              class="max-w-[690px] font-sans text-[22px] leading-[1.42] tracking-[-0.035em] text-[#3C3935] sm:text-[28px]"
            >
              A denial letter. A billing error. A repair that never gets
              fixed. A refund everyone agrees you deserve but nobody actually
              sends.
            </p>

            <div
              class="mt-12 grid grid-cols-1 border-t border-[#CFCBC2] sm:grid-cols-3"
            >
              <div
                v-for="(item, index) in [
                  ['Read', 'the fine print'],
                  ['Call', 'the right department'],
                  ['Prove', 'it again'],
                ]"
                :key="item[0]"
                class="flex min-h-28 flex-col justify-center border-b border-[#CFCBC2] py-5 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0"
              >
                <span
                  class="font-display text-[28px] tracking-[-0.04em]"
                >
                  {{ item[0] }}
                </span>

                <span
                  class="mt-1 font-sans text-[12px] text-[#858078]"
                >
                  {{ item[1] }}
                </span>
              </div>
            </div>

            <p
              class="mt-10 max-w-[550px] font-sans text-[13px] leading-5 text-[#7D7871]"
            >
              Witness changes the role you play. You explain the problem once.
              Your Agent keeps the context, does the tedious work and records
              what happens next.
            </p>
          </div>
        </div>
      </section>

      <!-- VISUAL WORKFLOW -->
      <section
        id="how-it-works"
        class="relative overflow-hidden bg-[#E6E1D7]"
      >
        <div
          class="mx-auto w-full max-w-[1440px] px-6 py-24 sm:px-10 sm:py-32 lg:px-14"
        >
          <div
            class="mb-20 flex flex-col justify-between gap-8 lg:flex-row lg:items-end"
          >
            <div>
              <div
                class="flex items-center gap-x-3"
              >
                <span
                  class="font-sans text-[11px] font-medium tracking-[0.14em] text-[#767168]"
                >
                  ONE PROBLEM. ONE CASE.
                </span>

                <span
                  class="h-px w-8 bg-[#AAA49A]"
                />
              </div>

              <h2
                v-gsap.whenVisible.once.from="{
                  opacity: 0,
                  y: 25
                }"
                class="mt-8 max-w-[650px] font-display text-[clamp(3.5rem,6.7vw,7rem)] leading-[0.84] tracking-[-0.06em]"
              >
                Your Agent keeps
                <span class="italic">
                  the whole story.
                </span>
              </h2>
            </div>

            <p
              class="max-w-[360px] font-sans text-[13px] leading-5 text-[#716D65]"
            >
              Not another chatbot window. A Case that accumulates evidence,
              actions, correspondence, decisions and outcomes as the work
              moves forward.
            </p>
          </div>

          <!-- CASE DOCUMENT -->
          <div
            v-gsap.whenVisible.once.from="{
              opacity: 0,
              y: 50,
              rotate: 1
            }"
            class="relative mx-auto max-w-[1060px]"
          >
            <div
              class="relative overflow-hidden border-y border-[#AAA49A] bg-[#F7F4ED]"
            >
              <!-- document header -->
              <div
                class="flex flex-col justify-between gap-6 border-b border-[#AAA49A] px-5 py-5 sm:flex-row sm:items-center sm:px-7"
              >
                <div
                  class="flex items-center gap-x-4"
                >
                  <span
                    class="font-sans text-[10px] font-medium uppercase tracking-[0.16em] text-[#837E74]"
                  >
                    Case / 0048
                  </span>

                  <span
                    class="h-1 w-1 rounded-full bg-[#9D978C]"
                  />

                  <span
                    class="font-sans text-[10px] uppercase tracking-[0.16em] text-[#837E74]"
                  >
                    Active
                  </span>
                </div>

                <span
                  class="font-sans text-[10px] uppercase tracking-[0.16em] text-[#A19B90]"
                >
                  Updated just now
                </span>
              </div>

              <div
                class="grid min-h-[450px] grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]"
              >
                <!-- case summary -->
                <div
                  class="border-b border-[#AAA49A] px-6 py-10 sm:px-9 lg:border-b-0 lg:border-r"
                >
                  <span
                    class="font-sans text-[10px] uppercase tracking-[0.16em] text-[#8D887D]"
                  >
                    Subject
                  </span>

                  <h3
                    class="mt-4 max-w-[430px] font-display text-[clamp(2.5rem,4.3vw,4.5rem)] leading-[0.89] tracking-[-0.05em]"
                  >
                    Insurance claim denied after treatment.
                  </h3>

                  <div
                    class="mt-12 border-t border-[#C8C2B7] pt-5"
                  >
                    <span
                      class="font-sans text-[10px] uppercase tracking-[0.16em] text-[#8D887D]"
                    >
                      What Witness knows
                    </span>

                    <p
                      class="mt-3 max-w-[470px] font-sans text-[13px] leading-5 text-[#68635B]"
                    >
                      Denial letter received. Policy information collected.
                      Treatment date confirmed. Appeal route identified.
                    </p>
                  </div>
                </div>

                <!-- timeline -->
                <div
                  class="relative px-6 py-10 sm:px-9"
                >
                  <div
                    class="absolute bottom-9 left-[34px] top-12 w-px bg-[#C8C2B7] sm:left-[47px]"
                  />

                  <div
                    v-gsap.whenVisible.stagger.once.from="{
                      opacity: 0,
                      x: 18
                    }"
                    class="relative flex flex-col gap-y-9"
                  >
                    <div
                      class="relative flex gap-x-5 sm:gap-x-7"
                    >
                      <div
                        class="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center bg-[#F7F4ED] sm:h-8 sm:w-8"
                      >
                        <div
                          class="h-2.5 w-2.5 rounded-full bg-[#121212]"
                        />
                      </div>

                      <div class="pt-0.5">
                        <span
                          class="font-sans text-[10px] uppercase tracking-[0.13em] text-[#8D887D]"
                        >
                          Agent / 09:18
                        </span>

                        <p
                          class="mt-2 font-sans text-[14px] leading-5 text-[#242320]"
                        >
                          Read the denial letter and identified the appeal
                          deadline.
                        </p>
                      </div>
                    </div>

                    <div
                      class="relative flex gap-x-5 sm:gap-x-7"
                    >
                      <div
                        class="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center bg-[#F7F4ED] sm:h-8 sm:w-8"
                      >
                        <FileText
                          :size="14"
                          :stroke-width="1.6"
                          class="text-[#5D5850]"
                        />
                      </div>

                      <div class="pt-0.5">
                        <span
                          class="font-sans text-[10px] uppercase tracking-[0.13em] text-[#8D887D]"
                        >
                          Evidence / 09:21
                        </span>

                        <p
                          class="mt-2 font-sans text-[14px] leading-5 text-[#242320]"
                        >
                          Found the relevant policy language and attached it to
                          the Case.
                        </p>
                      </div>
                    </div>

                    <div
                      class="relative flex gap-x-5 sm:gap-x-7"
                    >
                      <div
                        class="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center bg-[#F7F4ED] sm:h-8 sm:w-8"
                      >
                        <Globe2
                          :size="14"
                          :stroke-width="1.6"
                          class="text-[#5D5850]"
                        />
                      </div>

                      <div class="pt-0.5">
                        <span
                          class="font-sans text-[10px] uppercase tracking-[0.13em] text-[#8D887D]"
                        >
                          Research / 09:26
                        </span>

                        <p
                          class="mt-2 font-sans text-[14px] leading-5 text-[#242320]"
                        >
                          Confirmed where the appeal must be submitted and what
                          supporting documentation is required.
                        </p>
                      </div>
                    </div>

                    <div
                      class="relative flex gap-x-5 sm:gap-x-7"
                    >
                      <div
                        class="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center bg-[#F7F4ED] sm:h-8 sm:w-8"
                      >
                        <Inbox
                          :size="14"
                          :stroke-width="1.6"
                          class="text-[#5D5850]"
                        />
                      </div>

                      <div class="pt-0.5">
                        <span
                          class="font-sans text-[10px] uppercase tracking-[0.13em] text-[#8D887D]"
                        >
                          User action / Now
                        </span>

                        <p
                          class="mt-2 font-sans text-[14px] leading-5 text-[#242320]"
                        >
                          Witness needs one document from you before sending
                          the appeal.
                        </p>

                        <div
                          class="mt-4 flex items-center gap-x-2"
                        >
                          <span
                            class="font-sans text-[11px] font-medium text-[#121212]"
                          >
                            Waiting for you
                          </span>

                          <ArrowRight
                            :size="13"
                            :stroke-width="1.8"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- floating caption -->
            <div
              class="absolute -bottom-7 right-7 hidden max-w-[240px] rotate-[-2deg] bg-[#121212] px-5 py-4 text-white shadow-xl sm:block"
            >
              <p
                class="font-display text-[18px] leading-[1.05] tracking-[-0.03em]"
              >
                The point isn't to chat.
                <span class="italic">
                  It's to get somewhere.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- HOW IT WORKS -->
      <section
        class="mx-auto w-full max-w-[1440px] px-6 py-28 sm:px-10 sm:py-36 lg:px-14"
      >
        <div
          class="grid grid-cols-1 gap-16 lg:grid-cols-[0.62fr_1.38fr]"
        >
          <div>
            <div
              class="sticky top-10"
            >
              <div
                class="flex items-center gap-x-3"
              >
                <span
                  class="font-sans text-[11px] font-medium tracking-[0.14em] text-[#8B867D]"
                >
                  THE WORKFLOW
                </span>

                <span
                  class="h-px w-8 bg-[#B8B3AA]"
                />
              </div>

              <h2
                class="mt-8 max-w-[430px] font-display text-[clamp(3rem,5vw,5.2rem)] leading-[0.88] tracking-[-0.055em]"
              >
                Less chasing.
                <span class="italic">
                  More resolving.
                </span>
              </h2>
            </div>
          </div>

          <div
            class="border-t border-[#CFCBC2]"
          >
            <article
              v-for="step in steps"
              :key="step.number"
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                y: 30
              }"
              class="group grid grid-cols-[68px_1fr] gap-x-5 border-b border-[#CFCBC2] py-10 sm:grid-cols-[95px_1fr] sm:py-14"
            >
              <div>
                <span
                  class="font-display text-[30px] italic tracking-[-0.04em] text-[#9B968D] sm:text-[36px]"
                >
                  {{ step.number }}
                </span>
              </div>

              <div>
                <span
                  class="font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-[#8D887D]"
                >
                  {{ step.eyebrow }}
                </span>

                <h3
                  class="mt-3 font-display text-[clamp(2.2rem,4vw,4.2rem)] leading-[0.9] tracking-[-0.05em]"
                >
                  {{ step.title }}
                </h3>

                <p
                  class="mt-5 max-w-[550px] font-sans text-[14px] leading-6 text-[#6B665E]"
                >
                  {{ step.text }}
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- USE CASES / BIG LIST -->
      <section
        class="border-t border-[#CFCBC2]"
      >
        <div
          class="mx-auto w-full max-w-[1440px] px-6 py-24 sm:px-10 sm:py-32 lg:px-14"
        >
          <div
            class="mb-16 flex items-end justify-between gap-8"
          >
            <div>
              <span
                class="font-sans text-[11px] font-medium tracking-[0.14em] text-[#8B867D]"
              >
                WHERE IT SHOWS UP
              </span>

              <h2
                v-gsap.whenVisible.once.from="{
                  opacity: 0,
                  y: 24
                }"
                class="mt-7 max-w-[650px] font-display text-[clamp(3.3rem,6vw,6.5rem)] leading-[0.84] tracking-[-0.06em]"
              >
                Whatever the
                <span class="italic">
                  headache.
                </span>
              </h2>
            </div>

            <span
              class="hidden font-sans text-[11px] uppercase tracking-[0.14em] text-[#9A968E] sm:block"
            >
              06 / 06
            </span>
          </div>

          <div
            class="border-t border-[#CFCBC2]"
          >
            <button
              v-for="useCase in useCases"
              :key="useCase.number"
              type="button"
              class="group grid w-full grid-cols-[48px_1fr_auto] items-center gap-x-4 border-b border-[#CFCBC2] py-7 text-left transition-[padding] duration-500 hover:px-2 sm:grid-cols-[85px_1fr_40px] sm:py-9"
            >
              <span
                class="font-sans text-[11px] text-[#98938A]"
              >
                {{ useCase.number }}
              </span>

              <div>
                <h3
                  class="font-display text-[clamp(2rem,4vw,3.8rem)] leading-none tracking-[-0.05em]"
                >
                  {{ useCase.title }}
                </h3>

                <p
                  class="mt-2 max-w-[580px] font-sans text-[12px] leading-5 text-[#858078] transition-colors duration-300 group-hover:text-[#5B5750] sm:text-[13px]"
                >
                  {{ useCase.text }}
                </p>
              </div>

              <ArrowUpRight
                :size="18"
                :stroke-width="1.5"
                class="text-[#AAA59C] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-[#121212]"
              />
            </button>
          </div>
        </div>
      </section>

      <!-- HUMAN IN THE LOOP -->
      <section
        class="bg-[#121212] text-[#F3EFE7]"
      >
        <div
          class="mx-auto grid w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div
            class="px-6 py-24 sm:px-10 sm:py-32 lg:px-14"
          >
            <span
              class="font-sans text-[11px] font-medium tracking-[0.14em] text-[#8C8880]"
            >
              YOU ARE STILL THE WITNESS
            </span>

            <h2
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                y: 30
              }"
              class="mt-8 max-w-[820px] font-display text-[clamp(3.7rem,7.4vw,8rem)] leading-[0.82] tracking-[-0.065em]"
            >
              An Agent can do the
              <span class="italic">
                work.
              </span>
              Not make the decision for you.
            </h2>

            <p
              class="mt-10 max-w-[550px] font-sans text-[15px] leading-6 text-[#AAA69E]"
            >
              Witness is designed around interruption. Your Agent keeps going
              until it genuinely needs a document, an answer or your approval.
              Then it stops and waits.
            </p>

            <button
              type="button"
              class="mt-10 flex items-center gap-x-2 border-b border-[#5D5952] pb-2 font-sans text-[12px] font-medium text-[#F3EFE7] transition-colors hover:border-[#F3EFE7]"
              @click="goToApp"
            >
              <span>
                Put something on its desk
              </span>

              <ArrowRight
                :size="14"
                :stroke-width="1.7"
              />
            </button>
          </div>

          <div
            class="relative min-h-[460px] overflow-hidden border-t border-[#34312D] lg:border-l lg:border-t-0"
          >
            <div
              class="absolute inset-0 opacity-[0.22]"
              style="
                background-image:
                  linear-gradient(#5A5650 1px, transparent 1px),
                  linear-gradient(90deg, #5A5650 1px, transparent 1px);
                background-size: 72px 72px;
              "
            />

            <div
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                y: 35,
                rotate: -3
              }"
              class="absolute left-[10%] top-[17%] w-[72%] bg-[#F3EFE7] px-6 py-6 text-[#121212] shadow-2xl sm:left-[17%] sm:w-[67%]"
            >
              <div
                class="flex items-center justify-between border-b border-[#D0CCC5] pb-4"
              >
                <span
                  class="font-sans text-[10px] font-medium uppercase tracking-[0.14em]"
                >
                  Witness / action required
                </span>

                <span
                  class="h-2 w-2 rounded-full bg-[#C6A968]"
                />
              </div>

              <p
                class="mt-6 max-w-[340px] font-display text-[27px] leading-[1] tracking-[-0.04em]"
              >
                I found the appeal route. I need the original invoice before
                I can finish this.
              </p>

              <div
                class="mt-8 flex flex-wrap items-center gap-x-2 gap-y-2"
              >
                <span
                  class="border border-[#CFCBC2] px-2.5 py-1.5 font-sans text-[10px] text-[#625E56]"
                >
                  Upload invoice
                </span>

                <span
                  class="border border-[#CFCBC2] px-2.5 py-1.5 font-sans text-[10px] text-[#625E56]"
                >
                  Ask me
                </span>
              </div>
            </div>

            <div
              v-gsap.parallax.slower-3
              class="absolute bottom-[10%] right-[8%] bg-[#2B2926] px-4 py-3 sm:right-[12%]"
            >
              <div class="flex items-center gap-x-2">
                <Check
                  :size="13"
                  :stroke-width="1.8"
                  class="text-[#C5B998]"
                />

                <span
                  class="font-sans text-[10px] uppercase tracking-[0.12em] text-[#D0CCC5]"
                >
                  Human approval stays yours
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- INBOX / COMMUNICATION -->
      <section
        class="mx-auto w-full max-w-[1440px] px-6 py-28 sm:px-10 sm:py-36 lg:px-14"
      >
        <div
          class="grid grid-cols-1 gap-16 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div>
            <span
              class="font-sans text-[11px] font-medium tracking-[0.14em] text-[#8B867D]"
            >
              AND WHEN THEY ANSWER...
            </span>

            <h2
              v-gsap.whenVisible.once.from="{
                opacity: 0,
                y: 28
              }"
              class="mt-8 max-w-[530px] font-display text-[clamp(3.2rem,5.5vw,5.8rem)] leading-[0.86] tracking-[-0.06em]"
            >
              You don't have to
              <span class="italic">
                live in your inbox.
              </span>
            </h2>
          </div>

          <div
            class="relative"
            v-gsap.whenVisible.once.from="{
              opacity: 0,
              x: 35
            }"
          >
            <div
              class="border-y border-[#BFB9AF]"
            >
              <div
                class="flex items-center justify-between border-b border-[#D4D0C9] px-4 py-4"
              >
                <div
                  class="flex items-center gap-x-2"
                >
                  <Inbox
                    :size="14"
                    :stroke-width="1.7"
                    class="text-[#726D64]"
                  />

                  <span
                    class="font-sans text-[11px] font-medium uppercase tracking-[0.13em]"
                  >
                    Witness inbox
                  </span>
                </div>

                <span
                  class="font-sans text-[10px] text-[#9B968D]"
                >
                  01 needs you
                </span>
              </div>

              <div
                class="px-4"
              >
                <div
                  class="border-b border-[#D4D0C9] py-7"
                >
                  <div
                    class="flex items-center justify-between gap-x-4"
                  >
                    <div>
                      <span
                        class="font-sans text-[10px] uppercase tracking-[0.13em] text-[#8D887D]"
                      >
                        Airline claims
                      </span>

                      <h3
                        class="mt-2 font-display text-[28px] leading-none tracking-[-0.04em]"
                      >
                        They replied.
                      </h3>
                    </div>

                    <Mail
                      :size="17"
                      :stroke-width="1.5"
                      class="text-[#8A857D]"
                    />
                  </div>

                  <p
                    class="mt-5 max-w-[530px] font-sans text-[13px] leading-5 text-[#615D56]"
                  >
                    “We can process the refund once the passenger confirms...”
                  </p>
                </div>

                <div
                  class="flex flex-col gap-y-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-x-5"
                >
                  <div>
                    <span
                      class="font-sans text-[10px] uppercase tracking-[0.13em] text-[#8D887D]"
                    >
                      Witness drafted
                    </span>

                    <p
                      class="mt-1 font-sans text-[12px] leading-5 text-[#706B63]"
                    >
                      A concise reply is ready for your approval.
                    </p>
                  </div>

                  <SmoothCorners
                    as-child
                    :corners="{
                      radius: 999,
                      smoothing: 0.6
                    }"
                  >
                    <button
                      type="button"
                      class="flex shrink-0 items-center justify-center gap-x-1.5 bg-[#121212] px-4 py-2.5 text-white"
                      @click="goToApp"
                    >
                      <span
                        class="font-sans text-[11px] font-medium"
                      >
                        Review reply
                      </span>

                      <ArrowUpRight
                        :size="13"
                        :stroke-width="1.8"
                      />
                    </button>
                  </SmoothCorners>
                </div>
              </div>
            </div>

            <p
              class="mt-5 max-w-[510px] font-sans text-[11px] leading-5 text-[#929087]"
            >
              Witness can draft the response from the Case context, but the
              send button remains yours.
            </p>
          </div>
        </div>
      </section>

      <!-- FINAL CTA -->
      <section
        class="relative overflow-hidden bg-[#E3DFD5]"
      >
        <div
          class="mx-auto w-full max-w-[1440px] px-6 py-28 sm:px-10 sm:py-36 lg:px-14"
        >
          <div
            class="relative"
          >
            <div
              class="pointer-events-none absolute -right-6 -top-16 hidden select-none font-display text-[17rem] leading-none tracking-[-0.12em] text-[#D5D0C5] lg:block"
            >
              W
            </div>

            <span
              class="font-sans text-[11px] font-medium tracking-[0.14em] text-[#7F7A71]"
            >
              START WITH THE THING YOU'VE BEEN PUTTING OFF
            </span>

            <h2
              v-gsap.splitText.words.once.from="{
                opacity: 0,
                y: 24,
                stagger: 0.06
              }"
              class="relative z-10 mt-8 max-w-[980px] font-display text-[clamp(4rem,9vw,9rem)] leading-[0.82] tracking-[-0.07em]"
            >
              Give Witness the problem.
              <span class="italic">
                Keep living your life.
              </span>
            </h2>

            <div
              class="relative z-10 mt-12 flex flex-col items-start gap-y-4 sm:flex-row sm:items-center sm:gap-x-5"
            >
              <SmoothCorners
                as-child
                :corners="{
                  radius: 999,
                  smoothing: 0.6
                }"
              >
                <button
                  type="button"
                  class="flex items-center gap-x-2 bg-[#121212] px-5 py-3.5 text-white transition-transform duration-200 hover:-translate-y-px"
                  @click="goToApp"
                >
                  <span
                    class="font-sans text-[13px] font-medium"
                  >
                    Start with Witness
                  </span>

                  <ArrowRight
                    :size="15"
                    :stroke-width="1.8"
                  />
                </button>
              </SmoothCorners>

              <span
                class="font-sans text-[11px] text-[#858078]"
              >
                No perfect prompt. No bureaucracy degree.
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- FOOTER -->
    <footer
      class="bg-[#121212] text-[#F1EEE7]"
    >
      <div
        class="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14"
      >
        <div
          class="flex items-center gap-x-2"
        >
          <div
            class="flex h-7 w-7 items-center justify-center bg-[#F1EEE7] text-[#121212]"
          >
            <span
              class="font-display text-[15px]"
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

        <div
          class="flex flex-wrap items-center gap-x-6 gap-y-2"
        >
          <a
            href="#how-it-works"
            class="font-sans text-[11px] text-[#8F8B84] transition-colors hover:text-[#F1EEE7]"
          >
            How it works
          </a>

          <a
            href="#problems"
            class="font-sans text-[11px] text-[#8F8B84] transition-colors hover:text-[#F1EEE7]"
          >
            Use cases
          </a>

          <button
            type="button"
            class="font-sans text-[11px] text-[#8F8B84] transition-colors hover:text-[#F1EEE7]"
            @click="goToApp"
          >
            Get started
          </button>
        </div>

        <span
          class="font-sans text-[10px] uppercase tracking-[0.15em] text-[#65615B]"
        >
          Witness the bureaucracy. Then leave it behind.
        </span>
      </div>
    </footer>
  </div>
</template>