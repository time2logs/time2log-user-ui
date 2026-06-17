import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		environment: 'happy-dom',
		globals: true,
		include: ['src/**/*.spec.ts'],
		exclude: ['tests/**', 'node_modules/**'],
		alias: {
			$lib: resolve(__dirname, 'src/lib'),
			'$app/environment': resolve(__dirname, 'src/tests/mocks/app-environment.ts'),
			'$app/stores': resolve(__dirname, 'src/tests/mocks/app-stores.ts'),
			'$env/dynamic/private': resolve(__dirname, 'src/tests/mocks/env-dynamic-private.ts'),
			'$env/static/public': resolve(__dirname, 'src/tests/mocks/env-static-public.ts')
		}
	}
});
