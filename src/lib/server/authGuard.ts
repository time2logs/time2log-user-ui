import { redirect } from '@sveltejs/kit';
import type { Session } from '@supabase/supabase-js';

export function requireSession(session: Session | null): asserts session is Session {
	if (!session) throw redirect(302, '/login');
}
