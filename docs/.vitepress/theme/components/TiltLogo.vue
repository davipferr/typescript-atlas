<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Parallax depth card applied to the hero logo: real 3D (tilt + translateZ
// inside preserve-3d) with a moving glare. The side under the pointer is
// pressed away from the viewer instead of leaning towards it.
const MAX_TILT = 14 // degrees
const SMOOTHING = 0.6 // 0 = follow the pointer directly, 1 = very slow
const RATE = 4 + (1 - SMOOTHING) * 26 // per second, used in exp(-rate·dt)

const stage = ref<HTMLElement | null>(null)
const card = ref<HTMLElement | null>(null)

let target = { x: 0, y: 0, glare: 0 }
let current = { x: 0, y: 0, glare: 0 }
let frame = 0
let last = 0
let reduceMotion = false

function onMove(e: PointerEvent) {
  const rect = stage.value!.getBoundingClientRect()
  // -1 … 1 from the centre of the stage
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  const y = ((e.clientY - rect.top) / rect.height) * 2 - 1
  target = { x: clamp(x), y: clamp(y), glare: 1 }
  start()
}

function onLeave() {
  target = { x: 0, y: 0, glare: 0 }
  start()
}

function clamp(v: number) {
  return Math.max(-1, Math.min(1, v))
}

function start() {
  if (!frame) {
    last = performance.now()
    frame = requestAnimationFrame(tick)
  }
}

function tick(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  const k = reduceMotion ? 1 : 1 - Math.exp(-RATE * dt)
  current.x += (target.x - current.x) * k
  current.y += (target.y - current.y) * k
  current.glare += (target.glare - current.glare) * k
  apply()

  const settled =
    Math.abs(target.x - current.x) < 0.001 &&
    Math.abs(target.y - current.y) < 0.001 &&
    Math.abs(target.glare - current.glare) < 0.001
  frame = settled ? 0 : requestAnimationFrame(tick)
}

function apply() {
  const el = card.value
  if (!el) return
  el.style.setProperty('--rx', `${-current.y * MAX_TILT}deg`)
  el.style.setProperty('--ry', `${current.x * MAX_TILT}deg`)
  el.style.setProperty('--gx', `${50 + current.x * 50}%`)
  el.style.setProperty('--gy', `${50 + current.y * 50}%`)
  el.style.setProperty('--go', `${current.glare}`)
}

onMounted(() => {
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <div
    ref="stage"
    class="tilt-stage"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <div ref="card" class="tilt-card" role="img" aria-label="TypeScript Atlas">
      <svg class="layer layer-hex" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="tilt-logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#4a90e2" />
            <stop offset="1" stop-color="#235a97" />
          </linearGradient>
        </defs>
        <path d="M32 3 57 17.5v29L32 61 7 46.5v-29Z" fill="url(#tilt-logo-g)" />
      </svg>
      <div class="layer layer-glare" aria-hidden="true" />
      <svg class="layer layer-t" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M15 24h16M23 24v19" class="stroke" />
      </svg>
      <svg class="layer layer-s" viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M48.5 26.5a6 6 0 0 0-5.3-2.6c-3.3 0-5.4 2-5.4 4.6 0 6.3 11.2 3.6 11.2 10.2 0 2.9-2.4 5.1-5.9 5.1a7.4 7.4 0 0 1-6.3-3.3"
          class="stroke"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
/* Same box as VitePress' .image-src so the hero layout doesn't change */
.tilt-stage {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 192px;
  height: 192px;
  transform: translate(-50%, -50%);
  perspective: 900px;
  touch-action: pan-y;
}

@media (min-width: 640px) {
  .tilt-stage { width: 256px; height: 256px; }
}

@media (min-width: 960px) {
  .tilt-stage { width: 320px; height: 320px; }
}

.tilt-card {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  will-change: transform;
}

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.layer-hex { transform: translateZ(0); }
.layer-glare { transform: translateZ(1px); }
.layer-t { transform: translateZ(40px); }
.layer-s { transform: translateZ(60px); }

.stroke {
  fill: none;
  stroke: #fff;
  stroke-width: 4.2;
  stroke-linecap: round;
}

/* Glare clipped to the hexagon (points from the 64×64 viewBox) */
.layer-glare {
  clip-path: polygon(50% 4.69%, 89.06% 27.34%, 89.06% 72.66%, 50% 95.31%, 10.94% 72.66%, 10.94% 27.34%);
  background: radial-gradient(
    circle at var(--gx, 50%) var(--gy, 50%),
    rgba(255, 255, 255, 0.4),
    rgba(255, 255, 255, 0) 55%
  );
  opacity: var(--go, 0);
  pointer-events: none;
}
</style>
