import type { Router } from 'vue-router'

/**
 * 设计器由 thingsNeural-front 同源跳转进入，登录态/项目从 localStorage 读取，
 * 这里只负责标题与放行。
 */
export function setupRouterGuards(router: Router) {
  router.beforeEach((to) => {
    document.title = (to.meta?.title as string) || 'Thingsneural-Report Designer'
  })
}
