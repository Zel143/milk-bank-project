import { useEffect, useId, useState } from 'react'
import { KeyRound, Mail, User, ShieldCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { PageHeader } from '../shared/PageHeader'
import type { AppUser } from '../../types'
import { supabase } from '../../../lib/supabase'

const MIN_PW_LENGTH = 8

interface PasswordFormState {
  newPassword: string
  confirmPassword: string
  showNew: boolean
  showConfirm: boolean
  error: string | null
  success: boolean
  saving: boolean
}

export function AccountSettingsScreen({ user }: { user: AppUser }) {
  const [email, setEmail] = useState<string | null>(null)
  const [pw, setPw] = useState<PasswordFormState>({
    newPassword: '',
    confirmPassword: '',
    showNew: false,
    showConfirm: false,
    error: null,
    success: false,
    saving: false,
  })

  const newPwId = useId()
  const confirmPwId = useId()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  function set<K extends keyof PasswordFormState>(key: K, value: PasswordFormState[K]) {
    setPw(prev => ({ ...prev, [key]: value }))
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    set('error', null)

    if (pw.newPassword.length < MIN_PW_LENGTH) {
      set('error', `Password must be at least ${MIN_PW_LENGTH} characters.`)
      return
    }
    if (pw.newPassword !== pw.confirmPassword) {
      set('error', 'Passwords do not match. Please re-enter.')
      return
    }

    set('saving', true)
    const { error } = await supabase.auth.updateUser({ password: pw.newPassword })
    set('saving', false)

    if (error) {
      set('error', error.message)
      return
    }

    setPw(prev => ({
      ...prev,
      newPassword: '',
      confirmPassword: '',
      error: null,
      success: true,
    }))

    setTimeout(() => set('success', false), 4000)
  }

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Account' }]}
        title="Account Settings"
        subtitle="View your profile and manage your password."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl items-start">

        {/* Profile card */}
        <section
          className="rounded-3xl border bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
          style={{ borderColor: 'rgba(0,0,0,0.06)' }}
          aria-labelledby="profile-heading"
        >
          <h2
            id="profile-heading"
            className="mb-4 text-xs font-semibold uppercase tracking-widest"
            style={{ color: '#9a9694', fontFamily: 'var(--font-family-mono)' }}
          >
            Profile
          </h2>

          <div className="space-y-3">
            <ProfileRow
              icon={<User className="w-4 h-4" aria-hidden="true" />}
              label="Full Name"
              value={user.name}
            />
            <ProfileRow
              icon={<ShieldCheck className="w-4 h-4" aria-hidden="true" />}
              label="Role"
              value={user.role}
            />
            <ProfileRow
              icon={<Mail className="w-4 h-4" aria-hidden="true" />}
              label="Email"
              value={email ?? 'Loading…'}
            />
          </div>
        </section>

        {/* Change password card */}
        <section
          className="rounded-3xl border bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
          style={{ borderColor: 'rgba(0,0,0,0.06)' }}
          aria-labelledby="password-heading"
        >
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="w-4 h-4" style={{ color: '#9a9694' }} aria-hidden="true" />
            <h2
              id="password-heading"
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#9a9694', fontFamily: 'var(--font-family-mono)' }}
            >
              Change Password
            </h2>
          </div>

          <form onSubmit={handlePasswordChange} noValidate>
            <div className="space-y-4">

              {/* New password */}
              <div>
                <label
                  htmlFor={newPwId}
                  className="mb-1.5 block text-xs font-medium"
                  style={{ color: '#322e2d' }}
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id={newPwId}
                    type={pw.showNew ? 'text' : 'password'}
                    name="new_password"
                    autoComplete="new-password"
                    spellCheck={false}
                    required
                    minLength={MIN_PW_LENGTH}
                    value={pw.newPassword}
                    onChange={e => set('newPassword', e.target.value)}
                    placeholder={`At least ${MIN_PW_LENGTH} characters…`}
                    className="w-full rounded-xl border py-2.5 pl-3 pr-10 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/40"
                    style={{ borderColor: 'rgba(0,0,0,0.10)', color: '#1A1A1A' }}
                  />
                  <button
                    type="button"
                    aria-label={pw.showNew ? 'Hide new password' : 'Show new password'}
                    onClick={() => set('showNew', !pw.showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors hover:text-[#322e2d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/40"
                    style={{ color: '#9a9694' }}
                  >
                    {pw.showNew
                      ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                      : <Eye className="w-4 h-4" aria-hidden="true" />
                    }
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label
                  htmlFor={confirmPwId}
                  className="mb-1.5 block text-xs font-medium"
                  style={{ color: '#322e2d' }}
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id={confirmPwId}
                    type={pw.showConfirm ? 'text' : 'password'}
                    name="confirm_password"
                    autoComplete="new-password"
                    spellCheck={false}
                    required
                    value={pw.confirmPassword}
                    onChange={e => set('confirmPassword', e.target.value)}
                    placeholder="Re-enter your new password…"
                    className="w-full rounded-xl border py-2.5 pl-3 pr-10 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/40"
                    style={{ borderColor: 'rgba(0,0,0,0.10)', color: '#1A1A1A' }}
                  />
                  <button
                    type="button"
                    aria-label={pw.showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => set('showConfirm', !pw.showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors hover:text-[#322e2d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/40"
                    style={{ color: '#9a9694' }}
                  >
                    {pw.showConfirm
                      ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                      : <Eye className="w-4 h-4" aria-hidden="true" />
                    }
                  </button>
                </div>
              </div>

              {/* Inline error */}
              <div aria-live="polite" aria-atomic="true">
                <AnimatePresence>
                  {pw.error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      className="rounded-xl border px-3 py-2.5 text-sm"
                      style={{ borderColor: 'rgba(239,68,68,0.2)', background: '#FEF2F2', color: '#b91c1c' }}
                      role="alert"
                    >
                      {pw.error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Success feedback */}
              <div aria-live="polite" aria-atomic="true">
                <AnimatePresence>
                  {pw.success && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm"
                      style={{ borderColor: 'rgba(238,164,187,0.3)', background: '#FFF0F5', color: '#9d416d' }}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      Password updated. Changes take effect on next login.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="submit"
                disabled={pw.saving || !pw.newPassword || !pw.confirmPassword}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-[#322e2d] transition-opacity disabled:opacity-50"
                style={{ background: '#eea4bb' }}
              >
                {pw.saving ? 'Updating Password…' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>

      </div>
    </div>
  )
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: '#F8F7F5' }}
    >
      <span className="shrink-0" style={{ color: '#9a9694' }}>{icon}</span>
      <span className="w-24 shrink-0 text-xs" style={{ color: '#9a9694' }}>{label}</span>
      <span className="min-w-0 truncate text-sm font-medium" style={{ color: '#322e2d' }}>{value}</span>
    </div>
  )
}
