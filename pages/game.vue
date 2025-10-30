<template lang="pug">
  .game(ref="gameContainer")
  .mobile-controls
    button.control.left(@touchstart="leftHeld = true" @touchend="leftHeld = false" @mousedown="leftHeld = true" @mouseup="leftHeld = false" @mouseleave="leftHeld = false" aria-label="Влево") &#60;
    button.control.right(@touchstart="rightHeld = true" @touchend="rightHeld = false" @mousedown="rightHeld = true" @mouseup="rightHeld = false" @mouseleave="rightHeld = false" aria-label="Вправо") &#62;
  .modal-overlay(v-if="showGameOver")
    .modal-box
      .score-container
        h3.modal-score 0
        p.modal-score-text Score
      .modal-title Game Over
      .modal-buttons
        button(@click="restartGame") Restart
        NuxtLink(to="/") Home
</template>

<script lang="ts" setup>
import Phaser from 'phaser'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useAppStore } from '~/stores/appStore'

const gameContainer = ref<HTMLDivElement | null>(null)
let phaserGame: Phaser.Game | null = null
const appStore = useAppStore()

const leftHeld = ref(false)
const rightHeld = ref(false)
const showGameOver = ref(false)
function restartGame() {
  window.location.reload()
}

let interval: number | null = null

const GAME_WIDTH = 600
const aspect = 600 / 400
const MAX_HEIGHT = 300
const dynamicWidth = ref(Math.round(window.innerWidth))
const dynamicHeight = ref(Math.min(Math.round(window.innerWidth / aspect), MAX_HEIGHT))

