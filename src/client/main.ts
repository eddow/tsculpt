import preset from '@primeuix/themes/material'
import PrimeVue from 'primevue/config'
import { createApp } from 'vue'
import App from './App.vue'

import Accordion from 'primevue/accordion'
import AccordionContent from 'primevue/accordioncontent'
import AccordionHeader from 'primevue/accordionheader'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionTab from 'primevue/accordiontab'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Menu from 'primevue/menu'
// PrimeVue components
import Menubar from 'primevue/menubar'
import SplitButton from 'primevue/splitbutton'
import Tree from 'primevue/tree'

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

// Register components
app.component('Menubar', Menubar)
app.component('Button', Button)
app.component('Tree', Tree)
app.component('Card', Card)
app.component('Dialog', Dialog)
app.component('Menu', Menu)
app.component('Accordion', Accordion)
app.component('AccordionContent', AccordionContent)
app.component('AccordionHeader', AccordionHeader)
app.component('AccordionPanel', AccordionPanel)
app.component('AccordionTab', AccordionTab)
app.component('SplitButton', SplitButton)
app.component('DataTable', DataTable)
app.component('Column', Column)

// Mount app
app.mount('#app')
