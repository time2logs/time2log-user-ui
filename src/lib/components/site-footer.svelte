<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
</script>

<footer class="mt-auto border-t border-border px-4 py-8">
	<div class="mx-auto max-w-6xl">
		<div class="mb-8 grid gap-8 text-center sm:grid-cols-3">
			<div>
				<span class="font-semibold text-foreground">time2log</span>
				<p class="mt-2 text-sm text-muted-foreground">{m.footer_tagline()}</p>
			</div>

			<div>
				<h4 class="mb-4 font-semibold text-foreground">{m.footer_links_heading()}</h4>
				<ul class="space-y-2 text-sm">
					<li>
						<a href="/" class="text-muted-foreground transition-colors hover:text-foreground"
							>{m.footer_home()}</a
						>
					</li>
					<li>
						<a href="/login" class="text-muted-foreground transition-colors hover:text-foreground"
							>{m.footer_login()}</a
						>
					</li>
				</ul>
			</div>

			<div>
				<h4 class="mb-4 font-semibold text-foreground">{m.footer_legal_heading()}</h4>
				<ul class="space-y-2 text-sm">
					<li>
						<a
							href="/impressum"
							class="text-muted-foreground transition-colors hover:text-foreground"
							>{m.footer_impressum()}</a
						>
					</li>
					<li>
						<a href="/privacy" class="text-muted-foreground transition-colors hover:text-foreground"
							>{m.footer_privacy()}</a
						>
					</li>
				</ul>
			</div>
		</div>

		<div class="border-t border-border pt-8">
			<p class="text-center text-sm text-muted-foreground">
				{m.footer_copyright({ year: new Date().getFullYear().toString() })}
			</p>
		</div>
	</div>
</footer>
