<script lang="ts">
	import SiteFooter from '$lib/components/site-footer.svelte';
	import AmbientGlow from '$lib/components/ambient-glow.svelte';
</script>

<div class="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
	<AmbientGlow />

	<section class="relative z-10 flex-grow px-4 py-20">
		<div class="mx-auto max-w-3xl">
			<h1 class="mb-12 text-4xl font-bold tracking-tight">Privacy Policy</h1>

			<div class="prose prose-invert max-w-none space-y-8 text-foreground">
				<section>
					<h2 class="mb-4 text-2xl font-semibold">Overview</h2>
					<div class="space-y-2 text-muted-foreground">
						<p>
							This Privacy Policy explains how time2log collects, uses, and protects your personal
							information. By using our platform, you consent to our data practices described in
							this policy.
						</p>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Information We Collect</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>We collect the following types of information:</p>
						<ul class="ml-2 list-inside list-disc space-y-2">
							<li>Account information (email, name, profile details)</li>
							<li>Activity logs and time entries</li>
							<li>Absence records</li>
							<li>Device information and access logs</li>
							<li>Usage analytics to improve our service</li>
						</ul>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">How We Use Your Data</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>We use your data to:</p>
						<ul class="ml-2 list-inside list-disc space-y-2">
							<li>Provide and maintain the time2log platform</li>
							<li>Process and log your activities</li>
							<li>Generate progress reports and insights</li>
							<li>Improve and optimize our services</li>
							<li>Ensure platform security and prevent fraud</li>
							<li>Communicate with you about your account</li>
						</ul>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Data Security</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>
							We implement industry-standard security measures to protect your personal data,
							including:
						</p>
						<ul class="ml-2 list-inside list-disc space-y-2">
							<li>Encryption of data in transit (TLS/SSL)</li>
							<li>Secure password storage with hashing</li>
							<li>Access controls and authentication mechanisms</li>
							<li>Regular security audits and updates</li>
						</ul>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Your Rights</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>Under GDPR and other data protection laws, you have the right to:</p>
						<ul class="ml-2 list-inside list-disc space-y-2">
							<li>Access your personal data</li>
							<li>Request correction of inaccurate data</li>
							<li>Request deletion of your data (right to be forgotten)</li>
							<li>Withdraw consent for data processing</li>
							<li>Request a copy of your data in portable format</li>
							<li>Lodge a complaint with a data protection authority</li>
						</ul>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Third-Party Services</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>
							time2log uses Supabase for backend infrastructure and authentication. Supabase
							processes your data in accordance with their privacy policy and data processing
							agreements.
						</p>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Cookies & Tracking</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>
							We use cookies and similar tracking technologies to enhance your user experience and
							analyze platform usage. You can control cookie settings through your browser
							preferences.
						</p>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Data Retention</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>
							We retain your personal data for as long as your account is active. Upon account
							deletion, your data will be permanently removed within 30 days, except where required
							by law.
						</p>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Changes to This Policy</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>
							We may update this Privacy Policy periodically. Significant changes will be
							communicated to you via email or through the platform.
						</p>
					</div>
				</section>

				<section>
					<h2 class="mb-4 text-2xl font-semibold">Contact Us</h2>
					<div class="space-y-4 text-muted-foreground">
						<p>
							If you have questions about this Privacy Policy or our data practices, please contact
							us through the platform support.
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
