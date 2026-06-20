import { useEffect, useRef } from 'react'

// Simplified continent outlines as lat/lon pairs
const CONTINENTS = [
  // North America
  [[49,-125],[49,-66],[25,-80],[20,-87],[15,-85],[8,-77],[8,-77],[20,-105],[32,-117],[49,-125]],
  // South America
  [[10,-75],[8,-60],[5,-52],[0,-50],[-5,-35],[-23,-43],[-34,-58],[-55,-65],[-55,-70],[-18,-70],[-5,-80],[0,-78],[10,-75]],
  // Europe
  [[71,28],[60,5],[45,-10],[36,-9],[36,28],[42,42],[71,42],[71,28]],
  // Africa
  [[37,10],[37,37],[15,42],[0,42],[-35,20],[-35,-17],[0,-17],[15,-17],[20,10],[37,10]],
  // Asia
  [[71,30],[71,180],[60,140],[35,140],[22,114],[10,100],[10,80],[25,57],[12,45],[12,45],[37,42],[71,30]],
  // Australia
  [[-17,122],[-17,145],[-39,145],[-39,114],[-17,114],[-17,122]],
]

function latLonToXYZ(lat, lon, r) {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (lon + 180) * Math.PI / 180
  return [
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ]
}

const HUBS = [
  [40.7, -74],   // New York
  [51.5, -0.1],  // London
  [35.7, 139.7], // Tokyo
  [22.3, 114.2], // Hong Kong
  [1.3, 103.8],  // Singapore
  [19.4, -99.1], // Mexico City
  [48.8, 2.3],   // Paris
  [-23.5, -46.6],// São Paulo
  [55.7, 37.6],  // Moscow
  [25.2, 55.3],  // Dubai
]

