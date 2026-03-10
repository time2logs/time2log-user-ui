import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { type Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';

export const handle: Handle = async ({ event, resolve }) => {
	const cookieOptions = {
		getAll: () => event.cookies.getAll(),
		setAll: (cookiesToSet: { name: string; value: string; options: any }[]) => {
			cookiesToSet.forEach(({ name, value, options }) => {
				event.cookies.set(name, value, { ...options, path: '/' });
			});
		}
	};

	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: cookieOptions,
		db: { schema: 'app' }
	});

	event.locals.supabaseAdmin = createServerClient(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: cookieOptions,
			db: { schema: 'admin' }
		}
	);

	// Service role client — bypasses RLS, used for admin operations (e.g. creating users, invite lookups)
	const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
	event.locals.supabaseServiceRole = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey ?? '', {
		db: { schema: 'admin' }
	});

	event.locals.safeGetSession = async () => {
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error || !user) return null;

		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		return session;
	};

	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});

	if (response.status === 404) {
		throw redirect(302, '/login');
	}

	return response;
};
