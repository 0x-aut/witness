<script setup lang="ts">
import { signUp } from "@@/lib/auth-client";

useSeoMeta({
  title: "Signup"
})

const fullName = ref<string>("");
const userEmail = ref<string>("");
const userPassword = ref<string>("");
const confirmPassword = ref<string>("");
const usernameInput = ref<string>("");
const stateInput = ref<string>("");

var isLoading = ref<boolean>(false)

async function userSignUp() {
  if (userPassword.value !== confirmPassword.value) {
    alert("Password does not match");
    return
  }

  const displayName = fullName.value.trim().split(/\s+/)[0]
  
  const result = signUp.email({
    email: userEmail.value,
    password: userPassword.value,
    name: fullName.value,
    username: usernameInput.value,
    displayUsername: displayName,
    country: "US",
    state: stateInput.value,
  }, {
    onRequest: (ctx) => {
      isLoading.value = true
    },
    onSuccess: async (ctx) => {
      await navigateTo(`/${ctx.data.user.username}`)
    },
    onError: (ctx) => {
      isLoading.value = false
    }
  })

  console.log("sign up:", result);
  
  const session = await authClient.getSession();
  
  console.log("session:", session);
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
          <!-- <span class="font-sans text-2xl text-[#121212] font-semibold">Witness</span> -->
        </NuxtLink>
        <div class="flex flex-col gap-y-1.5 w-full items-start">
          <span class="font-sans text-2xl text-[#121212] font-medium">Create your account</span>
          <span class="font-sans text-md text-[#121212] font-normal">Sign up to let Witness help you.</span>
        </div>
        <hr class="text-[#D9D9D9] w-full">
        <div class="w-full flex flex-col gap-y-0.5">
          <label for="email" class="font-sans font-normal text-sm">Full name</label>
          <input v-model="fullName" type="text" required placeholder="Enter your name" class="font-sans focus:border-2 duration-50 ease-in-out focus:border-[#273BE2] w-full text-sm outline-0 border-0 bg-[#F2F2F2] p-1.5 rounded-sm" />
        </div>
        <div class="w-full flex flex-col gap-y-0.5">
          <label for="email" class="font-sans font-normal text-sm">Email</label>
          <input v-model="userEmail" type="email" required placeholder="Enter your email" class="font-sans focus:border-2 duration-50 ease-in-out focus:border-[#273BE2] w-full text-sm outline-0 border-0 bg-[#F2F2F2] p-1.5 rounded-sm" />
        </div>
        <div class="w-full flex flex-col gap-y-0.5">
          <label for="username" class="font-sans font-normal text-sm">Username</label>
          <input v-model="usernameInput" type="text" required placeholder="Enter your preferred username" class="font-sans focus:border-2 duration-50 ease-in-out focus:border-[#273BE2] w-full text-sm outline-0 border-0 bg-[#F2F2F2] p-1.5 rounded-sm" />
        </div>
        <div class="w-full flex flex-col gap-y-0.5">
          <label for="state" class="font-sans font-normal text-sm">
            State <span class="text-xs unmodified-font-sans font-normal">(Witness only supports US for now)</span>
          </label>
          <UIElementsStateSelect id="state" v-model="stateInput" required />
        </div>
        <div class="w-full flex justify-between items-center gap-x-7.5">
          <div>
            <label for="password" class="font-sans font-normal text-sm">Password</label>
            <input v-model="userPassword" type="password" required placeholder="**********" class="font-sans focus:border-2 duration-50 ease-in-out focus:border-[#273BE2] w-full text-sm outline-0 border-0 bg-[#F2F2F2] p-1.5 rounded-sm" />
          </div>
          <div>
            <label for="confirm-password" class="font-sans font-normal text-sm">Confirm Password</label>
            <input v-model="confirmPassword" type="password" required placeholder="**********" class="font-sans focus:border-2 duration-50 ease-in-out focus:border-[#273BE2] w-full text-sm outline-0 border-0 bg-[#F2F2F2] p-1.5 rounded-sm" />
          </div>
        </div>
        <button class="w-full bg-[#121212] rounded-sm flex items-center justify-center py-1.5" :disabled="isLoading" @click="userSignUp">
          <Loader v-if="isLoading" />
          <span v-else class="font-sans font-semibold text-sm text-[#FFFFFF]">Sign up</span>
        </button>
        <section class="flex w-full justify-between items-center -mt-2.5">
          <span class="font-sans text-xs text-[#555555]">
            Don't have an account? <NuxtLink to="/signin"><span class="text-[#121212]">Sign in</span></NuxtLink>
          </span>
        </section>
      </section>
    </div>
  </div>
</template>