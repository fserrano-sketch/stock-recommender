import { useEffect, useRef } from 'react'

// Continent polygons [lat, lon] — enough detail to be recognizable
const SHAPES = {
  northAmerica: [
    [70,-140],[72,-120],[70,-95],[83,-75],[72,-65],[60,-64],[45,-53],[42,-66],
    [35,-75],[30,-80],[25,-80],[20,-87],[15,-85],[8,-77],[8,-77],[10,-85],
    [15,-92],[22,-105],[30,-110],[32,-117],[38,-122],[48,-124],[54,-130],[60,-140],[70,-140]
  ],
  southAmerica: [
    [12,-72],[10,-62],[8,-60],[5,-52],[0,-50],[0,-48],[-5,-35],[-15,-39],
    [-23,-43],[-33,-52],[-38,-57],[-55,-65],[-55,-68],[-45,-75],[-18,-70],
    [-5,-80],[0,-78],[5,-77],[10,-75],[12,-72]
  ],
  europe: [
    [71,28],[70,20],[65,14],[58,5],[45,-2],[36,-9],[36,0],[38,15],
    [42,28],[41,30],[45,40],[55,38],[60,30],[65,25],[71,28]
  ],
  africa: [
    [37,10],[30,32],[15,42],[10,45],[0,42],[-10,40],[-26,35],[-35,20],
    [-35,17],[-30,-17],[0,-17],[15,-17],[20,10],[30,32],[37,10]
  ],
  asia: [
    [70,30],[75,60],[72,100],[70,140],[60,140],[55,135],[45,140],[35,140],
    [22,114],[10,100],[5,100],[10,80],[22,70],[25,57],[12,45],[25,50],
    [35,45],[42,55],[55,50],[65,60],[70,30]
  ],
  australia: [
    [-17,122],[-14,130],[-12,136],[-14,141],[-28,154],[-38,145],
    [-39,140],[-35,117],[-22,114],[-17,122]
  ],
  greenland: [
    [76,-73],[83,-35],[83,-20],[76,-18],[70,-22],[65,-38],[60,-48],[65,-55],[76,-73]
  ],
  japan: [
    [40,140],[36,136],[33,131],[33,130],[35,135],[38,141],[40,140]
  ],
  uk: [
    [58,-5],[55,-6],[51,-5],[50,2],[52,2],[55,0],[58,-5]
  ],
}

function pointInPolygon(lat, lon, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j]
    if ((xi > lon) !== (xj > lon) && lat < (yj - yi) * (lon - xi) / (xj - xi) + yi)
      inside = !inside
  }
  return inside
}

// Build continent dot cloud using polygon fill
const buildDots = () => {
  const dots = []
  const step = 1.6
  const shapes = Object.values(SHAPES)
  for (let lat = -60; lat <= 83; lat += step) {
    for (let lon = -180; lon <= 180; lon += step) {
      const inAny = shapes.some(s => pointInPolygon(lat, lon, s))
      if (inAny) {
        dots.push([lat + (Math.random()-0.5)*0.8, lon + (Math.random()-0.5)*0.8])
      }
    }
  }
  return dots
}

const CONTINENT_DOTS = buildDots()

