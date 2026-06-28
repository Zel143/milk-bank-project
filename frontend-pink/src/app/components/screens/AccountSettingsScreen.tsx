import { useState } from 'react'
import { KeyRound, User, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import type { AppUser } from '../../types'
import { supabase } from '../../../lib/supabase'

export function AccountSettingsScreen({ user }: { user: AppUser }) {
  const [pwForm, setPwForm] = useState({ next: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) {
      setNotice({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    if (pwForm.next.length < 8) {
      setNotice({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    setSaving(true)
    setNotice(null)
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    setSaving(false)
    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setNotice({ type: 'success', text: 'Password updated successfully.' })
      setPwForm({ next: '', confirm: '' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Account' }]}
        title="Account Settings"
        subtitle="Manage your profile and security credentials"
      />

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: '#eea4bb', color: '#322e2d' }}
          >
            {user.initials}
          </div>
          <div>
            <div className="text-base font-semibold text-zinc-900">{user.name}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs text-zinc-500 font-mono">{user.role}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
            <User className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <div className="text-xs text-zinc-400 font-mono uppercase tracking-wider">Display Name</div>
              <div className="text-sm font-medium text-zinc-800 mt-0.5">{user.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
            <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <div className="text-xs text-zinc-400 font-mono uppercase tracking-wider">Role</div>
              <div className="text-sm font-medium text-zinc-800 mt-0.5">{user.role}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Change password card */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 max-w-lg">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-800">Change Password</h2>
        </div>

        {notice && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            notice.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {notice.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="pw-new" className="text-sm font-medium text-zinc-700">New Password</label>
            <input
              id="pw-new"
              type="password"
              required
              minLength={8}
              value={pwForm.next}
              onChange={(e) => setPwForm(f => ({ ...f, next: e.target.value }))}
              placeholder="At least 8 characters"
              className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="pw-confirm" className="text-sm font-medium text-zinc-700">Confirm New Password</label>
            <input
              id="pw-confirm"
              type="password"
              required
              value={pwForm.confirm}
              onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Repeat new password"
              className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400"
            />
          </div>
          <div className="pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#eea4bb' }}
            >
              {saving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}