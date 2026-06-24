type MaybeRateLimitError = {
	status?: number;
	code?: string;
	message?: string;
};

export function getRateLimitSeconds(error: unknown): string | null {
	if (!error || typeof error !== 'object') return null;

	const { status, code, message } = error as MaybeRateLimitError;
	const text = `${code ?? ''} ${message ?? ''}`;
	if (status !== 429 && !/rate.?limit|too many/i.test(text)) return null;

	return message?.match(/after (\d+) seconds?/i)?.[1] ?? '60';
}
