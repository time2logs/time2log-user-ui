<script lang="ts">
	import SiteFooter from '$lib/components/site-footer.svelte';
	import AmbientGlow from '$lib/components/ambient-glow.svelte';
</script>

<div class="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
	<AmbientGlow />

	<section class="relative z-10 flex-grow px-4 py-20">
		<div class="mx-auto max-w-3xl">
			<h1 class="mb-12 text-4xl font-bold tracking-tight">Impressum (Legal Notice)</h1>

			<div class="prose prose-invert max-w-none space-y-8 text-foreground">
				<section>
					<h2 class="mb-4 text-2xl font-semibold">
						Responsible for content (According to § 7 TMG)
					</h2>
					<div class="space-y-2 text-muted-foreground">
						<p><strong>time2log</strong></p>
						<p>A learning and activity tracking platform</p>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Contact Information</h2>
					<div class="space-y-2 text-muted-foreground">
						<p>For inquiries and support, please contact us through the application.</p>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Data Protection</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>
							The protection of your personal data is important to us. We process your data only in
							accordance with applicable data protection regulations, particularly the GDPR.
						</p>
						<p>
							Your activity logs and personal information are securely stored and encrypted. We do
							not share your data with third parties without your explicit consent.
						</p>
						<p>
							For detailed information about how we handle your data, please refer to our Privacy
							Policy.
						</p>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Liability for Content</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>
							We are responsible for the content we provide on these pages in accordance with
							general laws. However, we are not responsible for the content uploaded or entered by
							users of the platform.
						</p>
						<p>
							Users are responsible for ensuring that their entries and activities comply with
							applicable laws and regulations.
						</p>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Copyright & Intellectual Property</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>
							The content and structure of the time2log platform are protected by copyright. All
							rights reserved.
						</p>
						<p>
							Unauthorized use, reproduction, or distribution of content is prohibited without
							explicit written permission.
						</p>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Disclaimer</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>
							The information provided on this platform is made available "as is" without any
							warranty. We do not guarantee the accuracy, completeness, or timeliness of any
							information.
						</p>
						<p>
							We are not responsible for damages resulting from the use or inability to use the
							platform or the information provided.
						</p>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">External Links</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>
							This platform may contain links to external websites. We are not responsible for the
							content, accuracy, or practices of these external sites.
						</p>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Governing Law</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>
							This website and all associated content are governed by the laws of Switzerland. Any
							disputes shall be subject to the exclusive jurisdiction of Swiss courts.
						</p>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Changes to This Notice</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>
							We reserve the right to update this Impressum at any time without prior notice. Please
							review this page periodically for changes.
						</p>
					</div>
				</section>
			</div>
		</div>
	</section>

	<div class="relative z-10">
		<SiteFooter />
	</div>
</div>
