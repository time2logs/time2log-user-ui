<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages.js';
	import type { AbsenceRecord } from '$lib/types';
	import { computeAbsencesBySemester } from '$lib/statsUtils';
	import { getAbsenceTypeHex, getAbsenceTypeLabel } from '$lib/absence-types';

	let { absences }: { absences: AbsenceRecord[] } = $props();

	const rawData = $derived(computeAbsencesBySemester(absences));
	const types = $derived([...new Set(rawData.map((d) => d.type))].sort());
	const semesters = $derived([...new Set(rawData.map((d) => d.semester))].sort());
	const maxDays = $derived(Math.max(...rawData.map((d) => d.days), 5));

	const svgWidth = 1000;
	const svgHeight = 500;
	const marginLeft = 60;
	const marginRight = 30;
	const marginTop = 30;
	const marginBottom = 80;

	const chartWidth = svgWidth - marginLeft - marginRight;
	const chartHeight = svgHeight - marginTop - marginBottom;

	function getBarX(semesterIndex: number, typeIndex: number): number {
		const semesterSpacing = chartWidth / semesters.length;
		const typeSpacing = semesterSpacing / (types.length + 1);
		return marginLeft + semesterIndex * semesterSpacing + (typeIndex + 1) * typeSpacing;
	}

	function getBarHeight(days: number): number {
		if (maxDays === 0) return 0;
		return (days / maxDays) * chartHeight;
	}

	function getBarY(days: number): number {
		return marginTop + chartHeight - getBarHeight(days);
	}

	function getDaysForSemesterAndType(semester: string, type: string): number {
		return rawData.find((d) => d.semester === semester && d.type === type)?.days ?? 0;
	}
</script>

{#if absences.length > 0}
	<Card.Root class="gap-1">
		<Card.Header class="pt-5 pb-0">
			<Card.Title>{m.absence_chart_title()}</Card.Title>
			<Card.Description>{m.absence_chart_desc()}</Card.Description>
		</Card.Header>
		<Card.Content class="pb-4">
			{#if types.length === 0}
				<p class="py-8 text-center text-sm text-muted-foreground">
					{m.no_absences_found()}
				</p>
			{:else}
				<div class="overflow-x-auto">
					<svg width={svgWidth} height={svgHeight} class="mx-auto border">
						<line
							x1={marginLeft}
							y1={marginTop}
							x2={marginLeft}
							y2={marginTop + chartHeight}
							stroke="currentColor"
							stroke-width="2"
						/>
						<line
							x1={marginLeft}
							y1={marginTop + chartHeight}
							x2={svgWidth - marginRight}
							y2={marginTop + chartHeight}
							stroke="currentColor"
							stroke-width="2"
						/>

						{#each [0, 1, 2, 3, 4, 5] as tick (tick)}
							{@const value = (tick / 5) * maxDays}
							{@const y = marginTop + chartHeight - (tick / 5) * chartHeight}
							<line
								x1={marginLeft - 5}
								y1={y}
								x2={marginLeft}
								y2={y}
								stroke="currentColor"
								stroke-width="1"
							/>
							<text
								x={marginLeft - 10}
								{y}
								text-anchor="end"
								dominant-baseline="middle"
								class="fill-muted-foreground text-xs"
							>
								{Math.round(value)}
							</text>
						{/each}

						{#each [0, 1, 2, 3, 4, 5] as tick (tick)}
							{@const y = marginTop + chartHeight - (tick / 5) * chartHeight}
							<line
								x1={marginLeft}
								y1={y}
								x2={svgWidth - marginRight}
								y2={y}
								stroke="currentColor"
								stroke-width="0.5"
								opacity="0.2"
							/>
						{/each}

						{#each semesters as semester, semesterIndex (semester)}
							{#each types as type, typeIndex (type)}
								{@const days = getDaysForSemesterAndType(semester, type)}
								{@const barHeight = getBarHeight(days)}
								{@const barY = getBarY(days)}
								{@const barWidth = chartWidth / (semesters.length * (types.length + 1))}
								<g>
									<rect
										x={getBarX(semesterIndex, typeIndex) - barWidth / 2}
										y={barY}
										width={barWidth - 2}
										height={barHeight}
										fill={getAbsenceTypeHex(type)}
										opacity="0.85"
										stroke="black"
										stroke-width="1"
									/>
									{#if days > 0}
										<text
											x={getBarX(semesterIndex, typeIndex)}
											y={barY - 5}
											text-anchor="middle"
											class="fill-foreground text-xs font-semibold"
										>
											{days}
										</text>
									{/if}
								</g>
							{/each}
						{/each}
					</svg>
				</div>

				<ul class="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t pt-4 text-sm">
					{#each types as type (type)}
						<li class="flex items-center gap-1.5">
							<span
								class="inline-block h-3 w-3 shrink-0 rounded"
								style="background:{getAbsenceTypeHex(type)}"
							></span>
							{getAbsenceTypeLabel(type)}
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>
{/if}
