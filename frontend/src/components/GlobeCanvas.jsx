import { useEffect, useRef } from 'react'

export default function GlobeCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Globe parameters
    const R = Math.min(canvas.width, canvas.height) * 0.38
    const cx = canvas.width * 0.62
    const cy = canvas.height * 0.5
    const DOTS = 180
    const LINES = 60

    // Generate points on sphere surface
    const pts = Array.from({ length: DOTS }, (_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / DOTS)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      return { phi, theta, speed: 0.0003 + Math.random() * 0.0002 }
    })

    // Generate connections
    const connections = Array.from({ length: LINES }, () => ({
      a: Math.floor(Math.random() * DOTS),
      b: Math.floor(Math.random() * DOTS),
    }))

    let t = 0

    const project = (phi, theta, rot) => {
      const x = Math.sin(phi) * Math.cos(theta + rot)
      const y = Math.cos(phi)
      const z = Math.sin(phi) * Math.sin(theta + rot)
      return {
        sx: cx + x * R,
        sy: cy - y * R,
        z,
        visible: z > -0.2,
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 0.004

      const projected = pts.map(p => project(p.phi, p.theta, t * 0.4))

      // Draw connections
      connections.forEach(({ a, b }) => {
        const pa = projected[a]
        const pb = projected[b]
        if (!pa.visible || !pb.visible) return
        const alpha = Math.min(pa.z, pb.z) * 0.4 + 0.05
        ctx.beginPath()
        ctx.moveTo(pa.sx, pa.sy)
        ctx.lineTo(pb.sx, pb.sy)
        ctx.strokeStyle = `rgba(56,189,248,${alpha.toFixed(2)})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      })

      // Draw dots
      projected.forEach(p => {
        if (!p.visible) return
        const alpha = p.z * 0.7 + 0.15
        const size = p.z * 1.8 + 0.8
        ctx.beginPath()
        ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(56,189,248,${alpha.toFixed(2)})`
        ctx.fill()
      })

      // Glow center
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1)
      grad.addColorStop(0, 'rgba(56,189,248,0.04)')
      grad.addColorStop(1, 'rgba(56,189,248,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.1, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.9 }}
    />
  )
}
