import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Droplets, Eye, EyeOff, Heart, Shield, Zap } from 'lucide-react'
import type { AccessRole, CreateAccessAccountInput } from '../../types'
import { supabase } from '../../../lib/supabase'

interface LoginScreenProps {
  onLogin: (credentials: { email: string; password: string }) => void
  onRegisterRequest: (account: CreateAccessAccountInput) => Promise<boolean>
  notice?: string
  error?: string
  prefillEmail?: string
}

export function LoginScreen({ onLogin, onRegisterRequest, notice, error, prefillEmail }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const submitTimerRef = useRef<number | null>(null)
  const [stats, setStats] = useState({ donors: 0, mlReady: 0, waiting: 0 })

  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail)
    }
  }, [prefillEmail])

  useEffect(() => {
    async function loadStats() {
      const [donors, batches, inquiries] = await Promise.all([
        supabase.from('donors').select('id', { count: 'exact' }),
        supabase.from('batches').select('total_volume_ml').eq('status', 'ready'),
        supabase.from('inquiries').select('id', { count: 'exact' }).eq('status', 'waiting')
      ])
      
      const mlReady = (batches.data || []).reduce((sum, b) => sum + Number(b.total_volume_ml || 0), 0)
      setStats({
        donors: donors.count || 0,
        mlReady,
        waiting: inquiries.count || 0
      })
    }
    void loadStats()
  }, [])

  useEffect(() => {
    return () => {
      if (submitTimerRef.current !== null) {
        window.clearTimeout(submitTimerRef.current)
      }
    }
  }, [])

  function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    setLoading(true)

    if (submitTimerRef.current !== null) {
      window.clearTimeout(submitTimerRef.current)
    }

    submitTimerRef.current = window.setTimeout(() => {
      onLogin({ email, password })
      setLoading(false)
    }, 450)
  }

  function handleRegisterSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    setLoading(true)

    if (submitTimerRef.current !== null) {
      window.clearTimeout(submitTimerRef.current)
    }

    submitTimerRef.current = window.setTimeout(() => {
      onRegisterRequest({
        fullName,
        email,
        password,
      })
      setLoading(false)
      setMode('login')
    }, 450)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F8F7F5' }}>
      <div className="hidden lg:flex flex-col justify-between w-[460px] shrink-0" style={{ background: '#322e2d' }}>
        <div className="px-12 pt-12">
          <div className="flex items-center gap-3 mb-20">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#eea4bb' }}>
              <Droplets className="w-5 h-5" style={{ color: '#322e2d' }} />
            </div>
            <div>
              <div className="text-[15px] text-white leading-none tracking-tight font-bold">
                Mother's Reach
              </div>
              <div className="text-[11px] mt-1 text-[#7a7573] font-mono">
                by Makati Human Milk Bank
              </div>
            </div>
          </div>

          <div className="mb-14">
            <h1 className="text-4xl text-white mb-6 leading-[1.15] font-bold tracking-tight">
              Connecting Donors.<br />
              <span style={{ color: '#eea4bb' }}>Nourishing Lives.</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-[#9a9694] max-w-[340px]">
              A premium clinical operations platform for the Makati Human Milk Bank, serving the smallest and most vulnerable lives since 2013.
            </p>
          </div>

          <div className="space-y-6">
            {[
              { icon: Shield, label: 'Medical-grade data security' },
              { icon: Zap, label: 'Real-time batch lifecycle tracking' },
              { icon: Heart, label: 'NICU-priority dispensing workflows' },
            ].map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.label} className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <Icon className="w-4 h-4" style={{ color: '#eea4bb' }} />
                  </div>
                  <span className="text-[15px] text-[#bdbdbb]">{feature.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-12 pb-10">
          <div className="grid grid-cols-3 gap-6 mb-8 p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-center">
              <div className="text-xl text-white font-mono font-bold mb-1.5" style={{ color: '#eea4bb' }}>
                {stats.donors}
              </div>
              <div className="text-[11px] text-[#7a7573]">Active Donors</div>
            </div>
            <div className="text-center border-l border-r" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-xl text-white font-mono font-bold mb-1.5" style={{ color: '#eea4bb' }}>
                {stats.mlReady.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#7a7573]">mL Ready</div>
            </div>
            <div className="text-center">
              <div className="text-xl text-white font-mono font-bold mb-1.5" style={{ color: '#eea4bb' }}>
                {stats.waiting}
              </div>
              <div className="text-[11px] text-[#7a7573]">On Waiting List</div>
            </div>
          </div>
          <p className="text-[11px] text-center" style={{ color: '#5a5655' }}>
            RA 7600 compliant · Makati City Ordinance No. 2014-089 · DOH MOP 2014
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 24 }} className="w-full max-w-[560px]">
          <div className="flex lg:hidden items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#eea4bb' }}>
              <Droplets className="w-4 h-4" style={{ color: '#322e2d' }} />
            </div>
            <div className="text-base text-[#322e2d]" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
              Mother's Reach
            </div>
          </div>

          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl text-[#322e2d] mb-1.5" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-sm text-[#636260] leading-relaxed max-w-md">
                {mode === 'login'
                  ? 'Sign in with your approved staff account. Admin access opens account management.'
                  : 'Register a staff account. Confirm your email before signing in.'}
              </p>
            </div>
          </div>

          <div className="mb-6 inline-flex rounded-2xl border p-1" style={{ background: '#FFFFFF', borderColor: 'rgba(99,98,96,0.12)' }}>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="px-4 py-2 text-sm rounded-xl transition-colors"
              style={{ background: mode === 'login' ? '#eea4bb' : 'transparent', color: '#322e2d', fontWeight: 700 }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className="px-4 py-2 text-sm rounded-xl transition-colors"
              style={{ background: mode === 'register' ? '#eea4bb' : 'transparent', color: '#322e2d', fontWeight: 700 }}
            >
              Register
            </button>
          </div>

          <AnimatePresence>
            {(notice || error) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="mb-4 rounded-xl border px-4 py-3 text-sm"
                style={{
                  background: error ? '#FFF0F2' : '#F8F0F4',
                  borderColor: error ? 'rgba(192,64,64,0.22)' : 'rgba(238,164,187,0.28)',
                  color: '#322e2d',
                }}
                aria-live="polite"
              >
                {error ?? notice}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={mode === 'login' ? handleLoginSubmit : handleRegisterSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="register-name" className="block text-xs text-[#636260] mb-2" style={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--font-family-mono)' }}>
                  Full name
                </label>
                <input
                  id="register-name"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-xl border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/30"
                  style={{ background: '#FFFFFF', borderColor: focusedField === 'fullName' ? '#eea4bb' : 'rgba(99,98,96,0.15)', color: '#322e2d', boxShadow: focusedField === 'fullName' ? '0 0 0 3px rgba(238,164,187,0.15)' : 'none' }}
                />
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-xs text-[#636260] mb-2" style={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--font-family-mono)' }}>
                Email address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete={mode === 'login' ? 'email' : 'off'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                spellCheck={false}
                placeholder="name@mhmb.makati.gov.ph"
                maxLength={254}
                className="w-full px-4 py-3 rounded-xl border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/30"
                style={{ background: '#FFFFFF', borderColor: focusedField === 'email' ? '#eea4bb' : 'rgba(99,98,96,0.15)', color: '#322e2d', boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(238,164,187,0.15)' : 'none' }}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs text-[#636260] mb-2" style={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--font-family-mono)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
                  maxLength={128}
                  className="w-full px-4 py-3 pr-11 rounded-xl border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/30"
                  style={{ background: '#FFFFFF', borderColor: focusedField === 'password' ? '#eea4bb' : 'rgba(99,98,96,0.15)', color: '#322e2d', boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(238,164,187,0.15)' : 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#bdbdbb] hover:text-[#eea4bb] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/30"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="w-full py-3 rounded-xl text-sm mt-2 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/30"
              style={{
                background: loading ? '#d4a0b5' : '#eea4bb',
                color: '#322e2d',
                fontWeight: 700,
                boxShadow: loading ? 'none' : '0 4px 16px rgba(238,164,187,0.35)',
              }}
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 rounded-full border-2 border-[#322e2d] border-t-transparent"
                  />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : mode === 'login' ? 'Sign in' : 'Create account'}
            </motion.button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-[#636260]">
            <p className="leading-relaxed">
              New staff accounts are created with staff access after email confirmation.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}