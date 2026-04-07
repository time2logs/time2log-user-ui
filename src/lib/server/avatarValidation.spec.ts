import { describe, expect, it } from 'vitest';
import { validateImageMagicBytes } from './avatarValidation';

function makeFile(bytes: number[], name = 'test', type = 'application/octet-stream'): File {
	return new File([new Uint8Array(bytes)], name, { type });
}

// Pad bytes to 12 so WEBP detection (which reads index 8–11) works correctly
function pad(bytes: number[], length = 12): number[] {
	return [...bytes, ...new Array(Math.max(0, length - bytes.length)).fill(0)];
}

describe('validateImageMagicBytes', () => {
	it('detects JPEG by magic bytes', async () => {
		const file = makeFile(pad([0xff, 0xd8, 0xff, 0xe0]));
		expect(await validateImageMagicBytes(file)).toBe('jpg');
	});

	it('detects PNG by magic bytes', async () => {
		const file = makeFile(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
		expect(await validateImageMagicBytes(file)).toBe('png');
	});

	it('detects GIF by magic bytes', async () => {
		const file = makeFile(pad([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));
		expect(await validateImageMagicBytes(file)).toBe('gif');
	});

	it('detects WEBP by RIFF...WEBP signature', async () => {
		// RIFF at 0–3, arbitrary file size at 4–7, WEBP at 8–11
		const bytes = [
			0x52,
			0x49,
			0x46,
			0x46, // RIFF
			0x00,
			0x00,
			0x00,
			0x00, // file size (ignored)
			0x57,
			0x45,
			0x42,
			0x50 // WEBP
		];
		const file = makeFile(bytes);
		expect(await validateImageMagicBytes(file)).toBe('webp');
	});

	it('returns null for an unrecognized format', async () => {
		const file = makeFile(pad([0x00, 0x01, 0x02, 0x03]));
		expect(await validateImageMagicBytes(file)).toBeNull();
	});

	it('returns null for an empty file', async () => {
		const file = makeFile([]);
		expect(await validateImageMagicBytes(file)).toBeNull();
	});

	it('ignores the client-supplied MIME type (JPEG bytes with text/plain MIME)', async () => {
		const file = makeFile(pad([0xff, 0xd8, 0xff, 0xe0]), 'photo.jpg', 'text/plain');
		expect(await validateImageMagicBytes(file)).toBe('jpg');
	});

	it('rejects a file with a spoofed PNG MIME type but wrong bytes', async () => {
		const file = makeFile(pad([0x00, 0x01, 0x02, 0x03]), 'evil.png', 'image/png');
		expect(await validateImageMagicBytes(file)).toBeNull();
	});
});
