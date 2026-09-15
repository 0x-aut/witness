import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  css: ['@/assets/css/main.css'],

  modules: ['@nuxt/fonts', '@nuxt/image', '@nuxt/scripts', '@nuxtjs/device', 'convex-nuxt', 'v-gsap-nuxt'],

  convex: {
    url: process.env.CONVEX_URL
  },

  fonts: {
    families: [
      { name: 'Switzer', provider: 'fontshare', weights: [400, 500, 600, 700], styles: ['normal', 'italic'] },
      { name: 'Gambarino', provider: 'fontshare', weights: [400], styles: ['normal', 'italic'] },
    ],
  },

  
})