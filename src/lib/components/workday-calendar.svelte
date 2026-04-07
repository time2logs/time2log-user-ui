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
		isAbsenceDate?: (dateStr: string) => boolean;
	};

	let {
		value = $bindable<DateValue | undefined>(),
		locale = 'en-GB',
		isDateDisabled = () => false,
		activityDates = new Set<string>(),
		isAbsenceDate = () => false
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
			const dayOfWeek = date.toDate(timeZone).getDay();
			const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
			const disabled = outsideMonth || isDateDisabled(date);
			const selected = value ? isEqualDay(date, value) : false;
			const isToday = isEqualDay(date, todayDate);
			const dateStr = date.toString();
			const hasActivity = activityDates.has(dateStr);
			const hasAbsence = isAbsenceDate(dateStr);

			return {
				date,
				dayNumber: date.toDate(timeZone).getDate(),
				outsideMonth,
				isWeekend,
				disabled,
				selected,
				isToday,
				hasActivity,
				hasAbsence
			};
		});
	});

	const canGoToNextMonth = $derived(visibleMonth.compare(currentMonth) < 0);

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

<div class="w-full max-w-md rounded-3xl border border-border bg-card p-3 shadow-sm sm:p-4">
	<div class="mb-3 flex items-center justify-between gap-2 sm:mb-4 sm:gap-3">
		<div>
			<h3 class="text-base font-semibold text-card-foreground sm:text-lg">{monthLabel}</h3>
		</div>
		<div class="flex items-center gap-1 sm:gap-2">
			<Button
				variant="outline"
				size="icon-sm"
				class="h-8 w-8 rounded-full sm:h-9 sm:w-9"
				onclick={goToPreviousMonth}
				aria-label={m.calendar_previous_month()}
			>
				<ChevronLeft class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
			</Button>
			<Button
				variant="outline"
				size="icon-sm"
				class="h-8 w-8 rounded-full disabled:opacity-40 sm:h-9 sm:w-9"
				onclick={goToNextMonth}
				disabled={!canGoToNextMonth}
				aria-label={m.calendar_next_month()}
			>
				<ChevronRight class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
			</Button>
		</div>
	</div>

	<div class="mb-2 grid grid-cols-7 gap-1 sm:mb-3 sm:gap-2">
		{#each weekdayLabels as weekday (weekday)}
			<div
				class="px-0.5 text-center text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase sm:px-1 sm:text-[11px]"
			>
				{weekday}
			</div>
		{/each}
	</div>

	<div class="grid grid-cols-7 gap-1 sm:gap-2">
		{#each dayCells as cell (cell.date.toString())}
			<button
				type="button"
				class={cn(
					'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-xs font-medium transition-all sm:rounded-xl sm:text-sm',
					cell.outsideMonth && 'border-transparent bg-transparent text-muted-foreground/40',
					!cell.outsideMonth && 'border-border bg-card text-foreground shadow-sm',
					!cell.disabled &&
						!cell.selected &&
						'cursor-pointer hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent hover:text-accent-foreground',
					cell.isToday && !cell.selected && 'border-primary/30 bg-primary/10 text-primary',
					cell.selected && 'border-primary bg-primary text-primary-foreground shadow-md',
					cell.disabled && 'cursor-not-allowed opacity-50 hover:translate-y-0'
				)}
				onclick={() => selectDate(cell.date, cell.disabled)}
				disabled={cell.disabled}
				aria-pressed={cell.selected}
				aria-label={formatFullDate(cell.date)}
			>
				<span>{cell.dayNumber}</span>
				{#if !cell.outsideMonth && !cell.isWeekend && !cell.disabled && !cell.hasActivity && !cell.hasAbsence}
					<span
						class={cn(
							'h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5',
							cell.selected ? 'bg-primary-foreground' : 'bg-amber-500 dark:bg-amber-400'
						)}
					></span>
				{:else}
					<span class="h-1 w-1 rounded-full opacity-0 sm:h-1.5 sm:w-1.5"></span>
				{/if}
			</button>
		{/each}
	</div>
</div>
