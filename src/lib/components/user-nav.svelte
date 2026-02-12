<script lang="ts">
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Button } from "$lib/components/ui/button";
	import { LogOut, Loader2 } from "lucide-svelte";
	import { goto } from "$app/navigation";

	let isLoggingOut = $state(false);

	async function handleLogout() {
		isLoggingOut = true;
		try {
			const response = await fetch('http://localhost:8080/api/logout', {
				method: 'POST',
				credentials: 'include',
			});
			if (response.ok) {
				goto('/login');
			}
		} catch (error) {
			console.error('Logout failed:', error);
		} finally {
			isLoggingOut = false;
		}
	}
</script>

<div class="fixed top-6 right-6 z-50">
	<AlertDialog.Root>
		<AlertDialog.Trigger asChild>
			{#snippet children({ props })}
				<Button
					variant="outline"
					{...props}
					class="rounded-[12px] border-white/50 bg-white/80 shadow-sm backdrop-blur-md hover:bg-white px-4 py-2"
				>
					<LogOut class="mr-2 h-4 w-4 text-gray-600" />
					<span class="font-medium text-gray-700">Abmelden</span>
				</Button>
			{/snippet}
		</AlertDialog.Trigger>

		<AlertDialog.Content class="rounded-[24px] border-white/50 shadow-2xl">
			<AlertDialog.Header>
				<AlertDialog.Title class="text-[20px] font-bold">Abmelden bestätigen</AlertDialog.Title>
				<AlertDialog.Description class="text-[15px]">
					Möchtest du dich wirklich ausloggen? Nicht gespeicherte Daten im Formular gehen verloren.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel class="rounded-[12px]">Abbrechen</AlertDialog.Cancel>
				<AlertDialog.Action
					onclick={handleLogout}
					disabled={isLoggingOut}
					class="bg-red-500 hover:bg-red-600 rounded-[12px] text-white"
				>
					{#if isLoggingOut}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" /> Beende...
					{:else}
						Ja, Abmelden
					{/if}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
</div>