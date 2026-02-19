<script lang="ts">
	import { getLocale, setLocale } from '$lib/paraglide/runtime';
	import * as Select from '$lib/components/ui/select';

	type Locale = 'en' | 'de-ch' | 'it' | 'fr';

	const locales: Array<{ code: Locale; name: string; flag: string; display: string }> = [
		{ code: 'en', name: 'English', flag: '🇬🇧', display: 'EN' },
		{ code: 'de-ch', name: 'Deutsch', flag: '🇨🇭', display: 'DE' },
		{ code: 'it', name: 'Italiano', flag: '🇮🇹', display: 'IT' },
		{ code: 'fr', name: 'Français', flag: '🇫🇷', display: 'FR' }
	];

	let selectedLocale = $state<Locale>('de-ch');
	let open = $state(false);

	// Initialize from current locale
	try {
		const current = getLocale();
		if (current && locales.some((l) => l.code === current)) {
			selectedLocale = current as Locale;
		}
	} catch {
		// Fall back to localStorage
		const stored = localStorage.getItem('PARAGLIDE_LOCALE');
		if (stored && locales.some((l) => l.code === stored)) {
			selectedLocale = stored as Locale;
		}
	}

	function handleChange() {
		if (!selectedLocale) return;

		// Store in localStorage
		if (typeof window !== 'undefined') {
			localStorage.setItem('PARAGLIDE_LOCALE', selectedLocale);
		}

		// Update cookie and reload
		setLocale(selectedLocale, { reload: false });
		window.location.reload();
	}
</script>

<Select.Root bind:value={selectedLocale} bind:open={open} onValueChange={handleChange} type="single">
	<Select.Trigger class="w-[140px]">
		{#if selectedLocale}
			{@const locale = locales.find((l) => l.code === selectedLocale)}
			{#if locale}
				{locale.flag} {locale.display}
			{/if}
		{/if}
	</Select.Trigger>
	<Select.Content>
		{#each locales as locale}
			<Select.Item value={locale.code} label="{locale.flag} {locale.name}">
				<span class="flex items-center gap-2">
					<span class="text-lg">{locale.flag}</span>
					<span>{locale.name}</span>
					<span class="text-gray-400 text-xs">{locale.display}</span>
				</span>
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
