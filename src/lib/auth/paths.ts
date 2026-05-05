const PUBLIC_PATH_PREFIXES = ['/login', '/impressum', '/privacy', '/onboarding'];
const ONBOARDING_ALLOWED_PREFIXES = ['/onboarding', '/login'];

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
	return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPublicPath(pathname: string): boolean {
	return pathname === '/' || matchesPrefix(pathname, PUBLIC_PATH_PREFIXES);
}

export function isOnboardingAllowedPath(pathname: string): boolean {
	return matchesPrefix(pathname, ONBOARDING_ALLOWED_PREFIXES);
}
