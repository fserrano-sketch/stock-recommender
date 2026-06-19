import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { searchTickers } from '../lib/tickers'

export default function TickerInput({ value, onChange, onSelect, placeholder, className = '', showIcon = true }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = (e) => {
    const val = e.target.value.toUpperCase()
    onChange(val)
    const results = searchTickers(val)
    setSuggestions(results)
    setOpen(results.length > 0)
    setHighlight(-1)
  }

  const handleSelect = (ticker) => {
    onChange(ticker)
    setOpen(false)
    setSuggestions([])
    onSelect?.(ticker)
  }

  const handleKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, -1)) }
    if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); handleSelect(suggestions[highlight].ticker) }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={ref} className="relative flex-1">
      {showIcon && <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />}
      <input
        className={`input w-full uppercase font-mono tracking-wider ${showIcon ? 'pl-10' : ''} ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
        maxLength={10}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-navy-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          {suggestions.map((s, i) => (
            <li
              key={s.ticker}
              onMouseDown={() => handleSelect(s.ticker)}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${i === highlight ? 'bg-brand/20' : 'hover:bg-navy-700'}`}
            >
              <span className="font-mono font-bold text-slate-100 w-16 shrink-0">{s.ticker}</span>
              <span className="text-slate-400 text-sm truncate">{s.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
