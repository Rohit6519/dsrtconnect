'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function BlockCubePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const blockHeight = 30
    const startWidth = 200
    let stack: { x: number; width: number }[] = [
      { x: canvas.width / 2 - startWidth / 2, width: startWidth },
    ]
    let currentBlock = {
      x: 0,
      y: canvas.height - blockHeight * 2,
      width: startWidth,
      direction: 1,
      speed: 3,
    }
    let localGameOver = false
    let animationId: number
    let localScore = 0

    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

    const draw = () => {
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw stack
      stack.forEach((block, i) => {
        ctx.fillStyle = colors[i % colors.length]
        const y = canvas.height - blockHeight * (i + 1)
        ctx.fillRect(block.x, y, block.width, blockHeight)
      })

      // Draw current moving block
      if (!localGameOver) {
        ctx.fillStyle = colors[stack.length % colors.length]
        ctx.fillRect(
          currentBlock.x,
          currentBlock.y,
          currentBlock.width,
          blockHeight
        )
      }

      if (localGameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 32px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20)
        ctx.font = '20px monospace'
        ctx.fillText(
          `Score: ${localScore}`,
          canvas.width / 2,
          canvas.height / 2 + 20
        )
        ctx.textAlign = 'left'
      }
    }

    const update = () => {
      if (!localGameOver) {
        currentBlock.x += currentBlock.direction * currentBlock.speed
        if (currentBlock.x + currentBlock.width >= canvas.width) {
          currentBlock.direction = -1
        }
        if (currentBlock.x <= 0) {
          currentBlock.direction = 1
        }
      }
      draw()
      animationId = requestAnimationFrame(update)
    }

    const handleClick = () => {
      if (localGameOver) return

      const lastBlock = stack[stack.length - 1]
      const overlap = Math.min(
        currentBlock.x + currentBlock.width,
        lastBlock.x + lastBlock.width
      ) - Math.max(currentBlock.x, lastBlock.x)

      if (overlap <= 0) {
        localGameOver = true
        setGameOver(true)
        return
      }

      const newX = Math.max(currentBlock.x, lastBlock.x)
      stack.push({ x: newX, width: overlap })
      localScore++
      setScore(localScore)

      currentBlock = {
        x: 0,
        y: canvas.height - blockHeight * (stack.length + 1),
        width: overlap,
        direction: 1,
        speed: 3 + localScore * 0.2,
      }

      if (currentBlock.y < blockHeight) {
        localGameOver = true
        setGameOver(true)
      }
    }

    canvas.addEventListener('click', handleClick)
    update()

    return () => {
      cancelAnimationFrame(animationId)
      canvas.removeEventListener('click', handleClick)
    }
  }, [resetKey])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/games">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Games
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono">Score: {score}</span>
          {gameOver && (
            <Button
              size="sm"
              onClick={() => {
                setScore(0)
                setGameOver(false)
                setResetKey((k) => k + 1)
              }}
            >
              Restart
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-4">
        <canvas
          ref={canvasRef}
          width={500}
          height={600}
          className="w-full max-w-md mx-auto block rounded-xl cursor-pointer"
        />
        <p className="text-xs text-muted-foreground text-center mt-3">
          Click to drop the block on the stack 🎲
        </p>
      </div>
    </div>
  )
}