function recalcSize() {
  dynamicWidth.value = window.innerWidth
  dynamicHeight.value = Math.min(Math.round(dynamicWidth.value / aspect), MAX_HEIGHT)
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
    this.load.image('horse-leg', '/images/left_leg.png')
  }

  create() {
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
    g.lineStyle(8, 0xFF8800, 1)
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
    // Rectangle above carBody (physics only, if needed visually, can set isSensor: true)
    this.carRoof = this.matter.add.circle(carX, carY - 22, 14, {
      label: 'car-roof',
      collisionFilter: {
        category: 0x0001,
        mask: 0xffff,
      },
    })
    // Constraint to fix carRoof to carBody
    this.matter.add.constraint(this.carBody, this.carRoof, 0, 1, {
      pointA: { x: 30, y: -40 },
      // pointB: { x: 0, y: -5 },
    })
    // Wheels (physics only) - positioned under the car body
    this.leftWheel = this.matter.add.circle(carX - 32, carY + 13, 12, {
      density: 0.0012,
      friction: 3.5,
      restitution: 0.18,
      collisionFilter: {
        category: 0x0001,
        mask: (0xffff ^ 0x0001) | 0x0002,
      },
      label: 'left-wheel',
    })
    this.rightWheel = this.matter.add.circle(carX + 32, carY + 13, 12, {
      density: 0.0012,
      friction: 3.5,
      restitution: 0.18,
      collisionFilter: {
        category: 0x0001,
        mask: (0xffff ^ 0x0001) | 0x0002,
      },
      label: 'right-wheel',
    })
    // Constraints (axles, springs) - attach to bottom of car body with fixed point
    this.matter.add.constraint(this.carBody, this.leftWheel, 0, 0.5, { pointA: { x: -32, y: 13 } })
    this.matter.add.constraint(this.carBody, this.rightWheel, 0, 0.5, { pointA: { x: 32, y: 13 } })

    // Графика для кузова — загруженная PNG
    const bodySprite = this.add.sprite(0, 0, 'horse-body').setOrigin(0.5, 0.5)
    bodySprite.displayWidth = 82
    bodySprite.displayHeight = 46 // немного больше, чтобы занять место кузова
    const headSprite = this.add.sprite(0, 0, 'horse-head').setOrigin(0.5, 0.5)
    headSprite.displayWidth = 4 * 14
    headSprite.displayHeight = 3 * 14
    const leftLegSprite = this.add.sprite(0, 0, 'horse-leg').setOrigin(0.5, 0.5)
    leftLegSprite.displayWidth = 2 * 14
    leftLegSprite.displayHeight = 3 * 14
    const rightLegSprite = this.add.sprite(0, 0, 'horse-leg').setOrigin(0.5, 0.5)
    rightLegSprite.displayWidth = 2 * 14
    rightLegSprite.displayHeight = 3 * 14
    // слежение за физическим телом
    this.add.existing(bodySprite)
    this.add.existing(headSprite)
    this.add.existing(leftLegSprite)
    this.add.existing(rightLegSprite)
    this.events.on('postupdate', () => {
      bodySprite.x = this.carBody.position.x + 10
      bodySprite.y = this.carBody.position.y - 15
      bodySprite.rotation = this.carBody.angle

      headSprite.x = this.carRoof.position.x
      headSprite.y = this.carRoof.position.y
      headSprite.rotation = this.carRoof.angle

      leftLegSprite.x = this.carBody.position.x - 17
      leftLegSprite.y = this.carBody.position.y + 10
      leftLegSprite.rotation = this.carBody.angle

      rightLegSprite.x = this.carBody.position.x + 32
      rightLegSprite.y = this.carBody.position.y + 13
      rightLegSprite.rotation = this.carBody.angle
    })

    // Дебажных прямоугольников и колес больше не рисуем!

    // --- ALARM ON CARROOF/ROAD COLLISION ---
    this.matter.world.on('collisionstart', (event: any) => {
      if (this.gameOver) return
      const pairs = event.pairs
      for (const pair of pairs) {
        const labels = [ pair.bodyA.label, pair.bodyB.label ]
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
          Phaser.Math.Clamp(this.leftWheel.angularVelocity + torque, -moveBounds, moveBounds),
      )
      this.matter.body.setAngularVelocity(
          this.rightWheel,
          Phaser.Math.Clamp(this.rightWheel.angularVelocity + torque, -moveBounds, moveBounds),
      )
      // Добавляем небольшой импульс наклона влево К ТЕКУЩЕМУ зн.
      this.matter.body.setAngularVelocity(
          this.carBody,
          Phaser.Math.Clamp(this.carBody.angularVelocity - angleTorque, -angleBounds, angleBounds),
      )
    } else if (this.cursors.left.isDown) {
      this.matter.body.setAngularVelocity(
          this.leftWheel,
          Phaser.Math.Clamp(this.leftWheel.angularVelocity - torque, -moveBounds, moveBounds),
      )
      this.matter.body.setAngularVelocity(
          this.rightWheel,
          Phaser.Math.Clamp(this.rightWheel.angularVelocity - torque, -moveBounds, moveBounds),
      )
      // Добавляем небольшой импульс наклона вправо К ТЕКУЩЕМУ зн.
      this.matter.body.setAngularVelocity(
          this.carBody,
          Phaser.Math.Clamp(this.carBody.angularVelocity + angleTorque, -angleBounds, angleBounds),
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
          debug: true,
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
    if (phaserGame && phaserGame.scene) {
      const scene: any = phaserGame.scene.keys.CarExampleScene
      if (scene && scene.cursors) {
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
  align-items: center;
  justify-content: center;
  padding: 0;
}

.game > canvas {
  width: 100vw !important;
  max-width: 100vw !important;
  height: auto !important;
  max-height: 300px !important;
  aspect-ratio: 3/1;
  display: block;
  position: relative;
  margin: 0 auto;
  top: 50%;
  transform: translateY(-50%);
}

@media (orientation: portrait) {
  .game > canvas {
    width: 100vw !important;
    height: calc(100vw / 1.5) !important;
  }
}

@media (orientation: landscape) {
  .game > canvas {
    width: 100vw !important;
    height: calc(100vw / 1.5) !important;
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
