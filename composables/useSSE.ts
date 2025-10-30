import type { ServerSendEvents } from '@barcodes-protocol/logic/sse'

/**
 * SSE (Server-Sent Events) composable for real-time updates
 *
 * @example
 * ```vue
 * <script setup>
 * const { connect, disconnect, isConnected, listenToEvent } = useSSE()
 *
 * // Connect to SSE
 * connect()
 *
 * // Listen to monster liked events
 * const cleanup = listenToEvent('sse:monster-liked', (data) => {
 *   console.log('Monster liked:', data)
 * })
 *
 * // Cleanup on unmount
 * onUnmounted(() => {
 *   cleanup()
 *   disconnect()
 * })
 * </script>
 * ```
 */
export const useSSE = () => {
  let eventSource: EventSource | null = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 5
  const reconnectDelay = 5000 // 1 second
  const debugMode = ref(false)

  const appStore = useAppStore()
  // Event emitter for custom events
  const { $event, $listen, $stopListen } = useNuxtApp()

  const connect = () => {
    if (!appStore.user?.id) {
      console.error('User not found')
      return
    }

    const config = useRuntimeConfig()

    if (eventSource) {
      eventSource.close()
    }

    eventSource = new EventSource(`${config.public.apiBase}/api/sse/${appStore.user.id}`, {
      withCredentials: true,
    })

    // Connection opened
    eventSource.onopen = () => {
      if (debugMode.value) console.log('SSE connection established')
      reconnectAttempts = 0
    }

    // General message handler
    eventSource.onmessage = event => {
      if (debugMode.value) console.log(`SSE message: ${event.data}`)
      try {
        const data = JSON.parse(event.data)
        handleEvent(data)
      } catch (error) {
        console.error('Failed to parse SSE message:', error)
      }
    }

    // Ping event handler
    eventSource.addEventListener('ping', event => {
      const time = JSON.parse(event.data).time
      if (debugMode.value) console.warn(`SSE ping at ${time}`)
    })

    // Monster liked event handler
    eventSource.addEventListener('MonsterLike', event => {
      try {
        const data = JSON.parse(event.data) as ServerSendEvents.MonsterLiked
        if (debugMode.value) console.log('Monster liked event:', data)
        appStore.getMonsterById(data.monsterId)
        // Handle monster liked event
        handleMonsterLiked(data)
      } catch (error) {
        console.error('Failed to parse MonsterLike event:', error)
      }
    })

    // Monster updated event handler
    eventSource.addEventListener('MonsterUpdated', event => {
      try {
        const data = JSON.parse(event.data) as ServerSendEvents.MonsterUpdated
        if (debugMode.value) console.log('Monster updated event:', data)
        appStore.getMonsterById(data.monster.id)
        // Handle monster updated event
        handleMonsterUpdated(data)
      } catch (error) {
        console.error('Failed to parse MonsterUpdated event:', error)
      }
    })

    // User updated event handler
    eventSource.addEventListener('UserUpdated', event => {
      try {
        const data = JSON.parse(event.data) as ServerSendEvents.UserUpdated
        if (debugMode.value) console.log('User updated event:', data)
        appStore.getMyAccount()
        // Handle user updated event
        handleUserUpdated(data)
      } catch (error) {
        console.error('Failed to parse UserUpdated event:', error)
      }
    })

    // New referral event handler
    eventSource.addEventListener('NewReferral', event => {
      try {
        const data = JSON.parse(event.data) as ServerSendEvents.NewReferral
        if (debugMode.value) console.log($t('notify.new_referral'), data)
        push.info({ message: $t('notify.new_referral'), duration: 2000 })
        appStore.getMyAccount()
        // Handle user updated event
        handleNewReferral(data)
      } catch (error) {
        console.error('Failed to parse UserUpdated event:', error)
      }
    })

    // Error handling
    eventSource.onerror = error => {
      console.error('SSE connection error:', error)
      eventSource?.close()

      // Attempt to reconnect
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++
        console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`)
        setTimeout(() => connect(), reconnectDelay * reconnectAttempts)
      } else {
        console.error('Max reconnection attempts reached')
      }
    }
  }

  const disconnect = () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    reconnectAttempts = 0
  }

  const reconnect = () => {
    if (debugMode.value) console.log('Manual reconnection attempt...')
    reconnectAttempts = 0
    connect()
  }

  const setDebugMode = (enabled: boolean) => {
    debugMode.value = enabled
  }

  const toggleDebugMode = () => {
    debugMode.value = !debugMode.value
  }

  const handleEvent = (data: any) => {
    // Generic event handler for any unhandled events
    console.log('Unhandled SSE event:', data)

    // Emit generic event for debugging
    $event('sse:generic-event', data)
  }

  const handleMonsterLiked = (data: ServerSendEvents.MonsterLiked) => {
    // Handle monster liked event
    console.log(`Monster ${data.monsterId} liked by user ${data.userId}, total likes: ${data.likesCount}`)

    // Emit event for other components to listen to
    $event('sse:monster-liked', data)
  }

  const handleMonsterUpdated = (data: ServerSendEvents.MonsterUpdated) => {
    // Handle monster updated event
    console.log(`Monster updated: ${data.monster.id}`)

    // Emit event for other components to listen to
    $event('sse:monster-updated', data)
  }

  const handleUserUpdated = (data: ServerSendEvents.UserUpdated) => {
    // Handle user updated event
    console.log(`User updated: ${data.user.id}`)

    // Emit event for other components to listen to
    $event('sse:user-updated', data)
  }

  const handleNewReferral = (data: ServerSendEvents.NewReferral) => {
    // Handle user updated event
    console.log(`New referral: ${data.followerId}`)

    // Emit event for other components to listen to
    $event('sse:new-referral', data)
  }

  const isConnected = computed(() => eventSource?.readyState === EventSource.OPEN)

  const getConnectionStatus = () => {
    if (!eventSource) return 'disconnected'

    switch (eventSource.readyState) {
      case EventSource.CONNECTING:
        return 'connecting'
      case EventSource.OPEN:
        return 'open'
      case EventSource.CLOSED:
        return 'closed'
      default:
        return 'unknown'
    }
  }

  const getConnectionInfo = () => ({
    isConnected: isConnected.value,
    status: getConnectionStatus(),
    reconnectAttempts,
    maxReconnectAttempts,
    url: `${useRuntimeConfig().public.apiBase}/api/sse/${appStore.user?.id}`,
  })

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect()
  })

  const listenToEvent = (eventName: string, callback: (data: any) => void) => {
    $listen(eventName, callback)

    // Return cleanup function
    return () => $stopListen(eventName, callback)
  }

  return {
    connect,
    disconnect,
    reconnect,
    isConnected,
    handleEvent,
    handleMonsterLiked,
    handleMonsterUpdated,
    handleUserUpdated,
    handleNewReferral,
    listenToEvent,
    getConnectionStatus,
    getConnectionInfo,
    debugMode: readonly(debugMode),
    setDebugMode,
    toggleDebugMode,
  }
}