export default function GlobeHero() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId, t = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => canvas.offsetWidth
    const H = () => canvas.offsetHeight
    const R = () => Math.min(W(), H()) * 0.38

    const project = (xyz, rot) => {
      const [x, y, z] = xyz
      const rx = x * Math.cos(rot) - z * Math.sin(rot)
      const rz = x * Math.sin(rot) + z * Math.cos(rot)
      return { sx: W() / 2 + rx, sy: H() / 2 - y, z: rz }
    }

    // Pre-generate dots on sphere surface
    const dots = []
    for (let i = 0; i < 400; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / 400)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      dots.push([
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      ])
    }

    // Wave particles
    const waves = Array.from({ length: 80 }, (_, i) => ({
      x: (i / 80) * 2,
      y: 0.3 + Math.random() * 0.4,
      speed: 0.003 + Math.random() * 0.004,
      amp: 0.04 + Math.random() * 0.06,
      freq: 2 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? [56, 189, 248] : [100, 150, 255],
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      t += 0.005
      const rot = t * 0.3
      const r = R()
      const cx = W() / 2
      const cy = H() / 2

      // Dark background gradient
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W(), H()))
      bg.addColorStop(0, '#0a1628')
      bg.addColorStop(1, '#060d1a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W(), H())

      // Globe outer atmosphere glow (big soft ring)
      const atmos = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.5)
      atmos.addColorStop(0, 'rgba(56,189,248,0.18)')
      atmos.addColorStop(0.4, 'rgba(56,130,255,0.08)')
      atmos.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2)
      ctx.fillStyle = atmos
      ctx.fill()

      // Globe inner fill — ocean base color
      const ocean = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r)
      ocean.addColorStop(0, 'rgba(30,80,140,0.55)')
      ocean.addColorStop(0.6, 'rgba(10,30,70,0.45)')
      ocean.addColorStop(1, 'rgba(5,15,40,0.3)')
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = ocean
      ctx.fill()

      // Globe edge rim
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(56,189,248,0.35)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Orbital rings
      for (let i = 0; i < 3; i++) {
        const tilt = (i * Math.PI) / 5 + rot * 0.2 * (i % 2 === 0 ? 1 : -1)
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(tilt)
        ctx.scale(1, 0.28 + i * 0.08)
        ctx.beginPath()
        ctx.arc(0, 0, r * (1.12 + i * 0.13), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(56,189,248,${0.12 - i * 0.03})`
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.restore()
      }

      // Dot grid on sphere (latitude/longitude grid feel)
      const visible = []
      dots.forEach(([dx, dy, dz]) => {
        const rx = dx * Math.cos(rot) - dz * Math.sin(rot)
        const rz = dx * Math.sin(rot) + dz * Math.cos(rot)
        if (rz < 0) return
        const sx = cx + rx * r
        const sy = cy - dy * r
        const alpha = rz * 0.7 + 0.15
        const size = rz * 1.5 + 0.6
        ctx.beginPath()
        ctx.arc(sx, sy, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(160,220,255,${alpha.toFixed(2)})`
        ctx.fill()
        visible.push({ sx, sy, rz })
      })

      // Lat/lon grid lines on sphere
      const gridAlpha = 0.12
      // Latitude lines
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath()
        let started = false
        for (let lon = -180; lon <= 180; lon += 3) {
          const xyz = latLonToXYZ(lat, lon, r)
          const p = project(xyz, rot)
          if (p.z < 0) { started = false; continue }
          const sx = cx + p.sx - W()/2, sy = cy + p.sy - H()/2
          started ? ctx.lineTo(sx, sy) : (ctx.moveTo(sx, sy), started = true)
        }
        ctx.strokeStyle = `rgba(100,180,255,${gridAlpha})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
      // Longitude lines
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath()
        let started = false
        for (let lat = -90; lat <= 90; lat += 3) {
          const xyz = latLonToXYZ(lat, lon, r)
          const p = project(xyz, rot)
          if (p.z < 0) { started = false; continue }
          const sx = cx + p.sx - W()/2, sy = cy + p.sy - H()/2
          started ? ctx.lineTo(sx, sy) : (ctx.moveTo(sx, sy), started = true)
        }
        ctx.strokeStyle = `rgba(100,180,255,${gridAlpha})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Continent lines — brighter, thicker
      CONTINENTS.forEach(pts => {
        let first = true
        ctx.beginPath()
        pts.forEach(([lat, lon]) => {
          const xyz = latLonToXYZ(lat, lon, r)
          const p = project(xyz, rot)
          if (p.z < 0) { first = true; return }
          if (first) { ctx.moveTo(cx + p.sx - W()/2, cy + p.sy - H()/2); first = false }
          else ctx.lineTo(cx + p.sx - W()/2, cy + p.sy - H()/2)
        })
        ctx.strokeStyle = 'rgba(140,220,255,0.65)'
        ctx.lineWidth = 1.2
        ctx.stroke()
      })

      // Hub nodes + connections
      const hubPts = HUBS.map(([lat, lon]) => {
        const xyz = latLonToXYZ(lat, lon, r)
        return project(xyz, rot)
      })

      // Draw connections between hubs
      for (let i = 0; i < hubPts.length; i++) {
        for (let j = i + 1; j < hubPts.length; j++) {
          const pa = hubPts[i], pb = hubPts[j]
          if (pa.z < 0 || pb.z < 0) continue
          if (Math.random() > 0.3) continue
          ctx.beginPath()
          ctx.moveTo(pa.sx, pa.sy)
          // Bezier arc
          const mx = (pa.sx + pb.sx) / 2
          const my = (pa.sy + pb.sy) / 2 - r * 0.15
          ctx.quadraticCurveTo(mx, my, pb.sx, pb.sy)
          ctx.strokeStyle = `rgba(255,180,50,0.15)`
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
      }

      // Hub glowing dots
      hubPts.forEach(p => {
        if (p.z < 0) return
        const pulse = 0.6 + 0.4 * Math.sin(t * 3 + p.sx)
        // Outer glow
        const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, 10)
        g.addColorStop(0, `rgba(255,200,50,${0.8 * pulse})`)
        g.addColorStop(1, 'rgba(255,200,50,0)')
        ctx.beginPath()
        ctx.arc(p.sx, p.sy, 10, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()
        // Core
        ctx.beginPath()
        ctx.arc(p.sx, p.sy, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,220,80,${pulse})`
        ctx.fill()
      })

      // Wave lines (background)
      waves.forEach(w => {
        w.x -= w.speed
        if (w.x < -0.1) w.x = 1.1
        const wx = w.x * W()
        const wy = w.y * H()
        const [cr, cg, cb] = w.color
        ctx.beginPath()
        for (let xi = -50; xi < W() + 50; xi += 4) {
          const yi = wy + Math.sin((xi / W()) * w.freq * Math.PI * 2 + w.phase + t * 2) * w.amp * H()
          xi === -50 ? ctx.moveTo(xi, yi) : ctx.lineTo(xi, yi)
        }
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.07)`
        ctx.lineWidth = 1
        ctx.stroke()
      })

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}
