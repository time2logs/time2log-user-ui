const IMAGE_SIGNATURES: { bytes: number[]; ext: string }[] = [
	{ bytes: [0xff, 0xd8, 0xff], ext: 'jpg' }, // JPEG
	{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], ext: 'png' }, // PNG
	{ bytes: [0x47, 0x49, 0x46, 0x38], ext: 'gif' } // GIF
];

/**
 * Validates an uploaded image file using magic bytes instead of the client-supplied MIME type.
 * Returns the safe file extension to use, or null if the file is not a recognized image format.
 */
export async function validateImageMagicBytes(file: File): Promise<string | null> {
	const buffer = await file.arrayBuffer();
	const bytes = new Uint8Array(buffer);

	// WEBP: bytes 0–3 = RIFF, bytes 8–11 = WEBP
	if (
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return 'webp';
	}

	for (const sig of IMAGE_SIGNATURES) {
		if (sig.bytes.every((b, i) => bytes[i] === b)) {
			return sig.ext;
		}
	}

	return null;
}
