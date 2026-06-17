import { writable, type Updater } from 'svelte/store';
import { browser } from '$app/environment';

export interface PersistentStoreOptions<T> {
	/** Called whenever the value changes (browser-only). */
	apply?: (value: T) => void;
	/** Parse and validate a raw stored string. Return `undefined` to fall back to the default. */
	validate?: (value: string) => T | undefined;
}

/**
 * Generic factory for a Svelte store that persists to localStorage and
 * optionally applies a side-effect (e.g. toggling a CSS class).
 */
export function createPersistentStore<T extends string>(
	key: string,
	fallback: T,
	options: PersistentStoreOptions<T> = {}
) {
	const { apply, validate } = options;

	const getInitial = (): T => {
		if (!browser) return fallback;
		const stored = localStorage.getItem(key);
		if (stored !== null) {
			const parsed = validate?.(stored);
			if (parsed !== undefined) return parsed;
		}
		return fallback;
	};

	const { subscribe, set, update } = writable<T>(getInitial());

	const persist = (value: T) => {
		if (!browser) return;
		localStorage.setItem(key, value);
		apply?.(value);
	};

	return {
		subscribe,
		set: (value: T) => {
			persist(value);
			set(value);
		},
		update: (updater: Updater<T>) => {
			update((current) => {
				const next = updater(current);
				persist(next);
				return next;
			});
		},
		initialize: () => {
			if (!browser) return;
			const value = getInitial();
			apply?.(value);
			set(value);
		}
	};
}
