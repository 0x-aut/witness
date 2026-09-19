<script setup lang="ts">
import { signIn, authClient } from "@@/lib/auth-client"
useSeoMeta({
  title: "Signin"
})

const userEmail = ref<string>("");
const userPassword = ref<string>("");

var isLoading = ref<boolean>(false);

async function userSignIn() {
  const { data, error } = await signIn.email({
    email: userEmail.value,
    password: userPassword.value,
  }, {
    onRequest: (ctx) => {
      isLoading.value = true
    },
    onSuccess: async (ctx) => {
      await navigateTo(`/${ctx.data.user.username}`)
    },
    onError: (ctx) => {
      alert(ctx.error.message)
    }
  })
  isLoading.value = false
  
}

</script>

<template>
  <div class="flex h-screen w-screen bg-[#F2F2F2] items-center justify-center">
    <div class="flex overflow-hidden h-150 w-250 rounded-[20px] border border-[#D9D9D9] bg-[#ffffff]">
      <section class="px-5 py-5 w-[50%] h-full bg-[#121212]">
        
      </section>
      <section class="flex gap-y-5 flex-col items-center justify-center p-15 h-full w-[50%]">
        <NuxtLink to="/" class="flex gap-x-1.5 items-center">
           <NuxtImg src="Witness-logo.svg" alt="Witness logo" width="100" height="50" /> 
        </NuxtLink>
        <div class="flex flex-col gap-y-1.5 w-full items-start">
          <span class="font-sans text-2xl text-[#121212] font-medium">Welcome back</span>
          <span class="font-sans text-md text-[#121212] font-normal">Sign in to your account to continue using Witness.</span>
        </div>
        <hr class="text-[#D9D9D9] w-full">
        <div class="w-full flex flex-col gap-y-0.5">
          <label for="email" class="font-sans font-normal text-sm">Email</label>
          <input v-model="userEmail" type="email" placeholder="Enter your email" class="font-sans focus:border-2 duration-50 ease-in-out focus:border-[#273BE2] w-full text-sm outline-0 border-0 bg-[#F2F2F2] p-1.5 rounded-sm" />
        </div>
        <div class="w-full flex flex-col gap-y-0.5">
          <label for="password" class="font-sans font-normal text-sm">Password</label>
          <input v-model="userPassword" type="password" placeholder="**********" class="font-sans focus:border-2 duration-50 ease-in-out focus:border-[#273BE2] w-full text-sm outline-0 border-0 bg-[#F2F2F2] p-1.5 rounded-sm" />
        </div>
        <button class="w-full bg-[#121212] rounded-sm flex items-center justify-center py-1.5" @click="userSignIn">
          <Loader v-if="isLoading" />
          <span v-else class="font-sans font-semibold text-sm text-[#FFFFFF]">Sign in</span>
        </button>
        <section class="flex w-full justify-between items-center -mt-2.5">
          <span class="font-sans text-xs text-[#555555]">
            Don't have an account? <NuxtLink to="/signup"><span class="text-[#121212]">Sign up</span></NuxtLink>
          </span>
          <NuxtLink><span class="font-sans text-xs text-[#121212]">Forgot password?</span></NuxtLink>
        </section>
      </section>
    </div>
  </div>
</template>