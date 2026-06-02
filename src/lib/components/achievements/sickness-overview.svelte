<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import { HeartPulse } from 'lucide-svelte';

	let {
		sickThisYear,
		sickAllTime,
		workdays
	}: { sickThisYear: number; sickAllTime: number; workdays: number } = $props();
	const sicknessRatePercent = $derived(
		workdays > 0 ? Math.round((sickAllTime / workdays) * 100) : 0
	);
</script>

<Card.Root>
	<Card.Header class="pt-5 pb-2">
		<Card.Title class="flex items-center gap-2 text-base font-semibold">
			<HeartPulse class="h-4 w-4 text-primary" />
			{m.achievement_section_sickness()}
		</Card.Title>
	</Card.Header>
	<Card.Content class="pb-5">
		<div class="grid grid-cols-3 gap-3 text-center">
			<div>
				<p class="text-2xl font-bold tabular-nums">{sickThisYear}</p>
				<p class="text-[11px] text-muted-foreground">{m.achievement_sick_this_year()}</p>
			</div>
			<div>
				<p class="text-2xl font-bold tabular-nums">{sickAllTime}</p>
				<p class="text-[11px] text-muted-foreground">{m.achievement_sick_all_time()}</p>
			</div>
			<div>
				<p class="text-2xl font-bold tabular-nums">{sicknessRatePercent}%</p>
				<p class="text-[11px] text-muted-foreground">
					{m.achievement_sick_rate({ sick: sickAllTime, work: workdays })}
				</p>
			</div>
		</div>
	</Card.Content>
</Card.Root>
