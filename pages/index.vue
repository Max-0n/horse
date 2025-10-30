<template lang="pug">
  .game(ref="gameContainer")
</template>

<script lang="ts" setup>
import Phaser from 'phaser'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const gameContainer = ref<HTMLDivElement | null>(null)
let phaserGame: Phaser.Game | null = null

// --- SCENE CLASS ---
class CarExampleScene extends Phaser.Scene {
  // Car and wheels
  carBody!: MatterJS.BodyType
  leftWheel!: MatterJS.BodyType
  rightWheel!: MatterJS.BodyType

  // Controls
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  spaceKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'CarExampleScene' })
  }

  preload() {
    // загружаем текстуру кузова вместо debug
    this.load.image('horse-body', '/images/horse_body.png') // путь подправь по своему имени png
  }

  create() {
    // Set up world config
    const { width, height } = this.sys.game.canvas
    const worldWidth = 2400

    // ---- GROUND/ROAD ----
    const roadPoints: { x: number; y: number }[] = []
    const n = Math.floor(worldWidth / 10)
    const amp = 78
    for (let i = 0; i <= n; i++) {
      const x = i * 10
      const nx = x * 0.012
      const y = Math.round(height - 80 + Math.sin(nx) * amp + Math.cos(nx * 0.6) * amp * 0.3)
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
    this.matter.add.constraint(this.carBody, this.leftWheel, 0, 0.32, { pointA: { x: -32, y: 13 } })
    this.matter.add.constraint(this.carBody, this.rightWheel, 0, 0.32, { pointA: { x: 32, y: 13 } })

    // Графика для кузова — загруженная PNG
    const bodySprite = this.add.sprite(0, 0, 'horse-body').setOrigin(0.5, 0.5)
    bodySprite.displayWidth = 82
    bodySprite.displayHeight = 46 // немного больше, чтобы занять место кузова
    // слежение за физическим телом
    this.add.existing(bodySprite)
    this.events.on('postupdate', () => {
      bodySprite.x = this.carBody.position.x
      bodySprite.y = this.carBody.position.y
      bodySprite.rotation = this.carBody.angle
    })

    // Дебажных прямоугольников и колес больше не рисуем!

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
    if (!this.cursors) return
    const torque = 0.088
    if (this.cursors.right.isDown) {
      this.matter.body.setAngularVelocity(
          this.leftWheel,
          Phaser.Math.Clamp(this.leftWheel.angularVelocity + torque, -0.65, 0.65),
      )
      this.matter.body.setAngularVelocity(
          this.rightWheel,
          Phaser.Math.Clamp(this.rightWheel.angularVelocity + torque, -0.65, 0.65),
      )
    } else if (this.cursors.left.isDown) {
      this.matter.body.setAngularVelocity(
          this.leftWheel,
          Phaser.Math.Clamp(this.leftWheel.angularVelocity - torque, -0.65, 0.65),
      )
      this.matter.body.setAngularVelocity(
          this.rightWheel,
          Phaser.Math.Clamp(this.rightWheel.angularVelocity - torque, -0.65, 0.65),
      )
    }

    // Space to boost/jump
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.matter.body.setVelocity(this.carBody, { x: this.carBody.velocity.x, y: this.carBody.velocity.y - 8 })
    }
  }
}

onMounted(() => {
  if (gameContainer.value) {
    phaserGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: gameContainer.value,
      width: 600,
      height: 400,
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
})

onBeforeUnmount(() => {
  if (phaserGame) {
    phaserGame.destroy(true)
    phaserGame = null
  }
})
</script>

<style lang="scss" scoped>
.game {
  width: 600px;
  height: 400px;
  margin: 0;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

:global(body) {
  background: #fff !important;
  margin: 0 !important;
  min-height: 100vh;
  min-width: 100vw;
  overflow-x: hidden;
  overflow-y: hidden;
}
</style>
