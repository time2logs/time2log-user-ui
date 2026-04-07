import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite'; // Import this
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(), // Add this BEFORE sveltekit()
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['localStorage', 'cookie', 'baseLocale']
		})
	],
	ssr: {
		noExternal: ['rrule']
	}
});
