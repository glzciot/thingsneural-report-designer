import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { setupRouterGuards } from './guards'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/report/designer' },
  {
    path: '/report/designer',
    name: 'ReportDesigner',
    component: () => import('@/views/report/designer/index.vue'),
    meta: { title: 'Thingsneural-Report Designer' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/report/designer' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

setupRouterGuards(router)

export default router
