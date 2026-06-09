<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import type { ActivityRecord } from '$lib/types';
	import { browser } from '$app/environment';
	import { Chart, Bars, Svg, Axis, Tooltip } from 'layerchart';
	import { scaleBand, pie, arc as d3Arc } from 'd3';
	import { formatHoursMinutes } from '$lib/utils';

	import {
		computeHoursThisWeek,
		computeTotalHours,
		computeActiveDaysThisMonth,
		computeActivityBreakdown,
		computeWeeklyData
	} from '$lib/statsUtils';

	let { activities }: { activities: ActivityRecord[] } = $props();

	// ── stat cards ───────────────────────────────────────────────────────────

	function getTodayMidnight(): Date {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}

	const today = $derived(getTodayMidnight());

	const hoursThisWeek = $derived(computeHoursThisWeek(activities, today));
	const totalHours = $derived(computeTotalHours(activities));
	const activeDaysThisMonth = $derived(computeActiveDaysThisMonth(activities, today));

	// ── weekly bar chart data (last 8 weeks) ─────────────────────────────────

	const weeklyData = $derived(computeWeeklyData(activities, today));

	// ── donut / activity breakdown ────────────────────────────────────────────

	const CHART_COLORS = [
		'var(--chart-1)',
		'var(--chart-2)',
		'var(--chart-3)',
		'var(--chart-4)',
		'var(--chart-5)'
	];

	const activityBreakdown = $derived.by(() => {
		const slices = computeActivityBreakdown(activities, 5, m.stats_other());
		return slices.map((s, i) => ({ ...s, color: CHART_COLORS[i % CHART_COLORS.length] }));
	});
</script>

<!-- stat cards row -->
<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
	<Card.Root class="gap-1">
		<Card.Header class="pt-5 pb-0">
			<Card.Description>{m.stats_hours_this_week()}</Card.Description>
		</Card.Header>
		<Card.Content class="pb-5">
			<p class="text-3xl font-bold tabular-nums">{formatHoursMinutes(hoursThisWeek)}</p>
		</Card.Content>
	</Card.Root>

	<Card.Root class="gap-1">
		<Card.Header class="pt-5 pb-0">
			<Card.Description>{m.stats_total_hours()}</Card.Description>
		</Card.Header>
		<Card.Content class="pb-5">
			<p class="text-3xl font-bold tabular-nums">{formatHoursMinutes(totalHours)}</p>
		</Card.Content>
	</Card.Root>

	<Card.Root class="gap-1">
		<Card.Header class="pt-5 pb-0">
			<Card.Description>{m.stats_active_days_month()}</Card.Description>
		</Card.Header>
		<Card.Content class="pb-5">
			<p class="text-3xl font-bold tabular-nums">{activeDaysThisMonth}</p>
		</Card.Content>
	</Card.Root>
</div>

<!-- charts row -->
{#if browser}
	<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- weekly bar chart -->
		<Card.Root class="gap-1">
			<Card.Header class="pt-5 pb-0">
				<Card.Title>{m.stats_weekly_hours_title()}</Card.Title>
				<Card.Description>{m.stats_weekly_hours_desc()}</Card.Description>
			</Card.Header>
			<Card.Content class="pb-0">
				<div class="h-64 w-full [&_text]:fill-foreground">
					<Chart
						data={weeklyData}
						x="label"
						y="hours"
						xScale={scaleBand().padding(0.3)}
						yDomain={[0, null]}
						yNice
						padding={{ top: 8, right: 8, bottom: 28, left: 40 }}
					>
						<Svg>
							<Axis placement="bottom" />
							<Axis placement="left" grid />
							<Bars radius={4} rounded="top" fill="var(--chart-1)" />
						</Svg>
						<Tooltip.Root let:data>
							<Tooltip.Item label={data.label} value={formatHoursMinutes(data.hours)} />
						</Tooltip.Root>
					</Chart>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- activity donut -->
		<Card.Root class="gap-1">
			<Card.Header class="pt-5 pb-0">
				<Card.Title>{m.stats_activity_breakdown_title()}</Card.Title>
				<Card.Description>{m.stats_activity_breakdown_desc()}</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col items-center gap-4 pb-6">
				{#if activityBreakdown.length === 0}
					<p class="text-sm text-muted-foreground">{m.no_activities_found()}</p>
				{:else}
					<div class="flex h-56 w-full items-center justify-center">
						<svg viewBox="-100 -100 200 200" class="h-full w-full max-w-xs">
							{#each pie().value((d) => d.hours)(activityBreakdown) as slice (slice.data.name)}
								<path
									d={d3Arc().innerRadius(40).outerRadius(80).padAngle(0.02)(slice) ?? ''}
									fill={slice.data.color}
									opacity="0.85"
								/>
							{/each}
						</svg>
					</div>
					<!-- legend -->
					<ul class="flex w-full flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
						{#each activityBreakdown as slice (slice.name)}
							<li class="flex items-center gap-1.5">
								<span
									class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
									style="background:{slice.color}"
								></span>
								<span class="max-w-[120px] truncate" title={slice.name}>{slice.name}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
{/if}
