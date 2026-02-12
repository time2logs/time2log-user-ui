<script lang="ts">
  import { Loader2 } from "lucide-svelte";
  import { buttonVariants } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as Card from "$lib/components/ui/card";
  import { cn } from "$lib/utils";
  import { login } from "$lib/api";
  import { goto } from "$app/navigation";

  // State
  let email = $state("");
  let password = $state("");
  let errorMessage = $state("");
  let isLoading = $state(false);

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = "";
    isLoading = true;

    try {
      await login(email, password);
      goto("/");
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Ein Fehler ist aufgetreten";
    } finally {
      isLoading = false;
    }
  }
</script>

<Card.Root class="mx-auto max-w-sm">
  <Card.Header>
    <Card.Title class="text-2xl">Login</Card.Title>

  </Card.Header>
  <Card.Content>
    <form onsubmit={handleLogin} class="grid gap-4">
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
          placeholder="m@example.com"
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