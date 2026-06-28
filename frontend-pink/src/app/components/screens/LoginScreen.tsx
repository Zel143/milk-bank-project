import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Droplets, Eye, EyeOff } from 'lucide-react'
import type { CreateAccessAccountInput } from '../../types'
import { supabase } from '../../../lib/supabase'

interface LoginScreenProps {
  onLogin: (credentials: { email: string; password: string }) => Promise<void>
  onRegisterRequest: (account: CreateAccessAccountInput) => Promise<boolean>
  notice?: string
  error?: string
  prefillEmail?: string
}

export function LoginScreen({ onLogin, onRegisterRequest, notice, error, prefillEmail }: LoginScreenProps) {
  const shouldReduceMotion = useReducedMotion()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | undefined>(undefined)
  const submitTimerRef = useRef<number | null>(null)
  const [stats, setStats] = useState({ donors: 0, mlReady: 0, waiting: 0 })
  const [batchCounts, setBatchCounts] = useState({ raw: 0, pre_testing: 0, pasteurized: 0, post_testing: 0, ready: 0 })

  useEffect(() => {
    if (prefillEmail) setEmail(prefillEmail)
  }, [prefillEmail])

  useEffect(() => {
    async function loadStats() {
      const [donors, batches, inquiries, batchStatusResult] = await Promise.all([
        supabase.from('donors').select('id', { count: 'exact' }),
        supabase.from('batches').select('total_volume_ml').eq('status', 'ready'),
        supabase.from('inquiries').select('id', { count: 'exact' }).eq('status', 'waiting'),
        supabase.from('batches').select('status').in('status', ['raw', 'pre_testing', 'pasteurized', 'post_testing', 'ready']),
      ])

      const mlReady = (batches.data ?? []).reduce((sum, b) => sum + Number(b.total_volume_ml || 0), 0)
      setStats({ donors: donors.count ?? 0, mlReady, waiting: inquiries.count ?? 0 })

      const counts = { raw: 0, pre_testing: 0, pasteurized: 0, post_testing: 0, ready: 0 }
      for (const b of batchStatusResult.data ?? []) {
        const k = b.status as keyof typeof counts
        if (k in counts) counts[k]++
      }
      setBatchCounts(counts)
    }
    void loadStats()
  }, [])

  useEffect(() => {
    return () => {
      if (submitTimerRef.current !== null) window.clearTimeout(submitTimerRef.current)
    }
  }, [])

  function switchMode(next: 'login' | 'register') {
    setMode(next)
    setPassword('')
    setLocalError(undefined)
  }

  async function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setLocalError(undefined)
    setLoading(true)
    await onLogin({ email, password })
    setLoading(false)
  }

  async function handleRegisterSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setLocalError(undefined)

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const success = await onRegisterRequest({ fullName, email, password })
    setLoading(false)

    if (success) {
      // Keep email pre-filled so they can sign in after confirming
      setFullName('')
      setPassword('')
      setMode('login')
    }
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

          <div className="mb-12">
            <h1 className="text-[34px] text-white leading-[1.1] font-bold tracking-tight mb-4">
              Makati's chain<br />
              <span style={{ color: '#eea4bb' }}>of care.</span>
            </h1>
            <p className="text-[14px] leading-relaxed text-[#7a7573] max-w-[300px]">
              Since 2013, every milliliter of donated milk is logged, tested, and traced to the NICU baby who needs it.
            </p>
          </div>

          <div>
            <div className="text-[10px] font-mono tracking-[0.15em] uppercase mb-5" style={{ color: '#4a4645' }}>
              Live Batch Pipeline
            </div>
            <div className="relative flex items-start">
              <div className="absolute top-3.5 left-[10%] right-[10%] h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
              {([
                { key: 'raw' as const, label: 'Collected' },
                { key: 'pre_testing' as const, label: 'Lab I' },
                { key: 'pasteurized' as const, label: 'Pasteurized' },
                { key: 'post_testing' as const, label: 'Lab II' },
                { key: 'ready' as const, label: 'Ready' },
              ] as const).map((stage) => {
                const count = batchCounts[stage.key]
                const active = count > 0
                return (
                  <div key={stage.key} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold z-10 relative transition-all duration-300"
                      style={{
                        background: active ? 'rgba(238,164,187,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${active ? 'rgba(238,164,187,0.35)' : 'rgba(255,255,255,0.06)'}`,
                        color: active ? '#eea4bb' : '#4a4645',
                      }}
                    >
                      {count}
                    </div>
                    <div
                      className="text-[9px] uppercase tracking-wide mt-2 text-center leading-tight px-0.5"
                      style={{ color: active ? '#7a7573' : '#4a4645' }}
                    >
                      {stage.label}
                    </div>
                  </div>
                )
              })}
            </div>
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
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          className="w-full max-w-[560px]"
        >
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

          <div
            role="group"
            aria-label="Authentication mode"
            className="mb-6 inline-flex rounded-2xl border p-1"
            style={{ background: '#FFFFFF', borderColor: 'rgba(99,98,96,0.12)' }}
          >
            <button
              type="button"
              aria-pressed={mode === 'login'}
              onClick={() => switchMode('login')}
              className="px-4 py-2 text-sm rounded-xl transition-colors"
              style={{ background: mode === 'login' ? '#eea4bb' : 'transparent', color: '#322e2d', fontWeight: 700 }}
            >
              Sign In
            </button>
            <button
              type="button"
              aria-pressed={mode === 'register'}
              onClick={() => switchMode('register')}
              className="px-4 py-2 text-sm rounded-xl transition-colors"
              style={{ background: mode === 'register' ? '#eea4bb' : 'transparent', color: '#322e2d', fontWeight: 700 }}
            >
              Register
            </button>
          </div>

          <div aria-live="polite" aria-atomic="true">
            <AnimatePresence>
              {(localError || error || notice) && (
                <motion.div
                  key={localError ?? error ?? notice}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? {} : { opacity: 0, y: -6 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="mb-4 rounded-xl border px-4 py-3 text-sm leading-relaxed"
                  style={{
                    background: (localError || error) ? '#FFF0F2' : '#F0F7F4',
                    borderColor: (localError || error)
                      ? 'rgba(192,64,64,0.22)'
                      : 'rgba(52,168,83,0.22)',
                    color: '#322e2d',
                  }}
                >
                  {localError ?? error ?? notice}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. Maria Santos…"
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
                autoComplete="email"
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
                  placeholder={mode === 'login' ? 'Enter your password…' : 'Min. 6 characters…'}
                  minLength={mode === 'register' ? 6 : undefined}
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
                    animate={shouldReduceMotion ? {} : { rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 rounded-full border-2 border-[#322e2d] border-t-transparent"
                    aria-hidden="true"
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