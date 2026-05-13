export function getFormString(
	formData: FormData,
	key: string,
	options: { trim?: boolean; lowercase?: boolean } = {}
): string {
	let value = formData.get(key)?.toString() ?? '';
	if (options.trim !== false) value = value.trim();
	if (options.lowercase) value = value.toLowerCase();
	return value;
}
