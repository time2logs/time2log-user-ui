import { describe, expect, it } from 'vitest';
import { escapeHtml } from './htmlUtils';

describe('escapeHtml', () => {
	it('escapes ampersands', () => {
		expect(escapeHtml('a & b')).toBe('a &amp; b');
	});

	it('escapes less-than signs', () => {
		expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
	});

	it('escapes greater-than signs', () => {
		expect(escapeHtml('1 > 0')).toBe('1 &gt; 0');
	});

	it('escapes double quotes', () => {
		expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
	});

	it('escapes single quotes', () => {
		expect(escapeHtml("it's fine")).toBe('it&#39;s fine');
	});

	it('escapes all special characters in one string', () => {
		expect(escapeHtml('<a href="test" title=\'x\'>a & b</a>')).toBe(
			'&lt;a href=&quot;test&quot; title=&#39;x&#39;&gt;a &amp; b&lt;/a&gt;'
		);
	});

	it('returns the original string when nothing needs escaping', () => {
		expect(escapeHtml('Hello, world!')).toBe('Hello, world!');
	});

	it('returns an empty string unchanged', () => {
		expect(escapeHtml('')).toBe('');
	});

	it('prevents XSS via org name injection', () => {
		const malicious = '<img src=x onerror="alert(1)">';
		expect(escapeHtml(malicious)).not.toContain('<img');
		expect(escapeHtml(malicious)).not.toContain('>');
	});
});
