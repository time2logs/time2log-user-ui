import { describe, expect, it } from 'vitest';
import { getRateLimitSeconds } from './rateLimitError';

describe('getRateLimitSeconds', () => {
	it('extracts Supabase retry seconds', () => {
		expect(
			getRateLimitSeconds({
				status: 429,
				code: 'over_email_send_rate_limit',
				message: 'For security purposes, you can only request this after 41 seconds.'
			})
		).toBe('41');
	});

	it('returns null for normal errors', () => {
		expect(getRateLimitSeconds({ status: 400, message: 'Invalid login credentials' })).toBeNull();
	});
});
