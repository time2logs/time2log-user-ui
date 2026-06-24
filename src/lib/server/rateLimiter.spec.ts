import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkRateLimit, hashId, getClientId, rateKey, resetRateLimiter } from './rateLimiter';

beforeEach(() => {
	resetRateLimiter();
});

afterEach(() => {
	resetRateLimiter();
});

describe('checkRateLimit', () => {
	it('allows the first request', () => {
		const result = checkRateLimit('test-key', 5, 60_000);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(4);
	});

	it('allows up to max requests', () => {
		checkRateLimit('test-key', 3, 60_000);
		checkRateLimit('test-key', 3, 60_000);
		const result = checkRateLimit('test-key', 3, 60_000);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(0);
	});

	it('blocks the request exceeding max', () => {
		for (let i = 0; i < 3; i++) checkRateLimit('test-key', 3, 60_000);
		const result = checkRateLimit('test-key', 3, 60_000);
		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
	});

	it('returns retryAfterSeconds > 0 when blocked', () => {
		for (let i = 0; i < 2; i++) checkRateLimit('test-key', 2, 60_000);
		const result = checkRateLimit('test-key', 2, 60_000);
		expect(result.allowed).toBe(false);
		expect(result.retryAfterSeconds).toBeGreaterThan(0);
	});

	it('resets after the window expires', () => {
		for (let i = 0; i < 3; i++) checkRateLimit('test-key', 3, 1);
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				const result = checkRateLimit('test-key', 3, 1);
				expect(result.allowed).toBe(true);
				expect(result.remaining).toBe(2);
				resolve();
			}, 10);
		});
	});

	it('tracks different keys independently', () => {
		const r1 = checkRateLimit('key-a', 1, 60_000);
		const r2 = checkRateLimit('key-b', 1, 60_000);
		expect(r1.allowed).toBe(true);
		expect(r2.allowed).toBe(true);
	});
});

describe('hashId', () => {
	it('produces a stable 16-char hex string', () => {
		const hash = hashId('test@example.com');
		expect(hash).toHaveLength(16);
		expect(hash).toMatch(/^[0-9a-f]+$/);
	});

	it('is case-insensitive', () => {
		expect(hashId('Test@Example.com')).toBe(hashId('test@example.com'));
	});

	it('produces different hashes for different inputs', () => {
		expect(hashId('a@example.com')).not.toBe(hashId('b@example.com'));
	});
});

describe('getClientId', () => {
	it('returns the address when getClientAddress is available', () => {
		const event = { getClientAddress: () => '192.168.1.1' };
		expect(getClientId(event)).toBe('192.168.1.1');
	});

	it('trims whitespace', () => {
		const event = { getClientAddress: () => '  192.168.1.1  ' };
		expect(getClientId(event)).toBe('192.168.1.1');
	});

	it('returns "unknown" when getClientAddress is missing', () => {
		expect(getClientId({})).toBe('unknown');
	});

	it('returns "unknown" when getClientAddress returns empty', () => {
		const event = { getClientAddress: () => '' };
		expect(getClientId(event)).toBe('unknown');
	});

	it('returns "unknown" when getClientAddress throws', () => {
		const event = {
			getClientAddress: () => {
				throw new Error('not available');
			}
		};
		expect(getClientId(event)).toBe('unknown');
	});
});

describe('rateKey', () => {
	it('combines scope and identifier with a colon', () => {
		expect(rateKey('onboarding', 'abc123')).toBe('onboarding:abc123');
	});
});
