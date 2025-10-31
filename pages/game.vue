<template lang="pug">
  .game(ref="gameContainer")
  .hud
    .hud-score {{ score }}
  .mobile-controls
    button.control.left(@touchstart="leftHeld = true" @touchend="leftHeld = false" @mousedown="leftHeld = true" @mouseup="leftHeld = false" @mouseleave="leftHeld = false" aria-label="Влево") &#60;
    button.control.right(@touchstart="rightHeld = true" @touchend="rightHeld = false" @mousedown="rightHeld = true" @mouseup="rightHeld = false" @mouseleave="rightHeld = false" aria-label="Вправо") &#62;
  .modal-overlay(v-if="showGameOver")
    .modal-box
      .score-container
        h3.modal-score {{ score }}
        p.modal-score-text Score
      .modal-title Game Over
      .modal-buttons
        button(@click="restartGame") Restart
        NuxtLink(to="/") Home
</template>

<script lang="ts" setup>
import Phaser from 'phaser'
import { onBeforeUnmount, onMounted, ref, computed } from 'vue'
import { useAppStore } from '~/stores/appStore'

const gameContainer = ref<HTMLDivElement | null>(null)
let phaserGame: Phaser.Game | null = null
const appStore = useAppStore()

const leftHeld = ref(false)
const rightHeld = ref(false)
const showGameOver = ref(false)
const maxCarX = ref(0)
const startCarX = ref(0)
const score = computed(() => {
  const passed = Math.max(0, maxCarX.value - startCarX.value)
  return Math.floor(passed * 2)
})
function restartGame() {
  // Скрыть модалку и обнулить прогресс
  showGameOver.value = false
  startCarX.value = 0
  maxCarX.value = 0
  // Перезапуск сцены Phaser без перезагрузки страницы
  const scene: any = phaserGame?.scene?.keys?.CarExampleScene
  if (scene) {
    scene.scene.restart()
  }
    // Повторно включим клавиатуру на уровне игры (на случай, если отключали ранее)
    if ((phaserGame as any)?.input?.keyboard) {
      ;(phaserGame as any).input.keyboard.enabled = true
    }
  // Вернём музыку
  appStore.startMusic()
}

let interval: number | null = null

const GAME_WIDTH = 600
const aspect = 600 / 400
const dynamicWidth = ref(Math.round(window.innerWidth))
const dynamicHeight = ref(Math.round(window.innerHeight * 0.8))

function recalcSize() {
  dynamicWidth.value = window.innerWidth
  dynamicHeight.value = Math.round(window.innerHeight * 0.8)
}

window.addEventListener('resize', recalcSize)

// --- SCENE CLASS ---
class CarExampleScene extends Phaser.Scene {
  // Car and wheels
  carBody!: MatterJS.BodyType
  leftWheel!: MatterJS.BodyType
  rightWheel!: MatterJS.BodyType
  carRoof!: MatterJS.BodyType
  gameOver = false

