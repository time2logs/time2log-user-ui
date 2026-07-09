import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * An older deploy registered the PWA service worker under the `/auth/` scope.
 * Installed clients keep polling this URL forever. Redirect to the current
 * service worker (served by @vite-pwa/sveltekit at `/sw.js`, scope `/`) so they
 * update and stop 404-ing on every page load.
 */
export const GET: RequestHandler = () => {
	throw redirect(302, '/sw.js');
};
