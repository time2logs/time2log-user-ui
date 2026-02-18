<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	
	let { data } = $props();
	
	const initials = $derived(
		data.profile 
			? `${data.profile.first_name[0]}${data.profile.last_name[0]}`.toUpperCase()
			: '?'
	);
	
	const fullName = $derived(
		data.profile 
			? `${data.profile.first_name} ${data.profile.last_name}`
			: 'Guest'
	);
</script>

<div class="min-h-screen bg-gray-50 p-8">
	<div class="mx-auto max-w-4xl">
		<!-- Header with profile -->
		<div class="mb-8 flex items-center gap-4">
			<div class="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-xl font-semibold text-white">
				{initials}
			</div>
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Welcome, {fullName}</h1>
				<p class="text-gray-500">Here's your dashboard</p>
			</div>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Your Activity</Card.Title>
				<Card.Description>This is where your content will appear</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
					<p class="text-gray-400">More features coming soon</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>