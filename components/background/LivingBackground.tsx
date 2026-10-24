'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  baseAlpha: number
}

export function LivingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    // Cursor tracking with smoothing (inertia)
    const targetMouse = { x: width / 2, y: height / 2 }
    const currentMouse = { x: width / 2, y: height / 2 }

    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.x = e.clientX
      targetMouse.y = e.clientY
    }

    window.addEventListener('mousemove', handleMouseMove)

    // Responsive particle count
    const getParticleCount = () => {
      if (width < 768) return 35
      if (width < 1200) return 65
      return 95
    }

    const particles: Particle[] = Array.from({ length: getParticleCount() }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 1.6 + 0.7,
      alpha: Math.random() * 0.4 + 0.15,
      baseAlpha: Math.random() * 0.4 + 0.15,
    }))

    const render = () => {
      // Smooth cursor inertia (0.06 = calm follow)
      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.06
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.06

      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        if (!prefersReducedMotion) {
          p.x += p.vx
          p.y += p.vy

          // Bounce off edges
          if (p.x < 0 || p.x > width) p.vx *= -1
          if (p.y < 0 || p.y > height) p.vy *= -1

          // Cursor attraction/repulsion (220px influence)
          const dx = currentMouse.x - p.x
          const dy = currentMouse.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 220

          if (dist < maxDist) {
            const force = (1 - dist / maxDist) * 0.02
            p.x -= dx * force
            p.y -= dy * force
            p.alpha = Math.min(0.85, p.baseAlpha + (1 - dist / maxDist) * 0.5)
          } else {
            p.alpha += (p.baseAlpha - p.alpha) * 0.05
          }
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(160, 185, 255, ${p.alpha})`
        ctx.fill()

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const pdx = p.x - p2.x
          const pdy = p.y - p2.y
          const pdist = Math.sqrt(pdx * pdx + pdy * pdy)
          const connMaxDist = 130

          if (pdist < connMaxDist) {
            const lineAlpha = (1 - pdist / connMaxDist) * 0.12
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(120, 150, 240, ${lineAlpha})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    // Pause when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId)
      } else {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    render()

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [prefersReducedMotion])

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#05070D]">
      {/* Layer 1: Deep ambient gradients (breathing slowly) */}
      <div 
        className="absolute -top-[20%] -left-[15%] w-[65vw] h-[65vw] rounded-full blur-[140px] opacity-25 animate-pulse pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(79, 124, 255, 0.5) 0%, rgba(30, 40, 90, 0) 70%)',
          animationDuration: '22s'
        }}
      />
      <div 
        className="absolute -bottom-[25%] -right-[10%] w-[70vw] h-[70vw] rounded-full blur-[160px] opacity-20 animate-pulse pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, rgba(20, 20, 50, 0) 70%)',
          animationDuration: '28s'
        }}
      />
      <div 
        className="absolute top-[40%] left-[45%] w-[40vw] h-[40vw] rounded-full blur-[120px] opacity-15 animate-pulse pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(10, 10, 30, 0) 70%)',
          animationDuration: '35s'
        }}
      />

      {/* Layer 2: Interactive Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none block" />
    </div>
  )
}