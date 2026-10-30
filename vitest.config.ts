import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		environment: 'happy-dom',
		globals: true,
		include: ['src/**/*.spec.ts'],
		exclude: ['tests/**', 'node_modules/**'],
		setupFiles: ['./src/tests/setup/happy-dom-storage.ts'],
		alias: {
			$lib: resolve(import.meta.dirname, 'src/lib'),
			'$app/environment': resolve(import.meta.dirname, 'src/tests/mocks/app-environment.ts'),
			'$app/stores': resolve(import.meta.dirname, 'src/tests/mocks/app-stores.ts'),
			'$env/dynamic/private': resolve(
				import.meta.dirname,
				'src/tests/mocks/env-dynamic-private.ts'
			),
			'$env/static/public': resolve(import.meta.dirname, 'src/tests/mocks/env-static-public.ts')
		}
	}
});
