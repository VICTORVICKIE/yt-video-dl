import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(async () => {
	/** @type {import('vite').UserConfig} */
	const config: import('vite').UserConfig = {
		plugins: [sveltekit()],
		test: {
			include: ['src/**/*.{test,spec}.{js,ts}']
		},
	}

	return config
})
