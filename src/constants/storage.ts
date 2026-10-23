const systemCode = 'thingsneural'

/**
 * 与 thingsNeural-front 保持一致的本地存储键（同源跳转时可直接复用登录态与当前项目）
 */
export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: `${systemCode}:auth-token`,
  CURRENT_PROJECT: `${systemCode}:current-project`,
} as const
