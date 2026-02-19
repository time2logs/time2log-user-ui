<script lang="ts">
	import LoginForm from '$lib/components/login-form.svelte';
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
</script>

<div class="flex flex-col h-screen w-full items-center justify-center bg-[#f3f5fa] px-4">
	<div class="p-4">
		<LanguageSwitcher />
	</div>
	<div class="relative">
		<LoginForm />
	</div>
</div>
