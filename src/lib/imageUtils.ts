const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const MIN_WIDTH = 200;
const TARGET_SIZE_BYTES = 500 * 1024;
const INITIAL_QUALITY = 0.9;
const RESIZE_QUALITY = 0.7;
const QUALITY_STEP = 0.1;
const MIN_QUALITY = 0.1;
const RESIZE_STEP = 200;

export async function compressImage(file: File): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = (event) => {
			const img = new Image();
			img.src = event.target?.result as string;
			img.onload = () => {
				const canvas = document.createElement('canvas');
				let maxWidth = MAX_WIDTH;
				let maxHeight = MAX_HEIGHT;
				let width = img.width;
				let height = img.height;

				if (width > height) {
					if (width > maxWidth) {
						height *= maxWidth / width;
						width = maxWidth;
					}
				} else {
					if (height > maxHeight) {
						width *= maxHeight / height;
						height = maxHeight;
					}
				}

				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext('2d');
				ctx?.drawImage(img, 0, 0, width, height);

				let quality = INITIAL_QUALITY;

				const attemptBlob = () => {
					canvas.toBlob(
						(blob) => {
							if (blob) {
								if (blob.size > TARGET_SIZE_BYTES && quality > MIN_QUALITY) {
									quality -= QUALITY_STEP;
									attemptBlob();
								} else if (blob.size > TARGET_SIZE_BYTES && maxWidth > MIN_WIDTH) {
									maxWidth -= RESIZE_STEP;
									maxHeight -= RESIZE_STEP;

									let newWidth = img.width;
									let newHeight = img.height;
									if (newWidth > newHeight) {
										if (newWidth > maxWidth) {
											newHeight *= maxWidth / newWidth;
											newWidth = maxWidth;
										}
									} else {
										if (newHeight > maxHeight) {
											newWidth *= maxHeight / newHeight;
											newHeight = maxHeight;
										}
									}
									canvas.width = newWidth;
									canvas.height = newHeight;
									ctx?.drawImage(img, 0, 0, newWidth, newHeight);
									quality = RESIZE_QUALITY;
									attemptBlob();
								} else {
									resolve(blob);
								}
							} else {
								reject(new Error('Canvas to Blob failed'));
							}
						},
						'image/jpeg',
						quality
					);
				};
				attemptBlob();
			};
			img.onerror = () => reject(new Error('Image load failed'));
		};
		reader.onerror = () => reject(new Error('FileReader failed'));
	});
}
