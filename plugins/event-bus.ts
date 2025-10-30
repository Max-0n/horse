import type { Emitter } from 'mitt'
import mitt from 'mitt'

type Events = Record<string, any>

export default defineNuxtPlugin(() => {
  const emitter: Emitter<Events> = mitt<Events>()

  return {
    provide: {
      event: emitter.emit, // Отправка событий
      listen: emitter.on, // Прослушивание событий
      stopListen: emitter.off, // Остановка прослушивания событий
    },
  }
})
