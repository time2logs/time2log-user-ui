import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Palette = 'default' | 'deuteranopia' | 'protanopia' | 'monochrome';

const PALETTES: Palette[] = ['default', 'deuteranopia', 'protanopia', 'monochrome'];

function createPaletteStore() {
    const getInitial = (): Palette => {
        if (!browser) return 'default';
        return (localStorage.getItem('palette') as Palette) ?? 'default';
    };

    const { subscribe, set } = writable<Palette>(getInitial());

    return {
        subscribe,
        set: (p: Palette) => {
            if (browser) {
                localStorage.setItem('palette', p);
                PALETTES.forEach(name =>
                    document.documentElement.classList.remove(`palette-${name}`)
                );
                if (p !== 'default')
                    document.documentElement.classList.add(`palette-${p}`);
            }
            set(p);
        },
        initialize: () => {
            if (!browser) return;
            const p = (localStorage.getItem('palette') as Palette) ?? 'default';
            if (p !== 'default')
                document.documentElement.classList.add(`palette-${p}`);
            set(p);
        }
    };
}

export const palette = createPaletteStore();