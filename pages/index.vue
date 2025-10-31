<template lang="pug">
  .game-container(:class="layoutDirection" ref="containerRef")
    .logo-title-container
      h1.game-title Horse Defied
      img(src="/images/game_logo.png" alt="Horse Defied").game-logo
    NuxtLink(to="/game").game-start START
</template>

<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const containerRef = ref<HTMLElement | null>(null)
const layoutDirection = ref<'column' | 'row'>('column')

function computeLayout() {
  const container = containerRef.value
  if (!container) return

  const isPortrait = window.matchMedia('(orientation: portrait)').matches
  if (isPortrait) {
    layoutDirection.value = 'column'
    return
  }

  const previousInlineStyle = container.style.flexDirection
  container.style.flexDirection = 'column'

  // Measure after paint to detect vertical overflow in column layout
  void nextTick().then(() => {
    const overflowsVertically = container.scrollHeight > container.clientHeight
    layoutDirection.value = overflowsVertically ? 'row' : 'column'
    container.style.flexDirection = previousInlineStyle
  })
}

function handleResize() {
  computeLayout()
}

onMounted(() => {
  computeLayout()
  window.addEventListener('resize', handleResize, { passive: true })
  window.addEventListener('orientationchange', handleResize, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('orientationchange', handleResize)
})

</script>

<style lang="scss" scoped>
.logo-title-container{
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 14px;
}
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 20px;
}
.game-container.row {
  flex-direction: row;
  gap: 100px;
}
.game-title {
  font-size: 64px;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  max-width: 250px;
}
.row > .logo-title-container > .game-title{
  font-size: 40px;
  max-width: 200px;
}
.game-logo {
  width: 300px;
  height: auto;
}
.row > .logo-title-container > .game-logo{
  width: 180px;
}
.game-start {
  font-size: 40px;
  font-weight: 700;
  color: #000000;
  padding: 8px 20px;
  border: 6px solid #000;
  text-decoration: none;
  outline: none;
  border-radius: 40px;
  transition: all 0.3s ease;
  &:hover {
    background: #000000;
    color: #ffffff;
  }
}
</style>