  // Controls
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  spaceKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'CarExampleScene' })
  }

  preload() {
    // загружаем текстуру кузова вместо debug
    this.load.image('horse-body', '/images/horse_body.png')
    this.load.image('horse-head', '/images/horse_head.png')
  }

  create() {
    // Сброс состояния после возможного рестарта
    this.gameOver = false
    const matterWorld: any = this.matter.world as any
    if (matterWorld.isPaused) {
      matterWorld.resume()
    }
    // Set up world config
    const { width, height } = this.sys.game.canvas
    const worldWidth = 2400 * 20

    // ---- GROUND/ROAD ----
    const roadPoints: { x: number; y: number }[] = []
    const n = Math.floor(worldWidth / 10)
    const amp = 78
    for (let i = 0; i <= n; i++) {
      const x = i * 10
      const nx = x * 0.012
      const yRaw = Math.round(height - 80 + Math.sin(nx) * amp + Math.cos(nx * 0.6) * amp * 0.3)
      // Clamp so the road never goes below the bottom of the canvas (leave a small margin for stroke width)
      const y = Math.min(yRaw, height - 8)
      roadPoints.push({ x, y })
    }

    // Оранжевая линия трассы
    const g = this.add.graphics()
    g.clear()
    g.lineStyle(8, 0xff8800, 1)
    g.beginPath()
    g.moveTo(roadPoints[0]?.x ?? 0, roadPoints[0]?.y ?? 0)
    for (let i = 1; i < roadPoints.length; ++i) {
      g.lineTo(roadPoints[i]?.x ?? 0, roadPoints[i]?.y ?? 0)
    }
    g.strokePath()
    g.closePath()

    // Ground body (series of rectangles for each segment - robust for wheels)
    for (let i = 1; i < roadPoints.length; i++) {
      const a = roadPoints[i - 1] ?? { x: 0, y: 0 },
        b = roadPoints[i] ?? { x: 0, y: 0 }
      const segmentLength = Math.hypot((b.x ?? 0) - (a.x ?? 0), (b.y ?? 0) - (a.y ?? 0))
      const angle = Math.atan2((b.y ?? 0) - (a.y ?? 0), (b.x ?? 0) - (a.x ?? 0))
      // Offset to center of segment
      const mx = ((a.x ?? 0) + (b.x ?? 0)) / 2,
        my = ((a.y ?? 0) + (b.y ?? 0)) / 2
      this.matter.add.rectangle(mx, my, segmentLength, 14, {
        isStatic: true,
        angle,
        friction: 1.1,
        restitution: 0.1,
        collisionFilter: {
          category: 0x0002,
          mask: 0xffff,
        },
        label: 'road-segment',
        render: { visible: false },
      })
    }

    // ---- CAR ----
    const carX = 160
    const carY = height - 140
    this.carBody = this.matter.add.rectangle(carX, carY, 82, 26, {
      chamfer: { radius: 6 },
      density: 0.001,
      friction: 0.6,
      frictionStatic: 0.9,
      frictionAir: 0.04,
      restitution: 0.08,
      collisionFilter: {
        category: 0x0001,
        mask: (0xffff ^ 0x0001) & (0xffff ^ 0x0002),
      },
      label: 'car-body',
    })
    // Инициализируем стартовую точку для расчёта очков
    startCarX.value = this.carBody.position.x
    maxCarX.value = this.carBody.position.x
    // Rectangle above carBody (physics only, if needed visually, can set isSensor: true)
    this.carRoof = this.matter.add.circle(carX, carY - 22, 14, {
      label: 'car-roof',
      collisionFilter: {
        category: 0x0001,
        mask: 0xffff,
      },
      mass: 1 / 100,
    })
    // Constraint to fix carRoof to carBody
    this.matter.add.constraint(this.carBody, this.carRoof, 0, 1, {
      pointA: { x: 50, y: -40 },
      // pointB: { x: 0, y: -5 },
    })
    // Wheels (physics only) - positioned under the car body
    this.leftWheel = this.matter.add.circle(carX - 33, carY + 13, 12, {
      density: 0.0012,
      friction: 3.5,
      restitution: 0.18,
      collisionFilter: {
        category: 0x0001,
        mask: (0xffff ^ 0x0001) | 0x0002,
      },
      label: 'left-wheel',
    })
    this.rightWheel = this.matter.add.circle(carX + 33, carY + 13, 12, {
      density: 0.0012,
      friction: 3.5,
      restitution: 0.18,
      collisionFilter: {
        category: 0x0001,
        mask: (0xffff ^ 0x0001) | 0x0002,
      },
      label: 'right-wheel',
    })

    // создаём графику для отрисовки левого колеса
    const ramaGraphics = this.add.graphics()
    ramaGraphics.fillStyle(0x000000, 1) // 2px, чёрный цвет, непрозрачный
    ramaGraphics.fillRect(-30, 11, 60, 3)
    this.matter.add.gameObject(ramaGraphics, this.carBody)

    // создаём графику для отрисовки левого колеса
    const leftWheelGraphics = this.add.graphics()
    leftWheelGraphics.lineStyle(2, 0x000000, 1) // 2px, чёрный цвет, непрозрачный
    leftWheelGraphics.strokeCircle(0, 0, 12)
    this.matter.add.gameObject(leftWheelGraphics, this.leftWheel)

    // создаём графику для отрисовки правого колеса
    const rightWheelGraphics = this.add.graphics()
    rightWheelGraphics.lineStyle(2, 0x000000, 1) // 2px, чёрный цвет, непрозрачный
    rightWheelGraphics.strokeCircle(0, 0, 12)
    this.matter.add.gameObject(rightWheelGraphics, this.rightWheel)

    // Constraints (axles, springs) - attach to bottom of car body with fixed point
    this.matter.add.constraint(this.carBody, this.leftWheel, 0, 0.5, { pointA: { x: -33, y: 13 } })
    this.matter.add.constraint(this.carBody, this.rightWheel, 0, 0.5, { pointA: { x: 33, y: 13 } })

    // Графика для кузова — загруженная PNG
    const bodySprite = this.add.sprite(0, 0, 'horse-body').setOrigin(0.54, 0.7)
    const multiply = 1
    bodySprite.displayWidth = 110 * multiply
    bodySprite.displayHeight = 70 * multiply
    const headSprite = this.add.sprite(0, 0, 'horse-head').setOrigin(0.5, 0.5)
    headSprite.displayWidth = 4 * 14
    headSprite.displayHeight = 3 * 14
    // слежение за физическим телом
    this.add.existing(bodySprite)
    this.add.existing(headSprite)
    this.events.on('postupdate', () => {
      bodySprite.x = this.carBody.position.x
      bodySprite.y = this.carBody.position.y
      bodySprite.rotation = this.carBody.angle

      // Обновляем максимальную достигнутую X-координату (счёт растёт только при движении вперёд)
      const currentX = this.carBody.position.x
      if (currentX > maxCarX.value) {
        maxCarX.value = currentX
      }

      headSprite.x = this.carRoof.position.x
      headSprite.y = this.carRoof.position.y
      headSprite.rotation = this.carRoof.angle
    })

    // Дебажных прямоугольников и колес больше не рисуем!

    // --- ALARM ON CARROOF/ROAD COLLISION ---
    this.matter.world.on('collisionstart', (event: any) => {
      if (this.gameOver) return
      const pairs = event.pairs
      for (const pair of pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label]
        if (labels.includes('car-roof') && labels.includes('road-segment')) {
          this.gameOver = true
          // Stop bg music and play fail/gameover sounds
          appStore.stopMusic()
          appStore.playSfxHorseFail()
          appStore.playSfxGameOver()
          setTimeout(() => {
            showGameOver.value = true
          }, 100)
          this.matter.world.pause()
          if (this.input.keyboard) {
            this.input.keyboard.enabled = false
          }
          break
        }
      }
    })

    // ---- CONTROLS ----
    if (this.input.keyboard) this.input.keyboard.enabled = true
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    // Camera follows carBody position directly
    this.cameras.main.setBounds(0, 0, worldWidth, height)
    // Override camera follow: manually update camera each frame
    this.events.on('postupdate', () => {
      this.cameras.main.centerOn(this.carBody.position.x, this.carBody.position.y)
    })
  }

  override update() {
    // Simple car controls: wheels get torque when left/right pressed
    if (this.gameOver) return
    if (!this.cursors) return
    const torque = 0.18
    const moveBounds = 0.65
    const angleTorque = 0.001
    const angleBounds = 1.5
    if (this.cursors.right.isDown) {
      this.matter.body.setAngularVelocity(
        this.leftWheel,
        Phaser.Math.Clamp(this.leftWheel.angularVelocity + torque, -moveBounds, moveBounds)
      )
      this.matter.body.setAngularVelocity(
        this.rightWheel,
        Phaser.Math.Clamp(this.rightWheel.angularVelocity + torque, -moveBounds, moveBounds)
      )
      // Добавляем небольшой импульс наклона влево К ТЕКУЩЕМУ зн.
      this.matter.body.setAngularVelocity(
        this.carBody,
        Phaser.Math.Clamp(this.carBody.angularVelocity - angleTorque, -angleBounds, angleBounds)
      )
    } else if (this.cursors.left.isDown) {
      this.matter.body.setAngularVelocity(
        this.leftWheel,
        Phaser.Math.Clamp(this.leftWheel.angularVelocity - torque, -moveBounds, moveBounds)
      )
      this.matter.body.setAngularVelocity(
        this.rightWheel,
        Phaser.Math.Clamp(this.rightWheel.angularVelocity - torque, -moveBounds, moveBounds)
      )
      // Добавляем небольшой импульс наклона вправо К ТЕКУЩЕМУ зн.
      this.matter.body.setAngularVelocity(
        this.carBody,
        Phaser.Math.Clamp(this.carBody.angularVelocity + angleTorque, -angleBounds, angleBounds)
      )
    }

    // Space to boost/jump
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.matter.body.setVelocity(this.carBody, { x: this.carBody.velocity.x, y: this.carBody.velocity.y - 8 })
    }
  }
}

