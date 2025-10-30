import { type ComputedRef, computed, onMounted, onUnmounted, type Ref, ref } from 'vue'

/**
 * Хук для отображения оставшегося времени до указанной даты
 * @param targetDate - целевая дата (строка или объект Date)
 * @returns объект с форматированным временем и оставшимися секундами
 */
export function useTimer(targetDate: string | Date): {
  formattedTime: ComputedRef<string>
  remaining: Ref<number>
} {
  const remaining = ref<number>(0)
  let intervalId: number | undefined

  const updateTimer = () => {
    const target = new Date(targetDate).getTime()
    const now = Date.now()
    remaining.value = Math.max(0, Math.floor((target - now) / 1000))
  }

  const formattedTime = computed<string>(() => {
    const hours = String(Math.floor(remaining.value / 3600)).padStart(2, '0')
    const minutes = String(Math.floor((remaining.value % 3600) / 60)).padStart(2, '0')
    const seconds = String(remaining.value % 60).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  })

  onMounted(() => {
    updateTimer()
    intervalId = window.setInterval(updateTimer, 1000)
  })

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
  })

  return { formattedTime, remaining }
}
