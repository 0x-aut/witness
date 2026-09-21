<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
} from "vue";
import { SmoothCorners } from "@lisse/vue";

type WebsiteWidgetData = {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  favicon?: string | null;
};

const props = defineProps<{
  data: WebsiteWidgetData;
}>();

const cardRef = ref<HTMLElement | null>(null);
const imageRef = ref<HTMLElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);
const detailsRef = ref<HTMLElement | null>(null);

const gsap = useGSAP();

let hoverTimeline:
  | ReturnType<typeof gsap.timeline>
  | null = null;

let observer: IntersectionObserver | null = null;

const hostname = computed(() => {
  try {
    return new URL(props.data.url)
      .hostname
      .replace(/^www\./, "");
  } catch {
    return props.data.url;
  }
});

const title = computed(() => {
  const value =
    props.data.title?.trim() ||
    hostname.value;

  return value.length > 72
    ? `${value.slice(0, 69)}...`
    : value;
});

const description = computed(() => {
  const value =
    props.data.description?.trim();

  if (!value) {
    return "";
  }

  return value.length > 100
    ? `${value.slice(0, 97)}...`
    : value;
});

const imageStyle = computed(() => {
  if (!props.data.image) {
    return {};
  }

  return {
    backgroundImage: `url(${JSON.stringify(
      props.data.image,
    )})`,
  };
});

function enter() {
  hoverTimeline?.play();
}

function leave() {
  hoverTimeline?.reverse();
}

function animateIn() {
  if (!cardRef.value) return;

  gsap.fromTo(
    cardRef.value,
    {
      opacity: 0,
      scale: 0.9,
      rotate: -5,
    },
    {
      opacity: 1,
      scale: 1,
      rotate: 0,
      duration: 0.95,
      ease: "power2.out",
    },
  );
}

onMounted(() => {
  if (!cardRef.value) return;

  hoverTimeline = gsap.timeline({
    paused: true,
  });

  if (imageRef.value) {
    hoverTimeline.to(
      imageRef.value,
      {
        scale: 1.035,
        duration: 0.65,
        ease: "power2.out",
      },
      0,
    );
  }

  if (overlayRef.value) {
    hoverTimeline.to(
      overlayRef.value,
      {
        opacity: 0.62,
        duration: 0.45,
        ease: "power2.out",
      },
      0,
    );
  }

  if (detailsRef.value) {
    hoverTimeline.to(
      detailsRef.value,
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: "power2.out",
      },
      0.05,
    );
  }

  observer = new IntersectionObserver(
    entries => {
      const entry = entries[0];

      if (!entry?.isIntersecting) {
        return;
      }

      animateIn();

      observer?.disconnect();
      observer = null;
    },
    {
      threshold: 0.15,
    },
  );

  observer.observe(cardRef.value);
});

onUnmounted(() => {
  hoverTimeline?.kill();
  hoverTimeline = null;

  observer?.disconnect();
  observer = null;
});
</script>

<template>
  <SmoothCorners
    as-child
    :corners="{
      radius: 18,
      smoothing: 0.7,
    }"
    :middle-border="{
      width: 1,
      color: '#E3E3E3',
      opacity: 1,
    }"
  >
    <div
      ref="cardRef"
      class="group relative aspect-[1.7/1] w-full overflow-hidden bg-[#E9E9E9]"
    >
      <!-- IMAGE -->
      <div
        v-if="data.image"
        ref="imageRef"
        class="absolute inset-[-2%] bg-cover bg-center bg-no-repeat"
        :style="imageStyle"
      />

      <!-- IMAGE FALLBACK -->
      <div
        v-else
        class="absolute inset-0 flex items-center justify-center bg-[#F5F5F5] px-5"
      >
        <div class="flex max-w-[88%] items-center gap-3">
          <SmoothCorners
            as-child
            :corners="{
              radius: 10,
              smoothing: 0.7,
            }"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
            >
              <img
                v-if="data.favicon"
                :src="data.favicon"
                :alt="`${hostname} favicon`"
                class="h-6 w-6 object-contain"
                loading="lazy"
              />
      
              <span
                v-else
                class="text-sm font-medium text-black/35"
              >
                {{ hostname.charAt(0).toUpperCase() }}
              </span>
            </div>
          </SmoothCorners>
      
          <div class="min-w-0">
            <p
              class="truncate text-[14px] font-medium leading-[1.2] tracking-[-0.02em] text-black/75"
            >
              {{ title }}
            </p>
      
            <p
              class="mt-1 truncate text-[10px] leading-none text-black/35"
            >
              {{ hostname }}
            </p>
          </div>
        </div>
      </div>

      <!-- DARK HOVER OVERLAY -->
      <div
        ref="overlayRef"
        class="pointer-events-none absolute inset-0 bg-black opacity-0"
      />

      <!-- HOVER DETAILS -->
      <div
        ref="detailsRef"
        class="pointer-events-none absolute inset-0 translate-y-1.5 opacity-0"
      >
        <!-- TOP LEFT -->
        <div
          class="absolute left-3.5 top-3.5 flex max-w-[65%] items-center gap-1.5"
        >
          <img
            v-if="data.favicon"
            :src="data.favicon"
            :alt="`${hostname} favicon`"
            class="h-3.5 w-3.5 shrink-0 object-contain"
            loading="lazy"
          />

          <span
            class="truncate text-[10px] font-medium text-white/85"
          >
            {{ hostname }}
          </span>
        </div>

        <!-- TOP RIGHT -->
        <div
          class="absolute right-3.5 top-3.5 max-w-[28%] text-right"
        >
          <span
            class="text-[8px] font-medium uppercase tracking-[0.12em] text-white/45"
          >
            Website
          </span>
        </div>

        <!-- BOTTOM LEFT -->
        <div
          class="absolute bottom-3.5 left-3.5 max-w-[68%]"
        >
          <p
            class="line-clamp-2 text-[13px] font-medium leading-[1.15] tracking-[-0.02em] text-white"
          >
            {{ title }}
          </p>
        </div>

        <!-- BOTTOM RIGHT -->
        <div
          v-if="description"
          class="absolute bottom-3.5 right-3.5 max-w-[40%] text-right"
        >
          <p
            class="line-clamp-2 text-[9px] leading-[1.4] text-white/75"
          >
            {{ description }}
          </p>
        </div>
      </div>

      <!-- CLICK TARGET -->
      <a
        :href="data.url"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`Open ${title}`"
        class="absolute inset-0 z-10 outline-none"
        @mouseenter="enter"
        @mouseleave="leave"
        @focus="enter"
        @blur="leave"
      />
    </div>
  </SmoothCorners>
</template>