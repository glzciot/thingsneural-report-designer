import { createDiscreteApi } from 'naive-ui'

const api = createDiscreteApi(['message'])

export const notify = {
  info: (msg: string) => api.message.info(msg),
  success: (msg: string) => api.message.success(msg),
  warning: (msg: string) => api.message.warning(msg),
  error: (msg: string) => api.message.error(msg),
}
