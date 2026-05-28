<script lang="ts">
    import { palette, type Palette } from '$lib/paletteStore';
    import { Button } from '$lib/components/ui/button';

    const options: { value: Palette; label: string }[] = [
        { value: 'default',       label: 'Standard' },
        { value: 'deuteranopia',  label: 'Deuteranopie' },
        { value: 'protanopia',    label: 'Protanopie' },
        { value: 'monochrome',    label: 'Monochrom' },
    ];
</script>

<div class="flex items-center gap-1">
    {#each options as opt}
        <Button
                variant={$palette === opt.value ? 'default' : 'ghost'}
                size="sm"
                onclick={() => palette.set(opt.value)}
        >
            {opt.label}
        </Button>
    {/each}
</div>