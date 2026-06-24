import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite'; // Import this
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(), // Add this BEFORE sveltekit()
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			strategies: 'generateSW',
			manifest: {
				id: '/',
				name: 'Time2Log',
				short_name: 'Time2Log',
				description: 'Learning tool for apprentices.',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				display_override: ['window-controls-overlay', 'standalone'],
				background_color: '#3367D6',
				theme_color: '#3367D6',
				categories: ['productivity', 'education'],
				shortcuts: [
					{
						name: 'Log activity',
						short_name: 'Log activity',
						description: 'Log a new activity',
						url: '/dashboard'
					}
				],
				icons: [
					{
						src: '/icon-192.png',
						type: 'image/png',
						sizes: '192x192'
					},
					{
						src: '/icon-512.png',
						type: 'image/png',
						sizes: '512x512'
					},
					{
						src: '/icon-maskable-192.png',
						type: 'image/png',
						sizes: '192x192',
						purpose: 'maskable'
					},
					{
						src: '/icon-maskable-512.png',
						type: 'image/png',
						sizes: '512x512',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,woff2,ico}'],
				navigateFallback: 'index.html',
				navigateFallbackDenylist: [/^\/api\//, /supabase/]
			}
		}),
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
