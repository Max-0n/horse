import { ref } from 'vue'

export interface LogEntry {
  type: 'log' | 'warn' | 'error' | 'js-error' | 'vue-error' | 'unhandled-promise'
  message: string
  timestamp: number
}

export function getLogColor(type: LogEntry['type']): string {
  if (type === 'error' || type === 'js-error' || type === 'vue-error' || type === 'unhandled-promise') {
    return '#ff4444'
  } else if (type === 'warn') {
    return '#ffaa00'
  } else {
    return '#88ff88'
  }
}

export default defineNuxtPlugin(nuxtApp => {
  const logs = ref<LogEntry[]>([])

  // Функция для перехвата логов
  const captureLog = (type: LogEntry['type'], ...args: unknown[]) => {
    const formattedMessage = args
      .map(arg => {
        if (arg instanceof Error) {
          return `${arg.message}\nStack: ${arg.stack}`
        }
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2)
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      })
      .join('\n')

    logs.value.unshift({
      type,
      message: formattedMessage,
      timestamp: Date.now(),
    })

    if (logs.value.length > 100) {
      logs.value.pop()
    }
  }

  if (import.meta.client) {
    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error

    console.log = (...args: unknown[]) => {
      captureLog('log', ...args)
      originalLog(...args)
    }

    console.warn = (...args: unknown[]) => {
      captureLog('warn', ...args)
      originalWarn(...args)
    }

    console.error = (...args: unknown[]) => {
      captureLog('error', ...args)
      originalError(...args)
    }

    nuxtApp.vueApp.config.errorHandler = (err: unknown, vm: any, info: string) => {
      if (err instanceof Error) {
        captureLog('vue-error', `Vue Error: ${err.message}\nStack: ${err.stack}\nInfo: ${info}`)
      } else {
        captureLog('vue-error', `Vue Error: ${String(err)}\nComponent Info: ${info}`)
      }
      console.error(err)
    }

    window.onerror = (message, source, lineno, colno, error) => {
      const errorDetails = error?.stack || `${message} at ${source}:${lineno}:${colno}`
      captureLog('js-error', `JavaScript Error:\n${errorDetails}`)
      return false // Позволяем ошибке пройти дальше в консоль
    }

    window.onunhandledrejection = event => {
      const error = event.reason
      if (error instanceof Error) {
        captureLog('unhandled-promise', `Unhandled Promise Rejection:\n${error.message}\nStack: ${error.stack}`)
      } else {
        captureLog('unhandled-promise', `Unhandled Promise Rejection: ${String(error)}`)
      }
    }
  }

  return {
    provide: {
      consoleLogs: logs,
      clearConsoleLogs: () => {
        logs.value = []
      },
      getLogColor,
    },
  }
})
