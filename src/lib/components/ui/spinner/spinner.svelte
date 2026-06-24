<script lang="ts" module>
	import { cn } from '$lib/utils.js';
	import { type VariantProps, tv } from 'tailwind-variants';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

	export const spinnerVariants = tv({
		base: 'animate-spin',
		variants: {
			size: {
				sm: 'size-4',
				default: 'size-5',
				lg: 'size-8'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	});

	export type SpinnerSize = VariantProps<typeof spinnerVariants>['size'];

	export type SpinnerProps = {
		class?: string;
		size?: SpinnerSize;
	};
</script>

<script lang="ts">
	let { class: className, size = 'default' }: SpinnerProps = $props();
</script>

<LoaderCircleIcon class={cn(spinnerVariants({ size }), 'text-current', className)} />
