<script lang="ts" module>
	import { cn } from '$lib/utils.js';
	import { type VariantProps, tv } from 'tailwind-variants';

	export const badgeVariants = tv({
		base: 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
		variants: {
			variant: {
				default: 'border-transparent bg-primary text-primary-foreground',
				secondary: 'border-transparent bg-secondary text-secondary-foreground',
				success: 'border-transparent bg-success/15 text-success',
				warning: 'border-transparent bg-warning/15 text-warning',
				destructive: 'border-transparent bg-destructive/15 text-destructive',
				outline: 'text-foreground'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	});

	export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

	export type BadgeProps = {
		class?: string;
		variant?: BadgeVariant;
		children?: import('svelte').Snippet;
	};
</script>

<script lang="ts">
	let { class: className, variant = 'default', children }: BadgeProps = $props();
</script>

<span data-slot="badge" class={cn(badgeVariants({ variant }), className)}>
	{@render children?.()}
</span>
