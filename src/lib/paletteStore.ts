import { createPersistentStore } from './persistentStore';
import { STORAGE_KEYS } from './storageKeys';

export type Palette = 'default' | 'deuteranopia' | 'protanopia' | 'monochrome';

const PALETTES: Palette[] = ['default', 'deuteranopia', 'protanopia', 'monochrome'];

const applyPalette = (p: Palette) => {
	PALETTES.forEach((name) => document.documentElement.classList.remove(`palette-${name}`));
	if (p !== 'default') document.documentElement.classList.add(`palette-${p}`);
};

export const palette = createPersistentStore<Palette>(STORAGE_KEYS.palette, 'default', {
	apply: applyPalette,
	validate: (value) => (PALETTES.includes(value as Palette) ? (value as Palette) : undefined)
});
