/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient, Session } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient<any, any, any>;
			supabaseAdmin: SupabaseClient<any, any, any>;
			supabaseServiceRole: SupabaseClient<any, any, any>;
			safeGetSession: () => Promise<Session | null>;
		}
	}
}

export {};