onMounted(() => {
  recalcSize()
  appStore.startMusic()
  if (gameContainer.value) {
    phaserGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: gameContainer.value,
      width: dynamicWidth.value,
      height: dynamicHeight.value,
      backgroundColor: '#ffffff',
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 1.15 },
          debug: false,
        },
      },
      scene: CarExampleScene,
    })
  }
  window.addEventListener('resize', () => {
    recalcSize()
    if (phaserGame) {
      phaserGame.scale.resize(dynamicWidth.value, dynamicHeight.value)
    }
  })
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', recalcSize)
  appStore.stopMusic()
  if (phaserGame) {
    phaserGame.destroy(true)
    phaserGame = null
  }
})

// Эмулируем нажатие стрелки, если зажата кнопка на экране
onMounted(() => {
  interval = window.setInterval(() => {
    if (phaserGame?.scene) {
      const scene: any = phaserGame.scene.keys.CarExampleScene
      if (scene?.cursors) {
        scene.cursors.left.isDown = leftHeld.value
        scene.cursors.right.isDown = rightHeld.value
      }
    }
  }, 16)
})
onBeforeUnmount(() => {
  if (interval) clearInterval(interval)
})
</script>

<style lang="scss" scoped>
.game {
  width: 100vw;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  background: #fff;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0;
}

