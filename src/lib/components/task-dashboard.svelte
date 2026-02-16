<script lang="ts">
	import { onMount } from "svelte";
	import { Mic, MicOff, Save, ClipboardList, Clock, Calendar, Loader2 } from "lucide-svelte";
	import * as Card from "$lib/components/ui/card";
	import * as Select from "$lib/components/ui/select";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Button } from "$lib/components/ui/button";
	import { Textarea } from "$lib/components/ui/textarea";
	import { cn } from "$lib/utils";
	import { apiRequest } from "$lib/api";

	type Tag = {
		id: string;
		key: string;
		label: string;
	};

	let categories = $state<Tag[]>([]);
	let categoriesLoading = $state(true);
	let isSubmitting = $state(false);
	let showSuccessDialog = $state(false);

	let date = $state(new Date().toISOString().split("T")[0]);
	let description = $state("");
	let selectedCategory = $state("");
	let startTime = $state("");
	let endTime = $state("");
	let outcome = $state("gut");
	let difficulties = $state("");
	let isListening = $state(false);

	let recognition: any;
	onMount(async () => {
		// Fetch categories from API
		try {
			const response = await apiRequest<{ data: Tag[] }>('/api/activities/tags');
			categories = response.data;
			if (categories.length > 0) {
				selectedCategory = categories[0].id;
			}
		} catch (error) {
			console.error('Failed to fetch categories:', error);
		} finally {
			categoriesLoading = false;
		}

		// Setup speech recognition
		const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		if (!SpeechRecognition) return;
		recognition = new SpeechRecognition();
		recognition.lang = "de-DE";
		recognition.onresult = (event: any) => { description += " " + event.results[0][0].transcript; };
		recognition.onstart = () => (isListening = true);
		recognition.onend = () => (isListening = false);
	});

	function toggleListening() {
		if (!recognition) return;
		isListening ? recognition.stop() : recognition.start();
	}

	async function addTask() {
		if (!description.trim() || !startTime || !endTime || !selectedCategory) return;
		
		isSubmitting = true;
		try {
			await apiRequest('/api/activities/create', {
				method: 'POST',
				body: JSON.stringify({
					activity: {
						id: selectedCategory
					},
					notes: description,
					start_time: `${date}T${startTime}:00`,
					end_time: `${date}T${endTime}:00`
				})
			});
			showSuccessDialog = true;
		} catch (error) {
			console.error('Failed to create activity:', error);
			alert('Fehler beim Speichern der Aktivität');
		} finally {
			isSubmitting = false;
		}
	}

	function clearForm() {
		description = "";
		startTime = "";
		endTime = "";
		outcome = "gut";
		difficulties = "";
		showSuccessDialog = false;
	}
</script>

<div class="mx-auto flex w-full max-w-[600px] flex-col items-center gap-8">
	<div class="text-center">
		<h1 class="text-[42px] font-bold tracking-tight text-[#1a1a1a]">Time2Log</h1>
		<p class="mt-[-4px] text-[15px] font-medium text-gray-500">Track your daily activities</p>
	</div>

	<Card.Root class="w-full border-white/50 bg-white p-6 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.06)] sm:rounded-[24px] sm:p-10">
		<div class="grid gap-6">
			<div class="grid gap-2">
				<Label class="text-[15px] font-semibold text-[#1a1a1a]">Datum *</Label>
				<Input type="date" bind:value={date} class="h-[52px] rounded-[12px]" />
			</div>

			<div class="grid gap-2">
				<Label class="text-[15px] font-semibold text-[#1a1a1a]">Aufgabe *</Label>
				<div class="flex gap-2">
					<Input placeholder="Was hast du gemacht?" bind:value={description} class="h-[52px] rounded-[12px]" />
					<Button variant="outline" size="icon" onclick={toggleListening} class={cn("h-[52px] w-[52px] rounded-[12px]", isListening && "text-red-500 border-red-200 bg-red-50")}>
						{#if isListening}<MicOff size={20} />{:else}<Mic size={20} />{/if}
					</Button>
				</div>
			</div>

			<div class="grid gap-2">
				<Label class="text-[15px] font-semibold text-[#1a1a1a]">Kategorie</Label>
				<Select.Root type="single" bind:value={selectedCategory} disabled={categoriesLoading}>
					<Select.Trigger class="h-[52px] rounded-[12px]">
						{#if categoriesLoading}
							Loading...
						{:else}
							{categories.find(c => c.id === selectedCategory)?.label || selectedCategory}
						{/if}
					</Select.Trigger>
					<Select.Content>
						{#each categories as cat}
							<Select.Item value={cat.id}>{cat.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<Input type="time" bind:value={startTime} class="h-[52px] rounded-[12px]" />
				<Input type="time" bind:value={endTime} class="h-[52px] rounded-[12px]" />
			</div>

			<Select.Root type="single" bind:value={outcome}>
				<Select.Trigger class="h-[52px] rounded-[12px]">
					{outcome === 'gut' ? '✅ Gut gelaufen' : '❌ Schwierigkeiten'}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="gut">✅ Gut gelaufen</Select.Item>
					<Select.Item value="schlecht">❌ Schwierigkeiten</Select.Item>
				</Select.Content>
			</Select.Root>

			{#if outcome === "schlecht"}
				<Textarea bind:value={difficulties} placeholder="Was war das Problem?" class="rounded-[12px]" />
			{/if}

			<Button onclick={addTask} disabled={isSubmitting} class="h-[52px] w-full rounded-[12px] bg-[#222222] text-[16px] hover:bg-black disabled:opacity-50">
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" /> Speichern...
				{:else}
					<Save class="mr-2 h-4 w-4" /> Speichern
				{/if}
			</Button>
		</div>
	</Card.Root>

	<AlertDialog.Root bind:open={showSuccessDialog}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Aktivität gespeichert</AlertDialog.Title>
				<AlertDialog.Description>
					Deine Aktivität wurde erfolgreich gespeichert.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Action onclick={clearForm}>OK</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
</div>