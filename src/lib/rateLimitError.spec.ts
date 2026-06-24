import { describe, expect, it } from 'vitest';
import { getRateLimitSeconds } from './rateLimitError';

describe('getRateLimitSeconds', () => {
	it('extracts Supabase retry seconds from a 429 error', () => {
		expect(
			getRateLimitSeconds({
				status: 429,
				code: 'over_email_send_rate_limit',
				message: 'For security purposes, you can only request this after 41 seconds.'
			})
		).toBe('41');
	});

	it('returns null for normal errors (non-429, no rate-limit text)', () => {
		expect(getRateLimitSeconds({ status: 400, message: 'Invalid login credentials' })).toBeNull();
	});

	it('returns null for null input', () => {
		expect(getRateLimitSeconds(null)).toBeNull();
	});

	it('returns null for non-object input', () => {
		expect(getRateLimitSeconds('rate limit exceeded')).toBeNull();
		expect(getRateLimitSeconds(undefined)).toBeNull();
		expect(getRateLimitSeconds(429)).toBeNull();
	});

	it('returns "60" as default when status is 429 but no "after N seconds" in message', () => {
		expect(getRateLimitSeconds({ status: 429, message: 'Too many requests' })).toBe('60');
	});

	it('returns "60" when status is 429 and message is empty', () => {
		expect(getRateLimitSeconds({ status: 429 })).toBe('60');
	});

	it('detects rate limit from "rate limit" text in message without status 429', () => {
		expect(
			getRateLimitSeconds({ message: 'Rate limit exceeded. Try again after 30 seconds.' })
		).toBe('30');
	});

	it('detects rate limit from "too many" text in message without status 429', () => {
		expect(getRateLimitSeconds({ message: 'Too many requests' })).toBe('60');
	});

	it('detects rate limit from code field', () => {
		expect(getRateLimitSeconds({ code: 'rate_limited', message: 'after 5 seconds' })).toBe('5');
	});

	it('extracts singular "second" form', () => {
		expect(getRateLimitSeconds({ status: 429, message: 'after 1 second' })).toBe('1');
	});
});
