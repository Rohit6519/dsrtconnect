'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function PingPongPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState({ player: 0, ai: 0 })
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let ballX = canvas.width / 2
    let ballY = canvas.height / 2
    let ballSpeedX = 5
    let ballSpeedY = 3
    let playerY = canvas.height / 2 - 40
    let aiY = canvas.height / 2 - 40
    const paddleHeight = 80
    const paddleWidth = 12
    let animationId: number

    const draw = () => {
      // Clear
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Center line
      ctx.strokeStyle = '#333'
      ctx.setLineDash([5, 10])
      ctx.beginPath()
      ctx.moveTo(canvas.width / 2, 0)
      ctx.lineTo(canvas.width / 2, canvas.height)
      ctx.stroke()
      ctx.setLineDash([])

      // Player paddle
      ctx.font = '60px serif'
      ctx.fillText('🏓', 10, playerY + 55)

      // AI paddle
      ctx.fillText('🏓', canvas.width - 70, aiY + 55)

      // Ball
      ctx.font = '40px serif'
      ctx.fillText('🎾', ballX - 20, ballY + 15)

      // Score
      ctx.fillStyle = '#666'
      ctx.font = 'bold 40px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(String(score.player), canvas.width / 4, 50)
      ctx.fillText(String(score.ai), (canvas.width / 4) * 3, 50)
      ctx.textAlign = 'left'
    }

    const update = () => {
      if (!running) {
        draw()
        animationId = requestAnimationFrame(update)
        return
      }

      ballX += ballSpeedX
      ballY += ballSpeedY

      // Top/bottom walls
      if (ballY <= 0 || ballY >= canvas.height - 20) {
        ballSpeedY = -ballSpeedY
      }

      // Player paddle collision
      if (
        ballX <= paddleWidth + 20 &&
        ballY >= playerY &&
        ballY <= playerY + paddleHeight
      ) {
        ballSpeedX = -ballSpeedX
        ballSpeedX *= 1.05
      }

      // AI paddle collision
      if (
        ballX >= canvas.width - paddleWidth - 50 &&
        ballY >= aiY &&
        ballY <= aiY + paddleHeight
      ) {
        ballSpeedX = -ballSpeedX
        ballSpeedX *= 1.05
      }

      // Scoring
      if (ballX < 0) {
        setScore((s) => ({ ...s, ai: s.ai + 1 }))
        ballX = canvas.width / 2
        ballY = canvas.height / 2
        ballSpeedX = 5
        ballSpeedY = 3
      }
      if (ballX > canvas.width) {
        setScore((s) => ({ ...s, player: s.player + 1 }))
        ballX = canvas.width / 2
        ballY = canvas.height / 2
        ballSpeedX = -5
        ballSpeedY = 3
      }

      // AI movement (slightly delayed for fairness)
      const aiCenter = aiY + paddleHeight / 2
      if (aiCenter < ballY - 10) aiY += 4
      else if (aiCenter > ballY + 10) aiY -= 4

      // Clamp
      aiY = Math.max(0, Math.min(canvas.height - paddleHeight, aiY))

      draw()
      animationId = requestAnimationFrame(update)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const y = e.clientY - rect.top
      playerY = y - paddleHeight / 2
      playerY = Math.max(0, Math.min(canvas.height - paddleHeight, playerY))
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    update()

    return () => {
      cancelAnimationFrame(animationId)
      canvas.removeEventListener('mousemove', handleMouseMove)
    }
  }, [running, score])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/games">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Games
          </Link>
        </Button>
        <Button size="sm" onClick={() => setRunning(!running)}>
          {running ? 'Pause' : 'Start'}
        </Button>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-4">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="w-full rounded-xl cursor-none"
        />
        <p className="text-xs text-muted-foreground text-center mt-3">
          Move your mouse to control the left paddle 🏓
        </p>
      </div>
    </div>
  )
}