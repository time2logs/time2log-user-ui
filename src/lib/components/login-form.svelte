<script lang="ts">
  import { Loader2 } from "lucide-svelte";
  import { buttonVariants } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as Card from "$lib/components/ui/card";
  import {supabaseApp} from "$lib/supabaseClient";
  import {error} from "@sveltejs/kit";
  import {cn} from "$lib/utils";
  import {goto} from "$app/navigation";

  let email = $state("");
  let password = $state("");
  let errorMessage = $state("");
  let isLoading = $state(false);

  async function signInWithEmail() {
    isLoading = true;
    const { data, error } = await supabaseApp.auth.signInWithPassword({
      email: email,
      password: password,
    })
    errorMessage = error ? error.message : "";
    isLoading = false;

    if (!error) {
      await goto('/');
    }
  }
</script>

<Card.Root class="mx-auto max-w-sm">
  <Card.Header>
    <Card.Title class="text-2xl">Login</Card.Title>

  </Card.Header>
  <Card.Content>
    <form onsubmit={(e) => { e.preventDefault(); signInWithEmail(); }} class="grid gap-4">
    {#if errorMessage}
        <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      {/if}

      <div class="grid gap-2">
        <Label for="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="hans.muster@gmail.com"
          bind:value={email}
          required
          disabled={isLoading}
        />
      </div>
      <div class="grid gap-2">
        <div class="flex items-center">
          <Label for="password">Password</Label>
        </div>
        <Input
          id="password"
          type="password"
          bind:value={password}
          required
          disabled={isLoading}
        />
      </div>
      <button
        type="submit"
        class={cn(buttonVariants(), "w-full")}
        disabled={isLoading}
      >
        {#if isLoading}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          Logging in...
        {:else}
          Login
        {/if}
      </button>
    </form>
  </Card.Content>
</Card.Root>