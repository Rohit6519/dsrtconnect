'use client'

import { useEffect, useRef } from 'react'

type Flake = {
  x: number
  y: number
  r: number
  speed: number
  drift: number
  opacity: number
}

export function Snowflakes() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let flakes: Flake[] = []
    let raf = 0
    let running = true

    // Increased quantity of snowflakes
    const countForSize = () => {
      if (width < 768) return 50
      if (width < 1200) return 90
      return 150
    }

    const makeFlakes = () => {
      const n = countForSize()
      flakes = Array.from({ length: n }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        // Increased size (radius)
        r: Math.random() * 2.5 + 1.2,
        speed: Math.random() * 0.4 + 0.2, // slightly faster to match size
        drift: (Math.random() - 0.5) * 0.35,
        opacity: Math.random() * 0.4 + 0.2,
      }))
    }

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      makeFlakes()
    }

    const draw = () => {
      if (!running) return
      ctx.clearRect(0, 0, width, height)

      for (const f of flakes) {
        f.y += f.speed
        f.x += f.drift + Math.sin(f.y * 0.01) * 0.15

        if (f.y > height + 6) {
          f.y = -6
          f.x = Math.random() * width
        }
        if (f.x > width + 6) f.x = -6
        if (f.x < -6) f.x = width + 6

        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220, 230, 255, ${f.opacity})`
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else {
        running = true
        raf = requestAnimationFrame(draw)
      }
    }

    resize()
    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      // Fixed overlay z-index to 50 so it falls in front of the page (but behind modals/toasts)
      className="pointer-events-none fixed inset-0 z-50 mix-blend-screen"
      aria-hidden
    />
  )
}