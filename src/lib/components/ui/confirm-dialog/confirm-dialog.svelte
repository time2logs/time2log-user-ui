<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Spinner } from '$lib/components/ui/spinner';

	type Props = {
		open?: boolean;
		title?: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'default' | 'destructive';
		loading?: boolean;
		onConfirm?: () => void;
		children?: Snippet;
	};

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel,
		cancelLabel,
		variant = 'default',
		loading = false,
		onConfirm,
		children
	}: Props = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		{#if title || description}
			<AlertDialog.Header>
				{#if title}<AlertDialog.Title>{title}</AlertDialog.Title>{/if}
				{#if description}<AlertDialog.Description>{description}</AlertDialog.Description>{/if}
			</AlertDialog.Header>
		{/if}
		{@render children?.()}
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{cancelLabel ?? 'Cancel'}</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={onConfirm}
				disabled={loading}
				class={variant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
			>
				{#if loading}
					<Spinner size="sm" class="mr-2 inline-block" />
				{/if}
				{confirmLabel ?? 'Confirm'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
