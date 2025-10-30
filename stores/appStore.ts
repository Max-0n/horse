export const useAppStore = defineStore('appStore', () => {
  let backgroundAudio: HTMLAudioElement | null = null
  let hasAttachedUnlockListeners = false

  function attachUnlockListeners(): void {
    if (hasAttachedUnlockListeners) return
    hasAttachedUnlockListeners = true
    const events = ['pointerdown', 'touchstart', 'click', 'keydown'] as const
    const onFirstInteraction = () => {
      if (!backgroundAudio) return
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      backgroundAudio.play().finally(() => {
        for (const evt of events) {
          window.removeEventListener(evt, onFirstInteraction)
        }
        hasAttachedUnlockListeners = false
      })
    }
    for (const evt of events) {
      window.addEventListener(evt, onFirstInteraction, { once: true, passive: true })
    }
  }

  function startMusic(): void {
    // Resolve asset URL at build time
    // const src = new URL('~/assets/sounds/derevnja-durakov.mp3', import.meta.url).href
    const src = new URL('~/assets/sounds/benny_hill.mp3', import.meta.url).href
    if (!backgroundAudio) {
      backgroundAudio = new Audio(src)
      backgroundAudio.loop = true
      backgroundAudio.volume = 0.35
    }
    // Attempt to play; ignore autoplay errors
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    backgroundAudio.play().catch(() => {
      // If blocked by autoplay policy, unlock on first user interaction
      attachUnlockListeners()
    })
  }

  function stopMusic(): void {
    if (backgroundAudio) {
      try {
        backgroundAudio.pause()
        backgroundAudio.currentTime = 0
      } finally {
        backgroundAudio = null
      }
    }
  }

  function playSfxHorseFail(): void {
    // Resolve asset URL; each SFX is a one-shot element
    try {
      const src = new URL('~/assets/sounds/horse-fail.mp3', import.meta.url).href
      const audio = new Audio(src)
      audio.volume = 0.9
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      audio.play().catch(() => {})
    } catch {
      // Ignore if asset missing
    }
  }

  function playSfxGameOver(): void {
    // Resolve asset URL; each SFX is a one-shot element
    try {
      const src = new URL('~/assets/sounds/game-over.mp3', import.meta.url).href
      const audio = new Audio(src)
      audio.volume = 0.7
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      audio.play().catch(() => {})
    } catch {
      // Ignore if asset missing
    }
  }

  return {
    startMusic,
    stopMusic,
    playSfxHorseFail,
    playSfxGameOver,
  }
})
