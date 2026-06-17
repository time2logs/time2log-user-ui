const isDev = import.meta.env.DEV;

/**
 * Creates a prefixed debug logger that only outputs in the browser during development.
 * Usage: `const debug = createDebugLogger('ActivityStorage');`
 */
export function createDebugLogger(prefix: string) {
	return {
		log(message: string, data?: unknown) {
			if (isDev && typeof window !== 'undefined') {
				console.log(`[${prefix}] ${message}`, data ?? '');
			}
		}
	};
}
