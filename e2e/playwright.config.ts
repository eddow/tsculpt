import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: '.',
	timeout: 60_000,
	expect: {
		timeout: 30_000,
	},
	use: {
		baseURL: 'http://localhost:5173',
		browserName: 'chromium',
		headless: true,
		actionTimeout: 10_000,
	},
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 30_000,
	},
	reporter: [['list'], ['html', { open: 'never' }]],
})
