import { createRouter, createWebHistory } from 'vue-router'
import List from './views/List.vue'
import Module from './views/ModuleViewer.vue'

export const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			component: List,
		},
		{
			path: '/module/:path(.+)',
			component: Module,
			props: true,
		},
	],
})
