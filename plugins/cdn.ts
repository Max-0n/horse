import { CDN } from '@cdn'

export default defineNuxtPlugin(nuxtApp => {
  const cdnUrl = nuxtApp.$config.public.cdnUrl
  const $cdn = CDN.create(String(cdnUrl))
  const $cdnDynamic = (url: string) => `${cdnUrl}/${url}`
  const $cdnGenerated = (url: string) => `${nuxtApp.$config.public.generatorUrl}/${url}`
  const $cdnProduct = (url: string) => `${nuxtApp.$config.public.generatorUrl}/products/${url}`

  return {
    provide: {
      cdn: $cdn,
      cdnGenerated: $cdnGenerated,
      cdnDynamic: $cdnDynamic,
      cdnProduct: $cdnProduct,
    },
  }
})
