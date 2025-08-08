import preset from '@primeuix/themes/material'
import PrimeVue from 'primevue/config'
import { createApp } from 'vue'
import App from './App.vue'

// PrimeVue styles
import './style.sass'
import 'primeicons/primeicons.css'
import { router } from './router'

// Create app instance
const app = createApp(App)

// Use plugins
app.use(router)
app.use(PrimeVue, {
	ripple: true,
	inputStyle: 'filled',
	theme: {
		preset,
		options: {
			darkModeSelector: '.dark',
		},
	},
})

// Mount app
app.mount('#app')
