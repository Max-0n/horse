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
    // assets could be loaded here
  }

  create() {
    // Set up world config
    const { width, height } = this.sys.game.canvas
    const worldWidth = 2400

    // ---- GROUND/ROAD ----
    // Prepare points along a curve for the road
    const roadPoints: { x: number; y: number }[] = []
    const n = Math.floor(worldWidth / 10)
    const amp = 78
    for (let i = 0; i <= n; i++) {
      const x = i * 10
      const nx = x * 0.012
      const y = Math.round(height - 80 + Math.sin(nx) * amp + Math.cos(nx * 0.6) * amp * 0.3)
      roadPoints.push({ x, y })
    }

    // Road visual: 2px green centerline
    const g = this.add.graphics()
    g.clear()
    g.lineStyle(2, 0x19f425)
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
      })
    }

    // ---- CAR ----
    const carX = 160
    const carY = height - 140
    // Chassis rectangle (physics only)
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
    this.matter.add.constraint(this.carBody, this.leftWheel, 0, 0.32, { pointA: { x: -32, y: 13 } })
    this.matter.add.constraint(this.carBody, this.rightWheel, 0, 0.32, { pointA: { x: 32, y: 13 } })

    // --- DEBUG GRAPHICS for car ---
    const debugGraphics = this.add.graphics()
    debugGraphics.fillStyle(0xffffff, 1)
    debugGraphics.lineStyle(2, 0x222222, 0.9)
    // car body
    debugGraphics.strokeRoundedRect(-41, -13, 82, 26, 6)
    // left wheel - positioned under car body
    debugGraphics.strokeCircle(-32, 13, 12)
    // right wheel - positioned under car body
    debugGraphics.strokeCircle(32, 13, 12)
    // Make the debug graphics follow the car body
    this.add.existing(debugGraphics)
    this.events.on('postupdate', () => {
      debugGraphics.x = this.carBody.position.x
      debugGraphics.y = this.carBody.position.y
      debugGraphics.rotation = this.carBody.angle
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
    if (!this.cursors) return
    const torque = 0.088
    if (this.cursors.right.isDown) {
      this.matter.body.setAngularVelocity(
        this.leftWheel,
        Phaser.Math.Clamp(this.leftWheel.angularVelocity + torque, -0.65, 0.65)
      )
      this.matter.body.setAngularVelocity(
        this.rightWheel,
        Phaser.Math.Clamp(this.rightWheel.angularVelocity + torque, -0.65, 0.65)
      )
    } else if (this.cursors.left.isDown) {
      this.matter.body.setAngularVelocity(
        this.leftWheel,
        Phaser.Math.Clamp(this.leftWheel.angularVelocity - torque, -0.65, 0.65)
      )
      this.matter.body.setAngularVelocity(
        this.rightWheel,
        Phaser.Math.Clamp(this.rightWheel.angularVelocity - torque, -0.65, 0.65)
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
      backgroundColor: '#4cc6ef',
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
  width: 100%;
  height: 400px;
  max-width: 800px;
  margin: 40px auto 0 auto;
  background: #242c3a;
  border-radius: 21px;
  box-shadow: 0 2px 24px 0 rgba(0,0,0,0.35);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
