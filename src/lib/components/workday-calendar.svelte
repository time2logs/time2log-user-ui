<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import * as m from '$lib/paraglide/messages.js';
	import {
		DateFormatter,
		getLocalTimeZone,
		getWeeksInMonth,
		isEqualDay,
		isEqualMonth,
		startOfMonth,
		startOfWeek,
		today,
		type DateValue
	} from '@internationalized/date';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';

	type WorkdayCalendarProps = {
		value?: DateValue;
		locale?: string;
		isDateDisabled?: (date: DateValue) => boolean;
		activityDates?: Set<string>;
	};

	let {
		value = $bindable<DateValue | undefined>(),
		locale = 'en-GB',
		isDateDisabled = () => false,
		activityDates = new Set<string>()
	}: WorkdayCalendarProps = $props();

	const timeZone = getLocalTimeZone();
	let visibleMonth = $state(startOfMonth(value ?? today(timeZone)));
	let lastValueKey = $state(value?.toString() ?? '');

	$effect(() => {
		const nextValueKey = value?.toString() ?? '';
		if (value && nextValueKey !== lastValueKey && !isEqualMonth(value, visibleMonth)) {
			visibleMonth = startOfMonth(value);
		}
		lastValueKey = nextValueKey;
	});

	const currentMonth = $derived(startOfMonth(today(timeZone)));

	const monthLabel = $derived(
		new DateFormatter(locale, { month: 'long', year: 'numeric' }).format(
			visibleMonth.toDate(timeZone)
		)
	);

	const weekdayLabels = $derived.by(() => {
		const weekStart = startOfWeek(today(timeZone), locale);
		const weekdayFormatter = new DateFormatter(locale, { weekday: 'short' });

		return Array.from({ length: 7 }, (_, index) =>
			weekdayFormatter.format(weekStart.add({ days: index }).toDate(timeZone))
		);
	});

	const dayCells = $derived.by(() => {
		const monthStart = startOfMonth(visibleMonth);
		const gridStart = startOfWeek(monthStart, locale);
		const totalCells = getWeeksInMonth(visibleMonth, locale) * 7;
		const todayDate = today(timeZone);

		return Array.from({ length: totalCells }, (_, index) => {
			const date = gridStart.add({ days: index });
			const outsideMonth = !isEqualMonth(date, visibleMonth);
			const disabled = outsideMonth || isDateDisabled(date);
			const selected = value ? isEqualDay(date, value) : false;
			const isToday = isEqualDay(date, todayDate);
			const hasActivity = activityDates.has(date.toString());

			return {
				date,
				dayNumber: date.toDate(timeZone).getDate(),
				outsideMonth,
				disabled,
				selected,
				isToday,
				hasActivity
			};
		});
	});

	const canGoToNextMonth = $derived(visibleMonth.compare(currentMonth) < 0);
	const selectedDateLabel = $derived(value ? formatFullDate(value) : m.calendar_no_date_selected());

	function formatFullDate(date: DateValue) {
		return new DateFormatter(locale, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(date.toDate(timeZone));
	}

	function goToPreviousMonth() {
		visibleMonth = startOfMonth(visibleMonth.subtract({ months: 1 }));
	}

	function goToNextMonth() {
		if (!canGoToNextMonth) return;

		const nextMonth = startOfMonth(visibleMonth.add({ months: 1 }));
		if (nextMonth.compare(currentMonth) <= 0) {
			visibleMonth = nextMonth;
		}
	}

	function selectDate(date: DateValue, disabled: boolean) {
		if (disabled) return;
		value = date;
	}
</script>

<div
	class="w-full max-w-md rounded-3xl border border-orange-100/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm"
>
	<div class="mb-4 flex items-center justify-between gap-3">
		<div>
			<h3 class="text-lg font-semibold text-stone-800">{monthLabel}</h3>
		</div>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="icon-sm"
				class="rounded-full border-orange-200 bg-white/80 text-stone-700 hover:border-orange-300 hover:bg-orange-50"
				onclick={goToPreviousMonth}
				aria-label={m.calendar_previous_month()}
			>
				<ChevronLeft class="h-4 w-4" />
			</Button>
			<Button
				variant="outline"
				size="icon-sm"
				class="rounded-full border-orange-200 bg-white/80 text-stone-700 hover:border-orange-300 hover:bg-orange-50 disabled:opacity-40"
				onclick={goToNextMonth}
				disabled={!canGoToNextMonth}
				aria-label={m.calendar_next_month()}
			>
				<ChevronRight class="h-4 w-4" />
			</Button>
		</div>
	</div>

	<div class="mb-3 grid grid-cols-7 gap-2">
		{#each weekdayLabels as weekday}
			<div
				class="px-1 text-center text-[11px] font-semibold tracking-[0.18em] text-stone-500 uppercase"
			>
				{weekday}
			</div>
		{/each}
	</div>

	<div class="grid grid-cols-7 gap-2">
		{#each dayCells as cell (cell.date.toString())}
			<button
				type="button"
				class={cn(
					'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-2xl border text-sm font-medium transition-all',
					cell.outsideMonth && 'border-transparent bg-transparent text-stone-300',
					!cell.outsideMonth &&
						'border-orange-100/80 bg-white/85 text-stone-700 shadow-[0_4px_14px_rgba(120,53,15,0.05)]',
					!cell.disabled &&
						!cell.selected &&
						'cursor-pointer hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:text-stone-900',
					cell.isToday &&
						!cell.selected &&
						'border-amber-300 bg-amber-50 text-amber-900 ring-1 ring-amber-200',
					cell.selected &&
						'border-rose-400 bg-gradient-to-br from-orange-400 to-rose-400 text-white shadow-[0_10px_30px_rgba(244,114,182,0.28)]',
					cell.disabled &&
						'cursor-not-allowed opacity-45 hover:translate-y-0 hover:border-orange-100/80 hover:bg-white/85 hover:text-stone-700',
					!cell.hasActivity &&
						!cell.selected &&
						!cell.isToday &&
						!cell.disabled &&
						!cell.outsideMonth &&
						'opacity-55'
				)}
				onclick={() => selectDate(cell.date, cell.disabled)}
				disabled={cell.disabled}
				aria-pressed={cell.selected}
				aria-label={formatFullDate(cell.date)}
			>
				<span>{cell.dayNumber}</span>
				{#if cell.hasActivity}
					<span
						class={cn('h-1.5 w-1.5 rounded-full', cell.selected ? 'bg-white' : 'bg-emerald-500')}
					></span>
				{:else}
					<span class="h-1.5 w-1.5"></span>
				{/if}
			</button>
		{/each}
	</div>
</div>
