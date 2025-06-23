import { ref, watch } from 'vue'

export function localStored<T>(key: string, defaultValue: T) {
	const stored = localStorage.getItem(key)
	const value = ref(stored ? JSON.parse(stored) : defaultValue)
	watch(
		value,
		(value) => {
			localStorage.setItem(key, JSON.stringify(value))
		},
		{ deep: true }
	)
	return value
}

export const isDark = localStored('theme-dark', true)
if (isDark.value) document.documentElement.classList.add('dark')
export function toggleTheme() {
	isDark.value = !isDark.value
	localStorage.setItem('theme-dark', isDark.value.toString())
	document.documentElement.classList.toggle('dark')
}
