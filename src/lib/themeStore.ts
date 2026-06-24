import { createPersistentStore } from './persistentStore';
import { STORAGE_KEYS } from './storageKeys';

export type Theme = 'light' | 'dark';

const THEMES: Theme[] = ['light', 'dark'];

const applyTheme = (theme: Theme) => {
	document.documentElement.classList.toggle('dark', theme === 'dark');
};

const store = createPersistentStore<Theme>(STORAGE_KEYS.theme, 'light', {
	apply: applyTheme,
	validate: (value) => (THEMES.includes(value as Theme) ? (value as Theme) : undefined)
});

export const theme = {
	subscribe: store.subscribe,
	set: store.set,
	update: store.update,
	initialize: store.initialize,
	toggle: () => store.update((current) => (current === 'light' ? 'dark' : 'light'))
};
