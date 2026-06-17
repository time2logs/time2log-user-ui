<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { IconComponent } from '$lib/utils.js';

	type Props = {
		icon: IconComponent;
		href?: string;
		label: string;
		disabled?: boolean;
		class?: string;
		size?: 'icon' | 'icon-sm' | 'icon-lg';
		iconClass?: string;
		onclick?: () => void;
		[key: string]: unknown;
	};

	let {
		icon: Icon,
		href,
		label,
		disabled,
		class: className,
		size = 'icon',
		iconClass = 'h-5 w-5',
		onclick,
		...rest
	}: Props = $props();
</script>

<Button
	variant="ghost"
	{size}
	{href}
	{disabled}
	{onclick}
	aria-label={label}
	class={className}
	{...rest}
>
	<Icon class={iconClass} />
</Button>
