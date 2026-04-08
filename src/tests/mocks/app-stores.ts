import { writable } from 'svelte/store';

export const page = writable({
	url: new URL('http://localhost/'),
	params: {},
	route: { id: null }
});
export const navigating = writable(null);
export const updated = writable(false);
