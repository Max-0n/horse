import { type PublicBarcodeConfig } from '@barcodes-protocol/config'
import FingerprintJs from '@fingerprintjs/fingerprintjs'
import type { ClientEvents } from '@shared-protocol/clientEvents'
import type { Reward } from '@shared-protocol/reward'
import {
  type AuthTelegramWebApp_Req,
  type BarcodeRequest,
  type BarcodeResponse,
  type FollowResponse,
  type GenerateMonsterResponse,
  LeaderboardUsersResult,
  type MonsterDTO,
  type MonsterListResponse,
  type ProductDTO,
  type ProductRequest,
  type ProductResponse,
  ProductWithAddedFlag,
  ProductWithOwnerFlag,
  type UserLookupDTO,
  type UserShortPersonal,
} from '@shared-protocol/types'
import { useHapticFeedback, useMiniApp, usePopup } from 'vue-tg'
import { AUTH_TOKEN_KEY, MONSTERS_OFFSET_PAGINATION } from '~/constants'
import type { UserLookupWithFriends } from '~/types'

export const useAppStore = defineStore('appStore', () => {
  const miniApp = useMiniApp()
  const popup = usePopup()
  const hapticFeedback = useHapticFeedback()
  const { decodeJson } = useShare()

  // State
  const version = ref<number | string>(0)
  const monstersMap = shallowReactive(new Map<MonsterDTO['id'], MonsterDTO>())
  const monstersListIdArray = shallowReactive<MonsterDTO['id'][]>([])
  const user = ref<UserShortPersonal>()
  const productsList = ref<ProductResponse[]>([])
  const config = ref<PublicBarcodeConfig>()
  const configVersion = ref<string>()
  const usersMap = reactive(new Map<UserLookupDTO['user']['id'], UserLookupWithFriends>())
  const firstMonsterId = ref<string>('')

  // Actions
  const authTelegram = async (): Promise<void> => {
    const startParam = miniApp.initDataUnsafe?.start_param
    let trafficId: string | undefined
    let referralId: string | undefined

    if (startParam) {
      const { ref, trafficId: traffic } = decodeJson(startParam)
      trafficId = traffic
      referralId = ref
    }

    const fp = await FingerprintJs.load()
    const { visitorId, components, version: fpVersion } = await fp.get()

    return await $api
      .post('/api/v1/auth', {
        body: {
          initDataRaw: miniApp.initData,
          fingerprint: {
            version: fpVersion,
            visitorId,
            components: {
              ...components,
              canvas: null, // delete too large data
              webGlExtensions: null, // delete too large data
            },
          },
          trafficId,
          referralId,
        } as AuthTelegramWebApp_Req,
      })
      .then(({ authToken }) => {
        localStorage.setItem(AUTH_TOKEN_KEY, authToken)
      })
  }

  const getMyAccount = async (): Promise<UserShortPersonal> => {
    const userData = await $api.get('/api/v1/user/me')
    user.value = userData

    const userFromUsersMap = usersMap.get(userData.id)
    const userWitFriends: UserLookupWithFriends = {
      user: {
        id: userData.id,
        avatar: userData.avatar,
        username: userData.username,
        totalPower: userData.totalPower,
      },
      isFollower: userFromUsersMap?.isFollower || false,
      isFollowing: userFromUsersMap?.isFollowing || false,
      userFollowers: userFromUsersMap?.userFollowers ?? 0,
      userFollowings: userFromUsersMap?.userFollowings ?? 0,
    }
    usersMap.set(userData.id, userWitFriends)

    return userData
  }

  const onboardingComplete = async (): Promise<UserShortPersonal> => {
    try {
      const result = await $api.get('/api/v1/onboard')
      user.value = result

      return result
    } catch (e: any) {
      push.error({ message: $t('error.onboarding_failed') })
      throw new Error(e)
    }
  }

  const getUserById = async (userId: string): Promise<UserLookupDTO> => {
    const result = await $api.get(`/api/v1/user/${userId}`)
    if (usersMap.has(userId)) {
      const prev = usersMap.get(userId)
      const next: UserLookupWithFriends = {
        ...result,
        userFollowers: prev?.userFollowers ?? 0,
        userFollowings: prev?.userFollowings ?? 0,
      }

      usersMap.set(userId, next)
    } else {
      const user: UserLookupWithFriends = {
        ...result,
        userFollowers: 0,
        userFollowings: 0,
      }
      usersMap.set(userId, user)
    }

    return result
  }

  const getUserMonsters = async (
    userId: string,
    limit = MONSTERS_OFFSET_PAGINATION,
    offset = 0
  ): Promise<MonsterListResponse> => {
    try {
      const response = (await $api.post(`/api/v1/user/${userId}/monsters-list`, {
        body: { limit, offset },
      })) as MonsterListResponse

      // Save monsters to Map before returning
      response.data.forEach(monster => {
        monstersMap.set(monster.id, monster)
      })

      return response
    } catch (e: any) {
      throw new Error(e)
    }
  }

  const getMonstersList = async (limit = MONSTERS_OFFSET_PAGINATION, offset = 0): Promise<MonsterListResponse> => {
    const response = (await $api.post('/api/v1/monsters-list', { body: { limit, offset } })) as MonsterListResponse

    if (offset === 0) {
      monstersListIdArray.length = 0
    }

    // Add monsters to map and maintain order
    response.data.forEach(monster => {
      monstersMap.set(monster.id, monster)
      monstersListIdArray.push(monster.id)
    })

    return response
  }

  const getMonsterById = async (monsterId: string): Promise<MonsterDTO> => {
    try {
      const monster = await $api.get(`/api/v1/monster/${monsterId}`)
      monstersMap.set(monster.id, monster)
      return monster
    } catch (e: any) {
      push.error({ message: $t('error.fail_get_monster', { monsterId }) })
      throw new Error(e)
    }
  }

  const deleteMonster = async (monsterId: string): Promise<void> => {
    try {
      await $api.delete(`/api/v1/monster/${monsterId}`)
      removeMonster(monsterId)
    } catch (e: any) {
      push.error({ message: $t('error.fail_delete_monster', { monsterId }) })
      throw new Error(e)
    }
  }

  const likeMonster = async (monsterId: string): Promise<MonsterDTO> => {
    try {
      const monster = await $api.post('/api/v1/monster/like', { body: { monsterId } })
      monstersMap.set(monster.id, monster)
      return monster
    } catch (e: any) {
      throw new Error(e)
    }
  }

  const getMonsterShareReward = async (monsterId: string): Promise<MonsterDTO> => {
    try {
      const monster = await $api.post('/api/v1/monster/share', { body: { monsterId } })
      // Update the monster in the store with the updated data
      monstersMap.set(monster.id, monster)
      return monster
    } catch (e: any) {
      throw new Error(e)
    }
  }

  const getMonsterTaskReward = async (
    monsterId: string
  ): Promise<{ monster: MonsterDTO; rewardsClaimed: Reward[] }> => {
    try {
      const { monster, rewardsClaimed } = await $api.get(`/api/v1/monster-task/${monsterId}`)
      // Update the monster in the store with the updated data
      monstersMap.set(monster.id, monster)
      return { monster, rewardsClaimed }
    } catch (e: any) {
      throw new Error(e)
    }
  }

  const removeMonster = (monsterId: string): void => {
    monstersMap.delete(monsterId)
    const index = monstersListIdArray.indexOf(monsterId)
    if (index > -1) {
      monstersListIdArray.splice(index, 1)
    }
  }

  const getUserProducts = async (): Promise<ProductResponse[]> => {
    const products = (await $api.get('/api/v1/user-products')) as ProductResponse[]
    productsList.value = products
    return products
  }

  const getProductsList = async (): Promise<ProductDTO> => {
    const { data } = await $api.get('/api/v1/products-list')
    return data
  }

  const scanBarcodeImage = async (base64: string): Promise<BarcodeResponse> => {
    try {
      return await $api.post('/api/v1/decode-barcode', {
        body: {
          base64,
          include_type_info: true,
        } as BarcodeRequest,
      })
    } catch (e: any) {
      throw new Error(e)
    }
  }

  const reactivateProduct = async (productId: string): Promise<ProductWithOwnerFlag> => {
    try {
      return (await $api.post(`/api/v1/product/reactivate`, { body: { productId } })) as ProductWithOwnerFlag
    } catch (e: any) {
      push.error({ message: $t('error.fail_get_barcode') })
      throw new Error(e)
    }
  }

  const getProduct = async (productId: string): Promise<ProductWithOwnerFlag> => {
    try {
      return (await $api.get(`/api/v1/product/${productId}`)) as ProductWithOwnerFlag
    } catch (e: any) {
      push.error({ message: $t('error.fail_get_barcode') })
      throw new Error(e)
    }
  }

  const searchBarcodeProduct = async (barcode: string): Promise<ProductWithAddedFlag> => {
    try {
      return await $api.post('/api/v1/search', { body: { barcode } as ProductRequest })
    } catch (e: any) {
      push.error({ message: $t('error.fail_get_barcode') })
      throw new Error(e)
    }
  }

  const storiesLink = async (base64WithHeader: string): Promise<string> => {
    try {
      const base64 = base64WithHeader.includes(',') ? base64WithHeader.split(',')[1] : base64WithHeader
      const path: string = await $api.post('/api/v1/stories-link', {
        body: { base64 },
      })
      const cdnUrl = useNuxtApp().$config.public.generatorUrl
      return `${cdnUrl}/${path}`
    } catch (e: any) {
      push.error({ message: $t('error.fail_upload_image') })
      throw new Error(e)
    }
  }

  const saveProduct = async (productId: string): Promise<void> => {
    try {
      return await $api.post('/api/v1/product', { body: { productId } }).then(res => {
        push.success({ message: $t('notify.product_saved'), duration: 2000 })
        return res
      })
    } catch (e: any) {
      push.error({ message: $t('error.product_save_failed') })
      throw new Error(e)
    }
  }

  const deleteProductFromUser = async (productId: string): Promise<void> => {
    return await $api.delete(`/api/v1/product/${productId}`, {})
  }

  const makeMonsterByBarcode = async (barcode: string): Promise<GenerateMonsterResponse> => {
    return await $api.post('/api/v1/generate', { body: { productId: barcode } })
  }

  const getFollowers = async (userId?: string, limit = 1000, offset = 0): Promise<FollowResponse> => {
    const result = await $api.post('/api/v1/followers', { body: { userId, limit, offset } })
    if (userId) {
      const user = usersMap.get(userId)
      if (user) {
        user.userFollowers = result.count
      }
    } else if (user.value) {
      const userWithFriends = usersMap.get(user.value.id)
      if (userWithFriends) {
        usersMap.set(userWithFriends.user.id, { ...userWithFriends, userFollowers: result.count })
      }
    }

    return result
  }

  const getFollowings = async (userId?: string, limit = 1000, offset = 0): Promise<FollowResponse> => {
    const result = await $api.post('/api/v1/following', { body: { userId, limit, offset } })
    if (userId) {
      const user = usersMap.get(userId)
      if (user) {
        user.userFollowings = result.count
      }
    } else if (user.value) {
      const userWithFriends = usersMap.get(user.value.id)
      if (userWithFriends) {
        usersMap.set(userWithFriends.user.id, { ...userWithFriends, userFollowings: result.count })
      }
    }

    return result
  }

  const followUser = async (userId: string, ref?: boolean): Promise<void> => {
    await $api.post('/api/v1/follow', { body: { userId, ref } })

    const prev = usersMap.get(userId)
    if (!prev) return

    const next: UserLookupWithFriends = { ...prev, isFollower: true, userFollowers: ++prev.userFollowers }
    usersMap.set(userId, next)
  }

  const unfollowUser = async (userId: string): Promise<void> => {
    await $api.post('/api/v1/unfollow', { body: { userId } })

    const prev = usersMap.get(userId)
    if (!prev) return

    const next: UserLookupWithFriends = { ...prev, isFollower: false, userFollowers: --prev.userFollowers }
    usersMap.set(userId, next)
  }

  const buySlots = async (): Promise<void> => {
    try {
      const userData = await $api.get('/api/v1/slot')
      user.value = userData
      return userData
    } catch (e: any) {
      push.error({ message: $t('error.slot_purchase_failed') })
      throw new Error(e)
    }
  }

  const getLeaderboard = async (): Promise<LeaderboardUsersResult> => {
    try {
      return await $api.get('/api/leaderboard/user')
    } catch (e: any) {
      push.error({ message: $t('error.get_leaderboard') })
      throw new Error(e)
    }
  }

  const setConfigVersion = (version: string): void => {
    configVersion.value = version
  }

  const getConfig = async (): Promise<PublicBarcodeConfig> => {
    try {
      // Get config version from Pinia store (saved by API responses)
      if (!configVersion.value) {
        throw new Error('Config version not found. Please call getMyAccount first.')
      }

      // Fetch the config with the saved version
      const response = await $api.get(`/api/config/${configVersion.value}`)
      config.value = response.config
      return response.config
    } catch (e: any) {
      throw new Error(e)
    }
  }

  const telegramPayment = async (
    purchaseId: string
  ): Promise<{ success: boolean; status: 'paid' | 'cancelled' | 'failed' | 'pending' }> => {
    if (!miniApp.isVersionAtLeast('6.1')) {
      popup.showAlert?.('Update telegram app')
      throw new Error('Old version of telegram')
    }

    try {
      // 1. Получаем данные с сервера
      const { link, orderId } = await $api.post('/api/create-invoice', { body: { purchaseId } })
      if (!link || !orderId) {
        throw new Error('Ошибка оплаты')
      }

      // 2. Открываем инвойс через Telegram API
      return new Promise((resolve, reject) => {
        miniApp.openInvoice(link, status => {
          // status может быть "paid", "cancelled", "failed" и т.п.
          if (status === 'paid') {
            resolve({ success: true, status })
          } else {
            reject({ success: false, status })
          }
        })
      })
    } catch (error: any) {
      throw new Error('Telegram payment failed', error)
    }
  }

  const setFirstMonsterId = (id: string) => {
    firstMonsterId.value = id
  }

  /**
   * Send client analytic events to the backend
   */
  const addEvents = async (
    event: Pick<ClientEvents.Union, 'name'> & Partial<Omit<ClientEvents.Union, 'name'>>
  ): Promise<void> => {
    if (!user.value?.id) return

    const events: ClientEvents.Union[] = [
      {
        name: event.name,
        createdAt: +new Date(event.createdAt ?? Date.now()),
        params: event.params ?? {},
      },
    ]

    await $api.post('/api/add-events', {
      body: { events },
    })
  }

  const useHaptic = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
    ;(hapticFeedback as any)?.impactOccurred(style)
  }

  // Getters
  const getMonstersFromStore = computed((): MonsterDTO[] => {
    return monstersListIdArray.map((id: MonsterDTO['id']) => monstersMap.get(id)).filter(Boolean) as MonsterDTO[]
  })

  const getFreeSlotsCount = computed((): number => (user.value?.slots || 0) - (user.value?.monstersCount || 0))

  const getNextSlotCost = computed(() => {
    if (!user.value || !config.value) return
    const nextSlot = user.value.slots + 1
    return config.value.slotCosts[nextSlot]
  })

  return {
    // State
    version,
    monstersMap,
    monstersListIdArray,
    user,
    productsList,
    config,
    configVersion,
    usersMap,
    firstMonsterId,

    // Actions
    authTelegram,
    getMyAccount,
    onboardingComplete,
    getUserById,
    getUserMonsters,
    getMonstersList,
    getMonsterById,
    deleteMonster,
    likeMonster,
    getMonsterShareReward,
    getMonsterTaskReward,
    removeMonster,
    getUserProducts,
    getProductsList,
    scanBarcodeImage,
    reactivateProduct,
    getProduct,
    searchBarcodeProduct,
    saveProduct,
    deleteProductFromUser,
    makeMonsterByBarcode,
    getFollowers,
    getFollowings,
    followUser,
    unfollowUser,
    buySlots,
    getLeaderboard,
    storiesLink,
    setConfigVersion,
    getConfig,
    telegramPayment,
    setFirstMonsterId,
    useHaptic,
    addEvents,

    // Getters
    getMonstersFromStore,
    getFreeSlotsCount,
    getNextSlotCost,
  }
})
