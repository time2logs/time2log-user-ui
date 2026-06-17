<script lang="ts" module>
	import { cn } from '$lib/utils.js';
	import { type VariantProps, tv } from 'tailwind-variants';

	export const alertVariants = tv({
		base: 'flex items-start gap-2 rounded-lg border p-3 text-sm',
		variants: {
			variant: {
				default: 'border-border bg-card text-card-foreground',
				error: 'border-destructive/20 bg-destructive/10 text-destructive',
				success: 'border-success/20 bg-success/10 text-success',
				warning: 'border-warning/20 bg-warning/10 text-warning',
				info: 'border-primary/20 bg-primary/10 text-primary'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	});

	export type AlertVariant = VariantProps<typeof alertVariants>['variant'];

	export type AlertProps = {
		class?: string;
		variant?: AlertVariant;
		children?: import('svelte').Snippet;
	};
</script>

<script lang="ts">
	let { class: className, variant = 'default', children }: AlertProps = $props();
</script>

<div data-slot="alert" class={cn(alertVariants({ variant }), className)}>
	{@render children?.()}
</div>
