import { ref, watch } from 'vue'

// Get initial theme from localStorage, default to true (dark) if not set
const storedTheme = localStorage.getItem('theme-dark')
export const isDark = ref(storedTheme !== null ? storedTheme === 'true' : true)
if (isDark.value) document.documentElement.classList.add('dark')

export function toggleTheme() {
	isDark.value = !isDark.value
	localStorage.setItem('theme-dark', isDark.value.toString())
	document.documentElement.classList.toggle('dark')
}

export type DisplayMode = 'solid' | 'wireframe' | 'solid-edges'

// Load display settings from localStorage or use defaults
const savedDisplay = localStorage.getItem('viewer-display')
const defaultDisplay = {
	mode: 'solid' as DisplayMode,
	showAxes: false,
}

export const displaySettings = ref(savedDisplay ? JSON.parse(savedDisplay) : defaultDisplay)

// Save settings whenever they change
watch(
	displaySettings,
	(settings) => {
		localStorage.setItem('viewer-display', JSON.stringify(settings))
	},
	{ deep: true }
)
