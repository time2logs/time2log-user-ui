<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import type { ActivityRecord } from '$lib/types';
	import { browser } from '$app/environment';
	import { Chart, Bars, Svg, Axis, Tooltip } from 'layerchart';
	import { scaleBand, pie, arc as d3Arc } from 'd3';

	let { activities }: { activities: ActivityRecord[] } = $props();

	// ── helpers ──────────────────────────────────────────────────────────────

	function getMondayOfWeek(date: Date): Date {
		const day = date.getDay(); // 0 = Sun
		const diff = day === 0 ? -6 : 1 - day;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const monday = new Date(date);
		monday.setDate(date.getDate() + diff);
		monday.setHours(0, 0, 0, 0);
		return monday;
	}

	function isoFromDate(date: Date): string {
		return date.toISOString().slice(0, 10);
	}

	// ── stat cards ───────────────────────────────────────────────────────────

	function getTodayMidnight(): Date {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}

	const today = $derived(getTodayMidnight());

	const currentWeekStart = $derived(getMondayOfWeek(today));
	const currentWeekStartIso = $derived(isoFromDate(currentWeekStart));
	const todayIso = $derived(isoFromDate(today));

	const hoursThisWeek = $derived(
		activities
			.filter((a) => a.entry_date >= currentWeekStartIso && a.entry_date <= todayIso)
			.reduce((sum, a) => sum + a.hours, 0)
	);

	const totalHours = $derived(activities.reduce((sum, a) => sum + a.hours, 0));

	const currentMonthPrefix = $derived(todayIso.slice(0, 7)); // "2026-04"

	const activeDaysThisMonth = $derived(
		new Set(
			activities.filter((a) => a.entry_date.startsWith(currentMonthPrefix)).map((a) => a.entry_date)
		).size
	);

	// ── weekly bar chart data (last 8 weeks) ─────────────────────────────────

	const weeklyData = $derived.by(() => {
		const weeks: { label: string; hours: number }[] = [];
		for (let i = 7; i >= 0; i--) {
			const monday = getMondayOfWeek(new Date(today.getTime() - i * 7 * 86_400_000));
			const sunday = new Date(monday.getTime() + 6 * 86_400_000);
			const from = isoFromDate(monday);
			const to = isoFromDate(sunday);
			const hours = activities
				.filter((a) => a.entry_date >= from && a.entry_date <= to)
				.reduce((sum, a) => sum + a.hours, 0);
			// Short label: "Apr 7"
			const label = monday.toLocaleDateString('en', { month: 'short', day: 'numeric' });
			weeks.push({ label, hours });
		}
		return weeks;
	});

	// ── donut / activity breakdown ────────────────────────────────────────────

	const TOP_N = 5;
	const CHART_COLORS = [
		'var(--chart-1)',
		'var(--chart-2)',
		'var(--chart-3)',
		'var(--chart-4)',
		'var(--chart-5)'
	];

	const activityBreakdown = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const map = new Map<string, number>();
		for (const a of activities) {
			map.set(a.activity_name, (map.get(a.activity_name) ?? 0) + a.hours);
		}
		const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
		const top = sorted.slice(0, TOP_N);
		const rest = sorted.slice(TOP_N).reduce((sum, [, h]) => sum + h, 0);
		const slices = top.map(([name, hours], i) => ({ name, hours, color: CHART_COLORS[i] }));
		if (rest > 0)
			slices.push({ name: m.stats_other(), hours: rest, color: CHART_COLORS[TOP_N % 5] });
		return slices;
	});
</script>

<!-- stat cards row -->
<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
	<Card.Root>
		<Card.Header class="pb-2">
			<Card.Description>{m.stats_hours_this_week()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="text-3xl font-bold tabular-nums">{hoursThisWeek}</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="pb-2">
			<Card.Description>{m.stats_total_hours()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="text-3xl font-bold tabular-nums">{totalHours}</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="pb-2">
			<Card.Description>{m.stats_active_days_month()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="text-3xl font-bold tabular-nums">{activeDaysThisMonth}</p>
		</Card.Content>
	</Card.Root>
</div>

<!-- charts row -->
{#if browser}
	<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- weekly bar chart -->
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.stats_weekly_hours_title()}</Card.Title>
				<Card.Description>{m.stats_weekly_hours_desc()}</Card.Description>
			</Card.Header>
			<Card.Content class="pb-6">
				<div class="h-56">
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
							<Tooltip.Item label={data.label} value="{data.hours}h" />
						</Tooltip.Root>
					</Chart>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- activity donut -->
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.stats_activity_breakdown_title()}</Card.Title>
				<Card.Description>{m.stats_activity_breakdown_desc()}</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col items-center gap-4 pb-6">
				{#if activityBreakdown.length === 0}
					<p class="text-sm text-muted-foreground">{m.no_activities_found()}</p>
				{:else}
					<div class="flex h-56 w-full items-center justify-center">
						<svg viewBox="0 0 200 200" class="h-full w-full max-w-xs">
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
