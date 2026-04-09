<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight, Clock, TrendingUp, Lock, Users } from 'lucide-svelte';
	import SiteHeader from '$lib/components/site-header.svelte';
	import SiteFooter from '$lib/components/site-footer.svelte';
	import AmbientGlow from '$lib/components/ambient-glow.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();
	let isLoggedIn = $derived(data.profile !== null);

	const features = [
		{
			icon: 'clock',
			title: m.home_feature_logging_title(),
			description: m.home_feature_logging_desc()
		},
		{
			icon: 'trending',
			title: m.home_feature_progress_title(),
			description: m.home_feature_progress_desc()
		},
		{
			icon: 'lock',
			title: m.home_feature_secure_title(),
			description: m.home_feature_secure_desc()
		},
		{
			icon: 'users',
			title: m.home_feature_collaboration_title(),
			description: m.home_feature_collaboration_desc()
		}
	];
</script>

<div class="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
	<!-- Subtle background glow -->
	<AmbientGlow />

	<!-- Header -->
	<SiteHeader />

	<!-- Hero Section -->
	<section class="relative z-10 flex flex-grow items-center justify-center px-4 py-20">
		<div
			class="mx-auto max-w-2xl rounded-xl border border-border bg-card p-8 text-center shadow-sm sm:p-12"
		>
			<h1 class="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
				{m.home_heading_track()}
				<span class="text-primary"> {m.home_heading_learning()} </span>
				{m.home_heading_journey()}
			</h1>

			<p class="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
				{m.home_hero_description()}
			</p>

			<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
				{#if isLoggedIn}
					<Button href="/dashboard" size="lg" class="min-w-[200px]">
						{m.home_go_dashboard()}
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
				{:else}
					<Button href="/login" size="lg" class="min-w-[200px]">
						{m.home_get_started()}
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
				{/if}
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="relative z-10 px-4 py-20">
		<div class="mx-auto max-w-6xl">
			<div class="mb-16 text-center">
				<h2 class="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
					{m.home_features_title()}
				</h2>
				<p class="text-lg text-muted-foreground">{m.home_features_subtitle()}</p>
			</div>

			<div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
				{#each features as feature (feature.title)}
					<div
						class="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
					>
						<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
							{#if feature.icon === 'clock'}
								<Clock class="h-6 w-6 text-primary" />
							{:else if feature.icon === 'trending'}
								<TrendingUp class="h-6 w-6 text-primary" />
							{:else if feature.icon === 'lock'}
								<Lock class="h-6 w-6 text-primary" />
							{:else if feature.icon === 'users'}
								<Users class="h-6 w-6 text-primary" />
							{/if}
						</div>
						<h3 class="mb-2 text-lg font-semibold">{feature.title}</h3>
						<p class="text-sm text-muted-foreground">{feature.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- How It Works Section -->
	<section class="relative z-10 bg-card/50 px-4 py-20">
		<div class="mx-auto max-w-6xl">
			<div class="mb-16 text-center">
				<h2 class="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
					{m.home_howitworks_title()}
				</h2>
				<p class="text-lg text-muted-foreground">{m.home_howitworks_subtitle()}</p>
			</div>

			<div class="grid gap-8 sm:grid-cols-3">
				<div class="text-center">
					<div
						class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground"
					>
						1
					</div>
					<h3 class="mb-2 text-lg font-semibold">{m.home_step1_title()}</h3>
					<p class="text-sm text-muted-foreground">
						{m.home_step1_desc()}
					</p>
				</div>

				<div class="text-center">
					<div
						class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground"
					>
						2
					</div>
					<h3 class="mb-2 text-lg font-semibold">{m.home_step2_title()}</h3>
					<p class="text-sm text-muted-foreground">{m.home_step2_desc()}</p>
				</div>

				<div class="text-center">
					<div
						class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground"
					>
						3
					</div>
					<h3 class="mb-2 text-lg font-semibold">{m.home_step3_title()}</h3>
					<p class="text-sm text-muted-foreground">{m.home_step3_desc()}</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Screenshots Section -->
	<section class="relative z-10 px-4 py-20">
		<div class="mx-auto max-w-6xl">
			<div class="mb-16 text-center">
				<h2 class="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
					{m.home_seeitinaction_title()}
				</h2>
				<p class="text-lg text-muted-foreground">{m.home_seeitinaction_subtitle()}</p>
			</div>

			<div class="rounded-lg border border-border bg-card p-8 text-center">
				<div class="flex aspect-video items-center justify-center rounded-lg bg-muted">
					<img src="src/lib/assets/screenshots/dashboard.png" alt="" />
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="relative z-10 bg-primary/5 px-4 py-20">
		<div class="mx-auto max-w-2xl text-center">
			<h2 class="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">{m.home_cta_title()}</h2>
			<p class="mb-8 text-lg text-muted-foreground">
				{m.home_cta_description()}
			</p>

			{#if !isLoggedIn}
				<Button href="/login" size="lg" class="min-w-[200px]">
					{m.home_cta_button()}
					<ArrowRight class="ml-2 h-4 w-4" />
				</Button>
			{/if}
		</div>
	</section>

	<div class="relative z-10">
		<SiteFooter />
	</div>
</div>
