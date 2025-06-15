import { createRouter, createWebHistory } from 'vue-router'
import List from './views/List.vue'
import Preview from './views/Preview.vue'

export const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			component: List,
		},
		{
			path: '/preview/:path(.+)',
			component: Preview,
			props: true,
		},
	],
})
