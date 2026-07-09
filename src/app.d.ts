/// <reference types="vite-plugin-pwa/client" />

/* eslint-disable @typescript-eslint/no-explicit-any */
// See https://svelte.dev/docs/kit/types#app
import type { SupabaseClient, Session } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient<any, any, any>;
			supabaseSecret: SupabaseClient<any, any, any>;
			safeGetSession: () => Promise<Session | null>;
		}
	}
}

export {};
