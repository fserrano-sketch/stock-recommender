import { useEffect, useRef } from 'react'

// Dense continent dot clouds — [lat, lon] pairs
const CONTINENT_DOTS = []
const addRegion = (latRange, lonRange, density = 8) => {
  const [la, lb] = latRange, [loa, lob] = lonRange
  for (let lat = la; lat <= lb; lat += density) {
    for (let lon = loa; lon <= lob; lon += density) {
      CONTINENT_DOTS.push([lat + (Math.random()-0.5)*density*0.7, lon + (Math.random()-0.5)*density*0.7])
    }
  }
}
// North America
addRegion([25,70],[-140,-60], 4)
// South America
addRegion([-55,12],[-82,-34], 4)
// Europe
addRegion([36,71],[-10,40], 4)
// Africa
addRegion([-35,37],[-18,52], 4)
// Asia
addRegion([5,75],[25,145], 3.5)
// Australia
addRegion([-44,-12],[113,154], 5)
// Greenland
addRegion([60,83],[-55,-18], 6)

const HUBS = [
  { lat: 40.7, lon: -74,   color: [255,200,60],  label: 'New York' },
  { lat: 51.5, lon: -0.1,  color: [255,200,60],  label: 'London' },
  { lat: 35.7, lon: 139.7, color: [255,200,60],  label: 'Tokyo' },
  { lat: 22.3, lon: 114.2, color: [100,240,255], label: 'Hong Kong' },
  { lat: 1.3,  lon: 103.8, color: [100,240,255], label: 'Singapore' },
  { lat: 48.8, lon: 2.3,   color: [255,200,60],  label: 'Paris' },
  { lat: -23.5,lon: -46.6, color: [255,120,200], label: 'São Paulo' },
  { lat: 25.2, lon: 55.3,  color: [100,240,255], label: 'Dubai' },
  { lat: 19.4, lon: -99.1, color: [255,200,60],  label: 'Mexico City' },
  { lat: 55.7, lon: 37.6,  color: [100,240,255], label: 'Moscow' },
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

function rotateY([x, y, z], a) {
  return [x * Math.cos(a) - z * Math.sin(a), y, x * Math.sin(a) + z * Math.cos(a)]
}

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
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => canvas.offsetWidth
    const H = () => canvas.offsetHeight
    const R = () => Math.min(W(), H()) * 0.40

    // Pre-bake continent xyz (unit sphere, rotated at runtime)
    const contDots = CONTINENT_DOTS.map(([lat, lon]) => latLonToXYZ(lat, lon, 1))

    // Flowing streams
    const STREAMS = Array.from({ length: 12 }, (_, i) => ({
      phase:  (i / 12) * Math.PI * 2,
      yBase:  0.25 + (i % 4) * 0.15,
      amp:    0.06 + Math.random() * 0.08,
      freq:   1.5 + Math.random() * 2,
      speed:  0.6 + Math.random() * 0.8,
      width:  1.2 + Math.random() * 2,
      color:  i % 3 === 0
        ? [80, 140, 255]
        : i % 3 === 1
          ? [120, 60, 255]
          : [56, 200, 255],
      alpha: 0.15 + Math.random() * 0.2,
    }))

    // Triangulated mesh points (bottom-left and bottom-right corners)
    const MESH = (() => {
      const pts = []
      const cols = 22, rows = 10
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          pts.push({ xf: c / cols, yf: r / rows })
        }
      }
      const tris = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const a = r*(cols+1)+c, b = a+1, d = a+(cols+1), e = d+1
          tris.push([a, b, d], [b, e, d])
        }
      }
      return { pts, tris }
    })()

    const drawMesh = (side) => {
      const w = W(), h = H()
      const mw = w * 0.45, mh = h * 0.55
      const ox = side === 'left' ? -mw * 0.3 : w - mw * 0.7
      const oy = h * 0.5
      // Wave distortion
      const getPt = ({ xf, yf }) => {
        const wave = Math.sin(xf * 4 + t * 1.5 + (side === 'left' ? 0 : Math.PI)) * 0.04
        return {
          x: ox + xf * mw,
          y: oy + yf * mh + wave * mh + yf * yf * mh * 0.3
        }
      }
      const pts = MESH.pts.map(getPt)
      // Draw triangles (edges only)
      ctx.lineWidth = 0.5
      MESH.tris.forEach(([a, b, d]) => {
        const pa = pts[a], pb = pts[b], pd = pts[d]
        const avgY = (pa.y + pb.y + pd.y) / 3
        const alpha = Math.max(0, Math.min(0.18, (avgY - oy) / mh * 0.4))
        ctx.beginPath()
        ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.lineTo(pd.x, pd.y); ctx.closePath()
        ctx.strokeStyle = `rgba(80,160,255,${alpha})`
        ctx.stroke()
      })
      // Draw nodes at vertices
      pts.forEach(({ x, y }, i) => {
        if (i % 3 !== 0) return
        const alpha = Math.max(0, Math.min(0.5, (y - oy) / mh * 0.6))
        ctx.beginPath()
        ctx.arc(x, y, 1.2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(100,200,255,${alpha})`
        ctx.fill()
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      t += 0.008
      const rot = t * 0.25
      const r = R()
      const cx = W() / 2
      const cy = H() / 2

      // Background
      ctx.fillStyle = '#050d1e'
      ctx.fillRect(0, 0, W(), H())

      // Mesh grids (bottom corners)
      drawMesh('left')
      drawMesh('right')

      // Flowing streams behind globe
      STREAMS.forEach(s => {
        const phase = s.phase + t * s.speed
        ctx.beginPath()
        for (let xi = 0; xi <= W(); xi += 3) {
          const xf = xi / W()
          const yi = s.yBase * H() + Math.sin(xf * s.freq * Math.PI * 2 + phase) * s.amp * H()
          xi === 0 ? ctx.moveTo(xi, yi) : ctx.lineTo(xi, yi)
        }
        const [cr, cg, cb] = s.color
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${s.alpha})`
        ctx.lineWidth = s.width
        ctx.stroke()
      })

      // Globe atmosphere
      const atmos = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.55)
      atmos.addColorStop(0, 'rgba(56,180,255,0.22)')
      atmos.addColorStop(0.35,'rgba(56,130,255,0.10)')
      atmos.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.55, 0, Math.PI * 2)
      ctx.fillStyle = atmos; ctx.fill()

      // Globe clip region for inner elements
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip()

      // Very subtle inner glow on near side
      const inner = ctx.createRadialGradient(cx - r*0.25, cy - r*0.25, 0, cx, cy, r)
      inner.addColorStop(0, 'rgba(80,180,255,0.08)')
      inner.addColorStop(1, 'rgba(0,5,20,0.0)')
      ctx.fillStyle = inner; ctx.fillRect(cx-r, cy-r, r*2, r*2)

      // Lat/lon grid
      const gridColor = 'rgba(80,160,255,0.10)'
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath(); let s2 = false
        for (let lon2 = -180; lon2 <= 180; lon2 += 2) {
          const [x,y,z] = rotateY(latLonToXYZ(lat, lon2, r), rot)
          if (z < 0) { s2 = false; continue }
          s2 ? ctx.lineTo(cx+x, cy-y) : (ctx.moveTo(cx+x, cy-y), s2=true)
        }
        ctx.strokeStyle = gridColor; ctx.lineWidth = 0.4; ctx.stroke()
      }
      for (let lon2 = -180; lon2 < 180; lon2 += 30) {
        ctx.beginPath(); let s2 = false
        for (let lat2 = -80; lat2 <= 80; lat2 += 2) {
          const [x,y,z] = rotateY(latLonToXYZ(lat2, lon2, r), rot)
          if (z < 0) { s2 = false; continue }
          s2 ? ctx.lineTo(cx+x, cy-y) : (ctx.moveTo(cx+x, cy-y), s2=true)
        }
        ctx.strokeStyle = gridColor; ctx.lineWidth = 0.4; ctx.stroke()
      }

      // Continent dots
      contDots.forEach(([dx, dy, dz]) => {
        const [rx, ry, rz] = rotateY([dx*r, dy*r, dz*r], rot)
        if (rz < 0) return
        const alpha = rz/r * 0.75 + 0.2
        const size  = rz/r * 1.8 + 0.5
        ctx.beginPath(); ctx.arc(cx+rx, cy-ry, size, 0, Math.PI*2)
        ctx.fillStyle = `rgba(180,230,255,${alpha.toFixed(2)})`
        ctx.fill()
      })

      ctx.restore() // end globe clip

      // Globe rim
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2)
      ctx.strokeStyle = 'rgba(80,200,255,0.50)'; ctx.lineWidth = 1.5; ctx.stroke()

      // Orbital rings
      ;[
        { tilt: Math.PI/6 + rot*0.15, rx: r*1.18, ry: r*0.32, alpha: 0.25 },
        { tilt: -Math.PI/8 - rot*0.12, rx: r*1.28, ry: r*0.28, alpha: 0.15 },
        { tilt: Math.PI/3 + rot*0.08,  rx: r*1.38, ry: r*0.22, alpha: 0.10 },
      ].forEach(({ tilt, rx: orx, ry: ory, alpha }) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt)
        ctx.beginPath(); ctx.ellipse(0, 0, orx, ory, 0, 0, Math.PI*2)
        ctx.strokeStyle = `rgba(80,190,255,${alpha})`; ctx.lineWidth = 1; ctx.stroke()
        ctx.restore()
      })

      // Hub nodes + connections
      const hubPts = HUBS.map(h => {
        const [x, y, z] = rotateY(latLonToXYZ(h.lat, h.lon, r), rot)
        return { x: cx+x, y: cy-y, z, color: h.color }
      }).filter(p => p.z >= 0)

      // Connections
      for (let i = 0; i < hubPts.length; i++) {
        for (let j = i+1; j < hubPts.length; j++) {
          if (Math.random() > 0.25) continue
          const pa = hubPts[i], pb = hubPts[j]
          const mx = (pa.x+pb.x)/2, my = (pa.y+pb.y)/2 - r*0.18
          ctx.beginPath(); ctx.moveTo(pa.x, pa.y)
          ctx.quadraticCurveTo(mx, my, pb.x, pb.y)
          ctx.strokeStyle = 'rgba(255,190,60,0.18)'; ctx.lineWidth = 0.8; ctx.stroke()
        }
      }

      // Hub glow dots
      hubPts.forEach(p => {
        const pulse = 0.55 + 0.45 * Math.sin(t*3 + p.x*0.05)
        const [cr, cg, cb] = p.color
        // Outer halo
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14)
        g.addColorStop(0, `rgba(${cr},${cg},${cb},${(0.85*pulse).toFixed(2)})`)
        g.addColorStop(0.4, `rgba(${cr},${cg},${cb},${(0.25*pulse).toFixed(2)})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI*2)
        ctx.fillStyle = g; ctx.fill()
        // Core
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.8, 0, Math.PI*2)
        ctx.fillStyle = `rgba(255,255,255,${pulse.toFixed(2)})`; ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}
