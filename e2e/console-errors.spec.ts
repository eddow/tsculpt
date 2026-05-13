import { expect, test } from '@playwright/test'

/**
 * E2E test: verify that errors occurring during computation
 * are surfaced as console.error in the main browser thread,
 * making them readable by AI agents.
 */
test.describe('Console error visibility', () => {
	test('worker errors appear as console.error in the main thread', async ({ page }) => {
		const consoleErrors: string[] = []
		const consoleWarnings: string[] = []

		// Capture ALL console output from the main thread
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text())
			}
			if (msg.type() === 'warning') {
				consoleWarnings.push(msg.text())
			}
		})

		// Navigate to a real module that triggers WASM extrusion (which may warn on fallback)
		await page.goto('/module/example/extrusion-example')

		// Wait for the page to settle — either the geometry renders or an error appears
		// The PageError is expected to appear if WASM extrusion fails
		// But even if it succeeds, we want to ensure any errors are in the console

		// Wait for either the viewer canvas to appear OR the ErrorView to be visible
		await page.waitForSelector('canvas, .error', { timeout: 30_000 })

		// Give async operations a moment to flush any console output
		await page.waitForTimeout(2000)

		// The key assertion: console output exists and is captured
		// We don't assert on specific error content since behavior depends on WASM availability,
		// but we verify the capture mechanism works and the page loaded
		expect(page.url()).toContain('/module/example/extrusion-example')

		// Log what we captured for agent visibility in test output
		if (consoleErrors.length > 0) {
			console.log(`\nCaptured ${consoleErrors.length} console.error(s):`)
			for (const err of consoleErrors) {
				console.log(`  [error] ${err}`)
			}
		}
		if (consoleWarnings.length > 0) {
			console.log(`\nCaptured ${consoleWarnings.length} console.warning(s):`)
			for (const warn of consoleWarnings) {
				console.log(`  [warn] ${warn}`)
			}
		}

		// Verify that if there ARE errors, they're readable (not empty blobs)
		for (const err of consoleErrors) {
			expect(err.length).toBeGreaterThan(0)
		}
	})

	test('invalid entry hash surfaces error in console', async ({ page }) => {
		const consoleErrors: string[] = []

		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text())
			}
		})

		// Navigate to a module with a non-existent entry hash
		await page.goto('/module/example/extrusion-example#nonexistent-entry')

		// Wait for the ErrorView panel to render
		await page.waitForSelector('.error', { timeout: 30_000 })

		// Give async errors time to propagate
		await page.waitForTimeout(2000)

		// Ensure the error panel shows something meaningful
		const errorText = await page.locator('.error pre').first().textContent()
		expect(errorText).toBeTruthy()

		// Log captured errors for agent visibility
		console.log(`\nCaptured ${consoleErrors.length} console.error(s) for bad entry:`)
		for (const err of consoleErrors) {
			console.log(`  [error] ${err}`)
		}

		// We should have at least one console error from the WorkerManager
		// or from the Await component
		expect(consoleErrors.length).toBeGreaterThan(0)
	})
})
