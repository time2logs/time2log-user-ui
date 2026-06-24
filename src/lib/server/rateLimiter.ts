import { createHash } from 'node:crypto';

// ponytail: in-memory fixed-window rate limiter. Single process only — fine while
// the app runs on one Node adapter instance. Swap for a shared store (Redis/Upstash)
// when running horizontally behind a load balancer.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export type RateLimitResult = {
	allowed: boolean;
	remaining: number;
	retryAfterSeconds: number;
};

function maybePrune(now: number): void {
	if (buckets.size <= MAX_BUCKETS) return;
	for (const [k, b] of buckets) {
		if (now >= b.resetAt) buckets.delete(k);
	}
}

/**
 * Fixed-window counter rate limit. Returns whether the request is allowed and
 * how many seconds until the window resets (for Retry-After / user messaging).
 */
export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
	const now = Date.now();
	const bucket = buckets.get(key);

	if (!bucket || now >= bucket.resetAt) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		maybePrune(now);
		return { allowed: true, remaining: max - 1, retryAfterSeconds: 0 };
	}

	bucket.count += 1;
	const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

	if (bucket.count > max) {
		return { allowed: false, remaining: 0, retryAfterSeconds };
	}

	return { allowed: true, remaining: max - bucket.count, retryAfterSeconds };
}

/** Stable, non-reversible key component so PII (email/phone) never lands in the key verbatim. */
export function hashId(value: string): string {
	return createHash('sha256').update(value.toLowerCase()).digest('hex').slice(0, 16);
}

/**
 * Best-effort client identifier. Falls back to 'unknown' when SvelteKit cannot
 * resolve an address (e.g. local dev, tests), so limiting degrades gracefully
 * rather than crashing.
 */
export function getClientId(event: { getClientAddress?: () => string }): string {
	try {
		const addr = event.getClientAddress?.();
		return addr ? addr.trim() : 'unknown';
	} catch {
		return 'unknown';
	}
}

/** Compose a namespaced rate-limit key. */
export function rateKey(scope: string, identifier: string): string {
	return `${scope}:${identifier}`;
}

/** Reset all buckets. Intended for tests. */
export function resetRateLimiter(): void {
	buckets.clear();
}
