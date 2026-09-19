<!-- components/StateSelect.vue -->
<script setup lang="ts">
import { US_STATES, getStateName } from "#shared/utils/us-states"

defineProps<{ id?: string; required?: boolean; placeholder?: string }>()

const model = defineModel<string>({ default: "" })

const open = ref(false)
const activeIndex = ref(-1)
const root = ref<HTMLElement | null>(null)
const btn = ref<HTMLElement | null>(null)
const list = ref<HTMLElement | null>(null)

const selectedName = computed(() => getStateName(model.value))

const pos = reactive({ top: 0, bottom: 0, left: 0, width: 0, maxH: 240, up: false })

function updatePos() {
  const r = btn.value?.getBoundingClientRect()
  if (!r) return

  const gap = 4        // space between field and list
  const margin = 12    // breathing room from the screen edge
  const ideal = 240    // the height you want when there's plenty of room

  const below = window.innerHeight - r.bottom - gap - margin
  const above = r.top - gap - margin

  // flip upward only if below is cramped and above has more room
  pos.up = below < 160 && above > below
  const space = pos.up ? above : below

  pos.maxH = Math.max(80, Math.min(ideal, space))
  pos.left = r.left
  pos.width = r.width
  pos.top = r.bottom + gap
  pos.bottom = window.innerHeight - r.top + gap
}

function openList() {
  updatePos()
  open.value = true
  activeIndex.value = Math.max(0, US_STATES.findIndex((s) => s.code === model.value))
  nextTick(scrollActive)
}
function close() {
  open.value = false
}
function select(code: string) {
  model.value = code
  close()
}
function scrollActive() {
  list.value?.children[activeIndex.value]?.scrollIntoView({ block: "nearest" })
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault()
      openList()
    }
    return
  }
  if (e.key === "ArrowDown") {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, US_STATES.length - 1)
    scrollActive()
  } else if (e.key === "ArrowUp") {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
    scrollActive()
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault()
    if (activeIndex.value >= 0) select(US_STATES[activeIndex.value].code)
  } else if (e.key === "Escape" || e.key === "Tab") {
    close()
  } else if (/^[a-z]$/i.test(e.key)) {
    const i = US_STATES.findIndex((s) => s.name.toLowerCase().startsWith(e.key.toLowerCase()))
    if (i !== -1) {
      activeIndex.value = i
      scrollActive()
    }
  }
}

// the list is teleported, so clicks inside it must count as "inside"
function onDocClick(e: MouseEvent) {
  const t = e.target as Node
  if (root.value?.contains(t) || list.value?.contains(t)) return
  close()
}
function onReposition() {
  if (open.value) updatePos()
}

onMounted(() => {
  document.addEventListener("click", onDocClick)
  window.addEventListener("resize", onReposition)
  window.addEventListener("scroll", onReposition, true)
})
onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick)
  window.removeEventListener("resize", onReposition)
  window.removeEventListener("scroll", onReposition, true)
})
</script>

<template>
  <div ref="root" class="relative w-full">
    <input
      :value="model"
      :required="required"
      tabindex="-1"
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 opacity-0"
    />

    <button
      ref="btn"
      :id="id"
      type="button"
      aria-haspopup="listbox"
      :aria-expanded="open"
      class="flex w-full items-center justify-between rounded-sm border-0 bg-[#F2F2F2] p-1.5 text-left font-sans text-sm outline-0 duration-50 ease-in-out focus:border-2 focus:border-[#273BE2]"
      :class="open && 'border-2 border-[#273BE2]'"
      @click="open ? close() : openList()"
      @keydown="onKeydown"
    >
      <span :class="selectedName ? 'text-black' : 'text-gray-500'">
        {{ selectedName || placeholder || "Select your state" }}
      </span>
      <svg
        class="h-4 w-4 text-gray-500 transition-transform"
        :class="open && 'rotate-180'"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M5 8l5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <Teleport to="body">
      <ul
        v-if="open"
        ref="list"
        role="listbox"
        :style="{
          left: pos.left + 'px',
          width: pos.width + 'px',
          maxHeight: pos.maxH + 'px',
          ...(pos.up ? { bottom: pos.bottom + 'px' } : { top: pos.top + 'px' }),
        }"
        class="fixed z-[9999] divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
      >
        <li
          v-for="(s, i) in US_STATES"
          :key="s.code"
          role="option"
          :aria-selected="s.code === model"
          class="cursor-pointer px-3 py-2 font-sans text-sm"
          :class="[
            i === activeIndex && 'bg-[#F2F2F2]',
            s.code === model ? 'font-medium text-[#273BE2]' : 'text-gray-800',
          ]"
          @mouseenter="activeIndex = i"
          @click="select(s.code)"
        >
          {{ s.name }}
        </li>
      </ul>
    </Teleport>
  </div>
</template>