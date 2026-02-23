'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

type ParticleType = 'dot' | 'dash'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  type: ParticleType
  length: number
  angle: number
  spin: number
  color: [number, number, number]
}

type LiveBackgroundProps = {
  className?: string
  desktopParticles?: number
  mobileParticles?: number
}

const DEFAULT_DESKTOP_PARTICLES = 80
const DEFAULT_MOBILE_PARTICLES = 40

const COLOR_POOL: Array<[number, number, number]> = [
  [34, 74, 150],  // deep navy-blue
  [66, 118, 212], // soft blue
  [94, 153, 236], // soft blue accent
  [121, 93, 214], // occasional violet
]

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function pickColor(): [number, number, number] {
  const roll = Math.random()
  if (roll < 0.03) return COLOR_POOL[3]
  if (roll < 0.38) return COLOR_POOL[2]
  if (roll < 0.75) return COLOR_POOL[1]
  return COLOR_POOL[0]
}

function createParticle(width: number, height: number): Particle {
  const type: ParticleType = Math.random() < 0.78 ? 'dot' : 'dash'
  const speed = randomBetween(0.015, 0.085)
  const direction = randomBetween(0, Math.PI * 2)
  const length = type === 'dash' ? randomBetween(5, 12) : 0

  return {
    x: randomBetween(0, width),
    y: randomBetween(0, height),
    vx: Math.cos(direction) * speed,
    vy: Math.sin(direction) * speed,
    size: type === 'dot' ? randomBetween(0.5, 1.7) : randomBetween(0.8, 1.3),
    alpha: randomBetween(0.06, 0.18),
    type,
    length,
    angle: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-0.003, 0.003),
    color: pickColor(),
  }
}

export function LiveBackground({
  className,
  desktopParticles = DEFAULT_DESKTOP_PARTICLES,
  mobileParticles = DEFAULT_MOBILE_PARTICLES,
}: LiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    let width = 0
    let height = 0
    let dpr = 1
    let rafId: number | null = null
    let particles: Particle[] = []
    let isReducedMotion = false

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const drawFrame = (animate: boolean) => {
      context.clearRect(0, 0, width, height)

      for (const particle of particles) {
        if (animate) {
          particle.x += particle.vx
          particle.y += particle.vy
          particle.angle += particle.spin

          if (particle.x < -14) particle.x = width + 14
          if (particle.x > width + 14) particle.x = -14
          if (particle.y < -14) particle.y = height + 14
          if (particle.y > height + 14) particle.y = -14
        }

        const [r, g, b] = particle.color

        if (particle.type === 'dot') {
          context.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.alpha})`
          context.beginPath()
          context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          context.fill()
          continue
        }

        const halfLength = particle.length / 2
        const startX = particle.x - Math.cos(particle.angle) * halfLength
        const startY = particle.y - Math.sin(particle.angle) * halfLength
        const endX = particle.x + Math.cos(particle.angle) * halfLength
        const endY = particle.y + Math.sin(particle.angle) * halfLength

        context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${particle.alpha})`
        context.lineWidth = particle.size
        context.lineCap = 'round'
        context.beginPath()
        context.moveTo(startX, startY)
        context.lineTo(endX, endY)
        context.stroke()
      }
    }

    const cancelAnimation = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
        rafId = null
      }
    }

    const animate = () => {
      drawFrame(true)
      rafId = window.requestAnimationFrame(animate)
    }

    const startAnimation = () => {
      if (isReducedMotion || rafId !== null) return
      rafId = window.requestAnimationFrame(animate)
    }

    const regenerateParticles = () => {
      const isMobile = width < 768
      const count = isMobile ? mobileParticles : desktopParticles
      particles = Array.from({ length: count }, () => createParticle(width, height))
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, Math.floor(rect.width))
      height = Math.max(1, Math.floor(rect.height))
      dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)

      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      regenerateParticles()
      drawFrame(false)
      startAnimation()
    }

    const syncMotionPreference = () => {
      isReducedMotion = reducedMotionQuery.matches
      if (isReducedMotion) {
        cancelAnimation()
        drawFrame(false)
      } else {
        startAnimation()
      }
    }

    const handleReducedMotionChange = () => {
      syncMotionPreference()
    }

    isReducedMotion = reducedMotionQuery.matches
    resizeCanvas()
    syncMotionPreference()

    window.addEventListener('resize', resizeCanvas)
    if (typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
    } else {
      reducedMotionQuery.addListener(handleReducedMotionChange)
    }

    return () => {
      cancelAnimation()
      window.removeEventListener('resize', resizeCanvas)
      if (typeof reducedMotionQuery.removeEventListener === 'function') {
        reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)
      } else {
        reducedMotionQuery.removeListener(handleReducedMotionChange)
      }
    }
  }, [desktopParticles, mobileParticles])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  )
}
