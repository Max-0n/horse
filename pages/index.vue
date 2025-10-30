<template lang="pug">
  .game-container
    h1.game-title Horse Defied
    img(src="/images/game_logo.png" alt="Horse Defied").game-logo
    NuxtLink(to="/game").game-start START
</template>

<script lang="ts" setup>

</script>

<style lang="scss" scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 20px;
}
.game-title {
  font-size: 64px;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  max-width: 250px;
}
.game-logo {
  width: 300px;
  height: auto;
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
