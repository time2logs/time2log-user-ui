<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { X } from 'lucide-svelte';
	import DialogPortal from './dialog-portal.svelte';
	import DialogOverlay from './dialog-overlay.svelte';
	import { cn, type WithoutChild, type WithoutChildrenOrChild } from '$lib/utils.js';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		onClose,
		children,
		...restProps
	}: WithoutChild<DialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
		onClose?: () => void;
	} = $props();
</script>

<DialogPortal {...portalProps}>
	<DialogOverlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			'pointer-events-auto fixed z-[110] border border-stone-200 bg-background bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900',
			'inset-0 flex flex-col overflow-y-auto rounded-none p-6',
			'sm:inset-auto sm:top-[50%] sm:left-[50%] sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:overflow-y-auto sm:rounded-lg',
			className
		)}
		{...restProps}
	>
		{#if children}
			{@render children()}
		{/if}

		<DialogPrimitive.Close
			onclick={onClose}
			class="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:ring-2 focus:ring-stone-950 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-stone-100 data-[state=open]:text-stone-500 dark:ring-offset-slate-900 dark:focus:ring-slate-400 dark:data-[state=open]:bg-slate-800 dark:data-[state=open]:text-slate-400"
		>
			<X class="h-4 w-4" />
			<span class="sr-only">Close</span>
		</DialogPrimitive.Close>
	</DialogPrimitive.Content>
</DialogPortal>