.game > canvas {
  width: 100vw !important;
  max-width: 100vw !important;
  height: 80vh !important;
  display: block;
  position: relative;
  margin: 0 auto;
  top: 0;
  transform: none;
}

@media (orientation: portrait) {
  .game > canvas {
    width: 100vw !important;
    height: 80vh !important;
  }
}

@media (orientation: landscape) {
  .game > canvas {
    width: 100vw !important;
    height: 80vh !important;
  }
}

:global(body) {
  background: #fff !important;
  margin: 0 !important;
  min-height: 100vh;
  min-width: 100vw;
  overflow-x: hidden;
  overflow-y: hidden;
}

.mobile-controls {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 35px;
  display: flex;
  justify-content: space-between;
  gap: 36px;
  pointer-events: none;
  z-index: 10;
  margin-inline: 50px;
}

.mobile-controls button.control {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 3px solid #000000;
  background: rgba(255, 255, 255, 0.9);
  color: #000000;
  font-size: 2.7rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.08);
  cursor: pointer;
  pointer-events: auto;
  transition: background 0.12s;
  user-select: none;
  -webkit-user-select: none;
}

.mobile-controls button.control:active {
  background: rgba(109, 109, 109, 0.24);
}

.hud {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  pointer-events: none;
}
.hud-score {
  font-weight: 700;
  font-size: 2.5rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(40, 40, 40, 0.4);
  backdrop-filter: blur(4px);
}
.modal-box {
  background: #fff;
  border-radius: 17px;
  box-shadow: 0 6px 32px 4px rgba(0,0,0,0.13);
  min-width: 280px;
  max-width: 95vw;
  padding: 32px 20px 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 23px;
}
.modal-score {
  font-size: 48px;
  font-weight: 600;
  color: #181818;
  text-align: center;
}
.modal-score-text{
  text-align: center;
}
.modal-title {
  font-size: 1.27rem;
  font-weight: 600;
  color: #181818;
  text-align: center;
  text-transform: uppercase;
}
.modal-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
}
.modal-box button {
  padding: 11px 23px;
  border-radius: 40px;
  border: none;
  font-weight: 600;
  background: #e5ecff;
  color: #204faa;
  font-size: 1.07rem;
  cursor: pointer;
  transition: background 0.14s;
}
.modal-box button:hover {
  background: #c3d6ff;
}
.modal-box a {
  display: inline-block;
  text-decoration: none;
  padding: 11px 23px;
  border-radius: 40px;
  font-weight: 600;
  background: #fee5e5;
  color: #de2a18;
  font-size: 1.05rem;
  transition: background 0.14s;
}
.modal-box a:hover {
  background: #ffd6d6;
}
</style>
