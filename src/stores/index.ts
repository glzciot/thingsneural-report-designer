import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

export { useAuthStore } from './modules/useAuthStore'
export { useProjectStore } from './modules/useProjectStore'
export { useDesignerStore } from './modules/useDesignerStore'
