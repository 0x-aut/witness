<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
} from "vue";
import { ExternalLink } from "@lucide/vue";
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
  if (!cardRef.value) {
    return;
  }

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
  if (!cardRef.value) {
    return;
  }

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
      radius: 10,
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
      class="group relative h-[72px] w-[72px] shrink-0 rotate-[-3deg] overflow-hidden bg-[#E9E9E9]"
    >
      <div
        v-if="data.image"
        ref="imageRef"
        class="absolute inset-[-2%] bg-cover bg-center bg-no-repeat"
        :style="imageStyle"
      />

      <div
        v-else
        class="absolute inset-0 flex items-center justify-center bg-[#F5F5F5]"
      >
        <div class="flex flex-col items-center justify-center px-2 text-center">
          <SmoothCorners
            v-if="data.favicon"
            as-child
            :corners="{
              radius: 8,
              smoothing: 0.7,
            }"
          >
            <div class="flex h-8 w-8 items-center justify-center bg-white">
              <img
                :src="data.favicon"
                :alt="`${hostname} favicon`"
                class="h-5 w-5 object-contain"
                loading="lazy"
              />
            </div>
          </SmoothCorners>

          <span
            class="mt-2 max-w-[58px] truncate text-[8px] font-medium text-black/40"
          >
            {{ hostname }}
          </span>
        </div>
      </div>

      <div
        ref="overlayRef"
        class="pointer-events-none absolute inset-0 bg-black opacity-0"
      />

      <div
        ref="detailsRef"
        class="pointer-events-none absolute inset-0 translate-y-1.5 opacity-0"
      >
        <div class="absolute inset-x-2 bottom-2">
          <p
            class="line-clamp-2 text-[9px] font-medium leading-[1.2] text-white"
          >
            {{ title }}
          </p>

          <div class="mt-1 flex items-center gap-1">
            <span class="truncate text-[7px] text-white/60">
              {{ hostname }}
            </span>

            <ExternalLink
              :size="8"
              :stroke-width="1.8"
              class="shrink-0 text-white/55"
            />
          </div>
        </div>
      </div>

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