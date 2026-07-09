import { createServerClient } from '@supabase/ssr';
import { type Handle } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';

export const handle: Handle = async ({ event, resolve }) => {
	// NOTE: Only ONE cookie-backed SSR client is created per request.
	// @supabase/ssr's createServerClient registers an async onAuthStateChange
	// callback that writes cookies when the session refreshes, and each client
	// instance refreshes the single shared refresh token independently. Two
	// clients → two concurrent refreshes → "refresh_token_already_used" (400)
	// and "session state changed mid-flight" (409). Admin-schema queries use
	// `supabase.schema('admin')` on this same client instead.
	const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (
				cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
			) => {
				// A token refresh can resolve asynchronously after the response has
				// already been generated (the auth-js subscriber notification runs in
				// a detached Promise). Once the response is out, event.cookies.set
				// throws and would crash the node process (adapter-node). Swallow it
				// gracefully — the refreshed token is persisted on the next request
				// that mutates cookies while the response is still being built.
				for (const { name, value, options } of cookiesToSet) {
					try {
						event.cookies.set(name, value, { ...options, path: '/' });
					} catch {
						// response already generated; cookie cannot be set for this response
					}
				}
			}
		},
		db: { schema: 'app' }
	});

	event.locals.supabase = supabase;

	// Secret client — bypasses RLS, used for admin operations (e.g. creating users, invite lookups).
	// Support both key names for compatibility across local/remote environments.
	const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
	if (!secretKey) {
		throw new Error('SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not configured');
	}
	event.locals.supabaseSecret = createClient(PUBLIC_SUPABASE_URL, secretKey, {
		db: { schema: 'admin' }
	});

	event.locals.safeGetSession = async () => {
		const {
			data: { user },
			error
		} = await supabase.auth.getUser();
		if (error || !user) return null;

		const {
			data: { session },
			error: sessionError
		} = await supabase.auth.getSession();
		if (sessionError) return null;
		return session;
	};

	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});

	// Security headers
	const supabaseOrigin = new URL(PUBLIC_SUPABASE_URL).origin;
	response.headers.set(
		'Content-Security-Policy',
		[
			`default-src 'self'`,
			// SvelteKit requires unsafe-inline for hydration scripts; unsafe-eval is not needed
			`script-src 'self' 'unsafe-inline'`,
			// Tailwind and Svelte emit inline styles
			`style-src 'self' 'unsafe-inline'`,
			// Supabase API + realtime websocket
			`connect-src 'self' ${supabaseOrigin} wss://${new URL(PUBLIC_SUPABASE_URL).host}`,
			// Avatars are served from Supabase storage (same origin) + data URIs for previews
			`img-src 'self' data: blob: ${supabaseOrigin}`,
			`font-src 'self'`,
			`frame-src 'none'`,
			`frame-ancestors 'none'`,
			`object-src 'none'`,
			`base-uri 'self'`,
			`form-action 'self'`
		].join('; ')
	);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	// HSTS: only meaningful over HTTPS (ignored on HTTP in dev)
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

	return response;
};
