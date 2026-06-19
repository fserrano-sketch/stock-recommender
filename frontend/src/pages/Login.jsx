import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff } from 'lucide-react'
import api from '../lib/api'
import { setAuth } from '../lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', name: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const endpoint = mode === 'login' ? '/users/login' : '/users/register'
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : form
      const { data } = await api.post(endpoint, payload)
      setAuth(data.access_token, data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp size={32} className="text-brand" />
            <span className="text-3xl font-bold">StockRec <span className="text-brand">AI</span></span>
          </div>
          <p className="text-slate-400 text-sm">Recomendaciones de acciones con inteligencia artificial</p>
        </div>

        <div className="card">
          {/* Tabs */}
          <div className="flex bg-navy-700/50 p-1 rounded-xl gap-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'login' ? 'bg-navy-800 text-slate-100 shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'register' ? 'bg-navy-800 text-slate-100 shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Nombre</label>
                <input
                  className="input w-full"
                  placeholder="Tu nombre"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Correo electrónico</label>
              <input
                className="input w-full"
                type="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  className="input w-full pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                  {mode === 'login' ? 'Ingresando...' : 'Creando cuenta...'}
                </span>
              ) : (
                mode === 'login' ? 'Ingresar' : 'Crear cuenta'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-4">
            También puedes usar la app sin registrarte para analizar acciones.{' '}
            <button onClick={() => navigate('/')} className="text-brand hover:underline">Ir al inicio</button>
          </p>
        </div>
      </div>
    </div>
  )
}
