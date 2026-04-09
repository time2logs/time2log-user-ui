import adapter from '@sveltejs/adapter-node';

// reason for this: cloudflare doesnt allow *.time2log.technify.app for deployments,
// so we need to change base url so works behind e.g. time2log-preview.technify.app/64 (64 is PR id)
const prId = process.env.COOLIFY_PULL_REQUEST_ID;
const basePath = prId ? `/${prId}` : '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
		paths: {
			base: basePath
		}
	}
};

export default config;
