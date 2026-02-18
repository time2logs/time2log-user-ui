import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite'; // Import this
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(), // Add this BEFORE sveltekit()
		sveltekit()
	]
});
