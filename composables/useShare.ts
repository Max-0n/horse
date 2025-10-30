import { useMiniApp, usePopup } from 'vue-tg'
import { type ShareStoryOptions, ShareType, type StartApp } from '~/types'

export const useShare = () => {
  const { shareMonsterUrl, shareProductUrl, shareReferralUrl } = useNuxtApp().$config.public
  const appStore = useAppStore()
  const miniApp = useMiniApp()
  const popup = usePopup()

  const encodeJson = (payload: StartApp): string => {
    const json = JSON.stringify(payload)
    const bytes = new TextEncoder().encode(json)
    const base64 = btoa(String.fromCharCode(...bytes))
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const decodeJson = (json: string): StartApp => {
    if (json.startsWith('trafficId')) {
      return { trafficId: json.substring('trafficId'.length) }
    }

    json = json.replace(/-/g, '+').replace(/_/g, '/')
    json = json.padEnd(json.length + ((4 - (json.length % 4)) % 4), '=')
    const binary = atob(json)
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  }

  const shareStory = (options: ShareStoryOptions): void => {
    if (!miniApp.isVersionAtLeast('7.8')) {
      popup.showAlert?.('Update telegram app')
      return
    }

    // Use generated image if available, otherwise fallback to default background
    const mediaUrl =
      options?.generatedImage || 'https://barcodes-s-1.fsn1.your-objectstorage.com/cdn/themes/background_preload2.jpg'

    miniApp.shareToStory(mediaUrl, {
      text: `${shareMonsterUrl}/${options?.monsterId}`,
      widget_link: {
        url: `${shareMonsterUrl}/${options?.monsterId}`, // кликабельно только у Premium
        name: 'Barcodia',
      },
    })
  }

  const shareLink = (options: {
    type: ShareType
    monsterId?: string
    productId?: string
    monsterName?: string
    productName?: string
    shareText?: string
  }): void => {
    let sharedUrl: string
    let shareText: string

    switch (options.type) {
      case ShareType.MONSTER:
        sharedUrl = `${shareMonsterUrl}/${options.monsterId}`
        shareText = encodeURI(options.shareText || `Checkout monster: ${options.monsterName}`)
        break

      case ShareType.PRODUCT:
        sharedUrl = `${shareProductUrl}/${options.productId}`
        shareText = encodeURI(options.shareText || `Product for monsters: ${options.productName || '–'}`)
        break

      case ShareType.USER:
        sharedUrl = `${shareReferralUrl}/${appStore.user!.id}`
        shareText = encodeURI(options.shareText || 'Checkout my monsters!')
        break

      default:
        throw new Error(`Unsupported share type: ${options.type}`)
    }

    miniApp.openTelegramLink(`https://t.me/share/url?text=${shareText}&url=${sharedUrl}`)
  }

  return {
    shareLink,
    shareStory,
    encodeJson,
    decodeJson,
  }
}
