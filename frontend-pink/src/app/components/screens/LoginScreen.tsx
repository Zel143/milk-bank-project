import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ChevronRight, Droplets, Eye, EyeOff, Heart, Shield, Sparkles, UserPlus, Zap } from 'lucide-react'
import type { AccessRole, CreateAccessAccountInput } from '../../types'

interface LoginScreenProps {
  onLogin: (credentials: { email: string; password: string }) => void
  onRegisterRequest: (account: CreateAccessAccountInput) => Promise<boolean>
  notice?: string
  error?: string
  prefillEmail?: string
}

const ROLE_OPTIONS: Array<{ label: AccessRole; description: string; department: string; initials: string }> = [
  { label: 'Doctor', description: 'Clinical oversight & approval authority', department: 'Clinical Oversight', initials: 'DR' },
  { label: 'Nurse', description: 'Collection, dispensing, recipient support', department: 'Ward Operations', initials: 'NU' },
  { label: 'Midwife', description: 'Field collection & donor coordination', department: 'Community Health', initials: 'MW' },
  { label: 'Medical Technologist', description: 'Lab testing & pasteurization logging', department: 'Laboratory Services', initials: 'MT' },
  { label: 'Admin', description: 'User administration & system control', department: 'System Administration', initials: 'AD' },
]

export function LoginScreen({ onLogin, onRegisterRequest, notice, error, prefillEmail }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const submitTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail)
    }
  }, [prefillEmail])

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
      <div className="hidden lg:flex flex-col justify-between w-[440px] shrink-0" style={{ background: '#322e2d' }}>
        <div className="px-10 pt-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#eea4bb' }}>
              <Droplets className="w-4.5 h-4.5" style={{ color: '#322e2d' }} />
            </div>
            <div>
              <div className="text-sm text-white leading-none" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                Mother's Reach
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: '#7a7573', fontFamily: 'var(--font-family-mono)' }}>
                by Makati Human Milk Bank
              </div>
            </div>
          </div>

          <div className="mb-12">
            <div className="text-3xl text-white mb-3 leading-tight" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
              Clinical access.
              <br />
              <span style={{ color: '#eea4bb' }}>One secure account layer.</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#7a7573' }}>
              Sign in to the Makati Human Milk Bank operations console or register a new staff account for a validated clinical role.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Shield, label: 'Supabase Auth backed sessions', color: '#eea4bb' },
              { icon: Zap, label: 'Staff role assigned at registration', color: '#bdbdbb' },
              { icon: Heart, label: 'Email confirmation required before sign-in', color: '#eea4bb' },
            ].map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: feature.color }} />
                  </div>
                  <span className="text-sm" style={{ color: '#9a9694' }}>{feature.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-10 pb-8">
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { value: '2', label: 'Access Roles' },
              { value: '1', label: 'Source of Truth' },
              { value: '0', label: 'Demo Accounts' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-lg text-white leading-none" style={{ fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: '#eea4bb' }}>
                  {stat.value}
                </div>
                <div className="text-[10px] mt-1" style={{ color: '#7a7573' }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: '#5a5655' }}>
            public.profiles stores role and activation state. Supabase Auth owns the password.
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