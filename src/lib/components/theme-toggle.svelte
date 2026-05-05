<script lang="ts">
    import { theme } from '$lib/themeStore';
    import { Button } from '$lib/components/ui/button';
    import { Sun, Moon } from 'lucide-svelte';
</script>

<Button variant="ghost" size="icon" onclick={() => theme.toggle()}>
    {#if $theme === 'dark'}
        <Sun size={18} />
    {:else}
        <Moon size={18} />
    {/if}
</Button>