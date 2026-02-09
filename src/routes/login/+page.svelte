<script lang="ts">
  import { Mail, Lock, Sun, ArrowRight, HelpCircle } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { login, setAccessToken } from '$lib/api';

  let email = '';
  let password = '';
  let errorMessage = '';
  let isLoading = false;

  async function handleLogin(e: Event) {
    e.preventDefault();
    errorMessage = '';
    isLoading = true;

    try {
      const data = await login(email, password);

      // Store the token and expiration
      setAccessToken(data.accessToken, data.expirationDate);

      // Redirect to dashboard or home page
      goto('/dashboard');
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Time2Log Login</title>
  <!-- Using Inter as a close approximation to the sans-serif font used -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<!-- Main Container with subtle mesh gradient background -->
<div
  class="min-h-screen w-full flex flex-col items-center justify-center relative font-sans text-gray-900 bg-[#f3f5fa]"
  style="background: radial-gradient(circle at 10% 20%, rgb(239, 246, 255) 0%, rgb(243, 245, 250) 40%, rgb(243, 238, 252) 90%);"
>
  <!-- Top Right Sun Icon -->
  <button
    class="absolute top-6 right-6 w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-gray-600"
    aria-label="Toggle theme"
  >
    <Sun size={20} strokeWidth={1.5} />
  </button>

  <!-- Main Logo -->
  <div class="mb-12">
    <h1 class="text-[42px] font-bold tracking-tight text-[#1a1a1a]">
      Time2Log
    </h1>
  </div>

  <!-- Login Card -->
  <div class="w-full max-w-[440px] bg-white rounded-[24px] p-10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.06)] relative z-10 border border-white/50">
    <div class="flex flex-col items-center mb-8">
      <h2 class="text-[26px] font-semibold text-[#1a1a1a] mb-2">
        Willkommen zurück
      </h2>
      <p class="text-[15px] text-gray-500 font-medium">
        Bitte melden Sie sich an, um fortzufahren
      </p>
    </div>

    <form onsubmit={handleLogin} class="space-y-4">
      <!-- Error Message -->
      {#if errorMessage}
        <div class="p-3 bg-red-50 border border-red-200 rounded-[12px] text-red-700 text-[14px]">
          {errorMessage}
        </div>
      {/if}

      <!-- email Input -->
      <div class="relative group">
        <div
          class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400"
        >
          <Mail size={20} strokeWidth={1.5} />
        </div>
        <input
          type="text"
          placeholder="E-Mail"
          bind:value={email}
          disabled={isLoading}
          required
          class="w-full h-[52px] pl-12 pr-4 bg-white border border-gray-200 rounded-[12px] text-[15px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <!-- Password Input -->
      <div class="relative group">
        <div
          class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400"
        >
          <Lock size={20} strokeWidth={1.5} />
        </div>
        <input
          type="password"
          placeholder="Passwort"
          bind:value={password}
          disabled={isLoading}
          required
          class="w-full h-[52px] pl-12 pr-4 bg-white border border-gray-200 rounded-[12px] text-[15px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        disabled={isLoading}
        class="w-full h-[52px] bg-[#222222] hover:bg-black text-white rounded-[12px] font-medium text-[16px] flex items-center justify-center gap-2 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if isLoading}
          <span class="inline-block animate-spin mr-2">⟳</span>
          Anmelden...
        {:else}
          Anmelden
          <ArrowRight size={18} strokeWidth={2} />
        {/if}
      </button>
    </form>
  </div>

  <!-- Bottom Copyright -->
  <div class="absolute bottom-6 w-full text-center">
    <p class="text-[11px] text-gray-400 font-medium tracking-wide uppercase">
      © 2024 System Inc.
    </p>
  </div>

  <!-- Bottom Right Help Icon -->
  <button
    class="absolute bottom-6 right-6 w-10 h-10 bg-[#333333] rounded-full flex items-center justify-center shadow-lg hover:bg-black transition-colors cursor-pointer text-white"
    aria-label="Help"
  >
    <HelpCircle size={18} strokeWidth={2} class="transform rotate-180 scale-x-[-1]" />
    <!-- Note: Standard Lucide help-circle looks slightly different, transformed to match question mark style -->
  </button>
</div>

<style>
  /* Global Font Settings */
  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
</style>