const HUBS = [
  { lat: 40.7, lon: -74,   color: [255,200,60] },  // New York
  { lat: 51.5, lon: -0.1,  color: [255,200,60] },  // London
  { lat: 35.7, lon: 139.7, color: [255,200,60] },  // Tokyo
  { lat: 22.3, lon: 114.2, color: [100,240,255] }, // Hong Kong
  { lat: 1.3,  lon: 103.8, color: [100,240,255] }, // Singapore
  { lat: 48.8, lon: 2.3,   color: [255,200,60] },  // Paris
  { lat: -23.5,lon: -46.6, color: [255,120,200] }, // São Paulo
  { lat: 25.2, lon: 55.3,  color: [100,240,255] }, // Dubai
  { lat: 19.4, lon: -99.1, color: [255,200,60] },  // Mexico City
  { lat: 55.7, lon: 37.6,  color: [100,240,255] }, // Moscow
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
    const R = () => Math.min(W(), H()) * 0.37

    // Pre-bake unit-sphere xyz for continent dots
    const contXYZ = CONTINENT_DOTS.map(([lat, lon]) => latLonToXYZ(lat, lon, 1))

    // Flowing streams
    const STREAMS = Array.from({ length: 14 }, (_, i) => ({
      phase: (i / 14) * Math.PI * 2,
      yBase: 0.2 + (i % 5) * 0.14,
      amp:   0.05 + (i % 3) * 0.03,
      freq:  1.5 + (i % 4) * 0.5,
      speed: 0.5 + (i % 3) * 0.35,
      width: 1.0 + (i % 3) * 0.8,
      color: i % 3 === 0 ? [60,130,255] : i % 3 === 1 ? [100,50,255] : [40,200,255],
      alpha: 0.12 + (i % 4) * 0.04,
    }))

    // Triangulated mesh
    const MESH_PTS = []
    const cols = 20, rows = 9
    for (let r = 0; r <= rows; r++)
      for (let c = 0; c <= cols; c++)
        MESH_PTS.push({ xf: c/cols, yf: r/rows })
    const MESH_TRIS = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const a=r*(cols+1)+c, b=a+1, d=a+(cols+1), e=d+1
        MESH_TRIS.push([a,b,d],[b,e,d])
      }

    const drawMesh = (side) => {
      const w=W(), h=H()
      const mw=w*0.42, mh=h*0.58
      const ox = side==='left' ? -mw*0.25 : w-mw*0.75
      const oy = h*0.48
      const pts = MESH_PTS.map(({xf,yf}) => ({
        x: ox+xf*mw,
        y: oy+yf*mh + Math.sin(xf*4+t*1.2+(side==='left'?0:Math.PI))*0.03*mh + yf*yf*mh*0.25
      }))
      MESH_TRIS.forEach(([a,b,d]) => {
        const pa=pts[a],pb=pts[b],pd=pts[d]
        const avgY=(pa.y+pb.y+pd.y)/3
        const al=Math.max(0,Math.min(0.15,(avgY-oy)/mh*0.35))
        ctx.beginPath(); ctx.moveTo(pa.x,pa.y); ctx.lineTo(pb.x,pb.y); ctx.lineTo(pd.x,pd.y); ctx.closePath()
        ctx.strokeStyle=`rgba(70,150,255,${al})`; ctx.lineWidth=0.5; ctx.stroke()
      })
      MESH_PTS.forEach(({xf,yf},i) => {
        if(i%4!==0) return
        const p=pts[i]
        const al=Math.max(0,Math.min(0.45,(p.y-oy)/mh*0.5))
        ctx.beginPath(); ctx.arc(p.x,p.y,1.5,0,Math.PI*2)
        ctx.fillStyle=`rgba(100,200,255,${al})`; ctx.fill()
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      t += 0.007
      const rot = t * 0.22
      const r = R()
      const cx = W()*0.58, cy = H()*0.5

      // BG
      ctx.fillStyle='#050d1e'; ctx.fillRect(0,0,W(),H())

      // Mesh
      drawMesh('left'); drawMesh('right')

      // Streams
      STREAMS.forEach(s => {
        ctx.beginPath()
        for (let xi=0; xi<=W(); xi+=3) {
          const xf=xi/W()
          const yi=s.yBase*H()+Math.sin(xf*s.freq*Math.PI*2+s.phase+t*s.speed)*s.amp*H()
          xi===0?ctx.moveTo(xi,yi):ctx.lineTo(xi,yi)
        }
        const [cr,cg,cb]=s.color
        ctx.strokeStyle=`rgba(${cr},${cg},${cb},${s.alpha})`
        ctx.lineWidth=s.width; ctx.stroke()
      })

      // Atmosphere
      const atmos=ctx.createRadialGradient(cx,cy,r*0.75,cx,cy,r*1.6)
      atmos.addColorStop(0,'rgba(56,180,255,0.25)')
      atmos.addColorStop(0.4,'rgba(56,120,255,0.10)')
      atmos.addColorStop(1,'rgba(0,0,0,0)')
      ctx.beginPath(); ctx.arc(cx,cy,r*1.6,0,Math.PI*2)
      ctx.fillStyle=atmos; ctx.fill()

      // Globe clip
      ctx.save()
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip()

      // Subtle inner dark fill
      ctx.fillStyle='rgba(2,8,25,0.45)'; ctx.fillRect(cx-r,cy-r,r*2,r*2)

      // Lat/lon grid (subtle)
      const gc='rgba(60,140,255,0.08)'
      for (let la=-60;la<=60;la+=30) {
        ctx.beginPath(); let s2=false
        for (let lo=-180;lo<=180;lo+=2) {
          const [x,y,z]=rotateY(latLonToXYZ(la,lo,r),rot)
          if(z<0){s2=false;continue}
          s2?ctx.lineTo(cx+x,cy-y):(ctx.moveTo(cx+x,cy-y),s2=true)
        }
        ctx.strokeStyle=gc; ctx.lineWidth=0.4; ctx.stroke()
      }
      for (let lo=-180;lo<180;lo+=30) {
        ctx.beginPath(); let s2=false
        for (let la2=-85;la2<=85;la2+=2) {
          const [x,y,z]=rotateY(latLonToXYZ(la2,lo,r),rot)
          if(z<0){s2=false;continue}
          s2?ctx.lineTo(cx+x,cy-y):(ctx.moveTo(cx+x,cy-y),s2=true)
        }
        ctx.strokeStyle=gc; ctx.lineWidth=0.4; ctx.stroke()
      }

      // ── CONTINENT DOTS — fine and dense ──
      contXYZ.forEach(([dx,dy,dz]) => {
        const [rx,ry,rz]=rotateY([dx*r,dy*r,dz*r],rot)
        if(rz<0) return
        const depth=rz/r           // 0..1, 1=front
        const alpha=depth*0.7+0.25
        const size=depth*0.9+0.45
        ctx.beginPath(); ctx.arc(cx+rx,cy-ry,size,0,Math.PI*2)
        ctx.fillStyle=`rgba(210,238,255,${alpha.toFixed(2)})`
        ctx.fill()
        // Bright core on front-facing dots
        if(depth>0.65) {
          ctx.beginPath(); ctx.arc(cx+rx,cy-ry,size*0.35,0,Math.PI*2)
          ctx.fillStyle=`rgba(255,255,255,${(depth*0.8).toFixed(2)})`
          ctx.fill()
        }
      })

      ctx.restore()

      // Globe rim
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2)
      ctx.strokeStyle='rgba(80,200,255,0.55)'; ctx.lineWidth=1.8; ctx.stroke()

      // Orbital rings
      ;[
        {tilt:Math.PI/6+rot*0.14,  rx:r*1.18,ry:r*0.30,a:0.28},
        {tilt:-Math.PI/8-rot*0.11, rx:r*1.30,ry:r*0.26,a:0.16},
        {tilt:Math.PI/3+rot*0.07,  rx:r*1.42,ry:r*0.20,a:0.10},
      ].forEach(({tilt,rx:orx,ry:ory,a}) => {
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(tilt)
        ctx.beginPath(); ctx.ellipse(0,0,orx,ory,0,0,Math.PI*2)
        ctx.strokeStyle=`rgba(80,190,255,${a})`; ctx.lineWidth=1; ctx.stroke()
        ctx.restore()
      })

      // Hub connections + glows
      const hubPts=HUBS.map(h=>{
        const [x,y,z]=rotateY(latLonToXYZ(h.lat,h.lon,r),rot)
        return {x:cx+x,y:cy-y,z,color:h.color}
      }).filter(p=>p.z>=0)

      for (let i=0;i<hubPts.length;i++) for (let j=i+1;j<hubPts.length;j++) {
        if(Math.random()>0.22) continue
        const pa=hubPts[i],pb=hubPts[j]
        const mx=(pa.x+pb.x)/2,my=(pa.y+pb.y)/2-r*0.18
        ctx.beginPath(); ctx.moveTo(pa.x,pa.y); ctx.quadraticCurveTo(mx,my,pb.x,pb.y)
        ctx.strokeStyle='rgba(255,190,60,0.20)'; ctx.lineWidth=0.8; ctx.stroke()
      }

      hubPts.forEach(p=>{
        const pulse=0.5+0.5*Math.sin(t*3+p.x*0.04)
        const [cr,cg,cb]=p.color
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,16)
        g.addColorStop(0,`rgba(${cr},${cg},${cb},${(0.9*pulse).toFixed(2)})`)
        g.addColorStop(0.5,`rgba(${cr},${cg},${cb},${(0.3*pulse).toFixed(2)})`)
        g.addColorStop(1,'rgba(0,0,0,0)')
        ctx.beginPath(); ctx.arc(p.x,p.y,16,0,Math.PI*2)
        ctx.fillStyle=g; ctx.fill()
        ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2)
        ctx.fillStyle=`rgba(255,255,255,${pulse.toFixed(2)})`; ctx.fill()
      })

      animId=requestAnimationFrame(draw)
    }

    draw()
    return ()=>{cancelAnimationFrame(animId);window.removeEventListener('resize',resize)}
  },[])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"/>
}
