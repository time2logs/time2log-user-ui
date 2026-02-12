<script lang="ts">
	import TaskDashboard from "$lib/components/task-dashboard.svelte";
	import UserNav from "$lib/components/user-nav.svelte";
</script>

<div class="relative flex min-h-screen w-full flex-col items-center justify-start bg-[#f3f5fa] px-6 py-12">
	<UserNav />
	<TaskDashboard />
</div>