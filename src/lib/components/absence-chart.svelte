<script lang="ts">
    import * as Card from '$lib/components/ui/card';
    import * as m from '$lib/paraglide/messages.js';
    import type { AbsenceRecord } from '$lib/types';
    import { browser } from '$app/environment';
    import { computeAbsencesBySemester } from '$lib/statsUtils';
    import { Chart, Bars, Svg, Axis, Tooltip } from 'layerchart';
    import { scaleBand } from 'd3';

    let { absences }: { absences: AbsenceRecord[] } = $props();

    const TYPE_COLORS: Record<string, string> = {
        sick: 'var(--chart-1)',
        vacation: 'var(--chart-2)',
        military: 'var(--chart-3)',
        uk: 'var(--chart-4)',
        berufsschule: 'var(--chart-5)',
        custom: '#a3a3a3'
    };

    const TYPE_LABELS: Record<string, string> = {
        sick: m.absence_type_sick(),
        vacation: m.absence_type_vacation(),
        military: m.absence_type_military(),
        uk: m.absence_type_uk(),
        berufsschule: m.absence_type_berufsschule(),
        custom: m.absence_type_custom()
    };

    const rawData = $derived(computeAbsencesBySemester(absences));


    const semesters = $derived([...new Set(rawData.map((d) => d.semester))]);

    const types = $derived([...new Set(rawData.map((d) => d.type))]);

    const chartData = $derived(
        semesters.map((sem) => {
            const entry: Record<string, number | string> = { semester: sem };
            for (const t of types) {
                const found = rawData.find((d) => d.semester === sem && d.type === t);
                entry[t] = found ? found.days : 0;
            }
            return entry;
        })
    );
</script>

{#if browser && absences.length > 0}
    <Card.Root class="gap-1">
        <Card.Header class="pt-5 pb-0">
            <Card.Title>{m.absence_chart_title()}</Card.Title>
            <Card.Description>{m.absence_chart_desc()}</Card.Description>
        </Card.Header>
        <Card.Content class="pb-4">
            <div class="h-96 w-full [&_text]:fill-foreground">
                <Chart
                        data={chartData}
                        x="semester"
                        xScale={scaleBand().padding(0.3)}
                        yDomain={[0, null]}
                        yNice
                        padding={{ top: 8, right: 8, bottom: 28, left: 40 }}
                >
                    <Svg>
                        <Axis placement="bottom" />
                        <Axis placement="left" grid />
                        {#each types as type (type)}
                            <Bars
                                    y={type}
                                    fill={TYPE_COLORS[type] ?? '#a3a3a3'}
                                    radius={4}
                                    rounded="top"
                            />
                        {/each}
                    </Svg>
                    <Tooltip.Root let:data>
                        {#each types as type (type)}
                            {#if data[type]}
                                <Tooltip.Item label={TYPE_LABELS[type] ?? type} value={`${data[type]} Tage`} />
                            {/if}
                        {/each}
                    </Tooltip.Root>
                </Chart>
            </div>

            <ul class="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
                {#each types as type (type)}
                    <li class="flex items-center gap-1.5">
						<span
                                class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                style="background:{TYPE_COLORS[type] ?? '#a3a3a3'}"
                        ></span>
                        {TYPE_LABELS[type] ?? type}
                    </li>
                {/each}
            </ul>
        </Card.Content>
    </Card.Root>
{/if}