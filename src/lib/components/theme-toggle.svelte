<script lang="ts">
    import {theme} from '$lib/themeStore';
    import {Sun, Moon} from '@lucide/svelte';
</script>

<button onclick={() => theme.toggle()} class="...">
    {#if $theme === 'dark'}
        <Sun size={18}/>
    {:else}
        <Moon size={18}/>
    {/if}
</button>