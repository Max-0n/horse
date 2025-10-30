import { CDN } from '@cdn'

export const $cdn = CDN.create(String(useNuxtApp().$config.public.cdnUrl))
export const $cdnDynamic = (url: string) => `${useNuxtApp().$config.public.cdnUrl}/${url}`
export const $cdnGenerated = (url: string) => `${useNuxtApp().$config.public.generatorUrl}/${url}`
