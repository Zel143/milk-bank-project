import { useEffect, useRef, useState } from 'react'
import { Search, Lock, CheckCircle2, Shield, RefreshCw, Pencil, X } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { motion, AnimatePresence } from 'motion/react'
import { usePagination } from '../../hooks/usePagination'
import { Pagination } from '../shared/Pagination'

type Account = {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'staff'
  is_active: boolean
  created_at: string
}

export function AdminAccountsScreen() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState<'All' | 'admin' | 'staff'>('All')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const { page, pageSize, total, totalPages, from, to, setPage, setTotal, resetPage, handlePageSizeChange } = usePagination()
  const isFirstRender = useRef(true)

  // Edit drawer
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<'admin' | 'staff'>('staff')
  const [editActive, setEditActive] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    resetPage()
  }, [debouncedSearch, selectedRole])

  useEffect(() => { void fetchAccounts() }, [page, pageSize, debouncedSearch, selectedRole])

  async function fetchAccounts(showSpinner = false) {
    if (showSpinner) setRefreshing(true)
    let q = supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to)
    if (debouncedSearch) q = q.or(`full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`)
    if (selectedRole !== 'All') q = q.eq('role', selectedRole)
    const { data, count } = await q
    if (data) setAccounts(data as Account[])
    setTotal(count ?? 0)
    if (showSpinner) setRefreshing(false)
  }

  function openEdit(account: Account) {
    setEditTarget(account)
    setEditName(account.full_name)
    setEditRole(account.role)
    setEditActive(account.is_active)
  }

  function closeEdit() {
    setEditTarget(null)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setSaving(true)
    await supabase.from('profiles').update({
      full_name: editName.trim(),
      role: editRole,
      is_active: editActive,
      updated_at: new Date().toISOString(),
    }).eq('id', editTarget.id)
    setSaving(false)
    closeEdit()
    void fetchAccounts()
  }

  async function handleToggleStatus(id: string, currentStatus: boolean) {
    await supabase.from('profiles').update({ is_active: !currentStatus, updated_at: new Date().toISOString() }).eq('id', id)
    void fetchAccounts()
  }

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Admin' }, { label: 'Accounts' }]}
        title="Access Account Directory"
        subtitle="Review Supabase-backed profiles, assign clinical roles, and activate or disable account access."
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people or emails…"
                maxLength={100}
                className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/30"
                style={{ background: '#F8F7F5', borderColor: 'rgba(0,0,0,0.08)', color: '#1A1A1A' }}
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'All' | 'admin' | 'staff')}
              className="rounded-xl border px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/30"
              style={{ background: '#F8F7F5', borderColor: 'rgba(0,0,0,0.08)', color: '#1A1A1A' }}
            >
              <option value="All">All roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
            <button
              type="button"
              onClick={() => fetchAccounts(true)}
              disabled={refreshing}
              title="Reload accounts"
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[#F8F0F4] disabled:opacity-50"
              style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#F8F7F5', color: '#636260' }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reload</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#F8F8FC', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    {['Name', 'Email', 'Role', 'Status', 'Actions'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] whitespace-nowrap" style={{ fontFamily: 'var(--font-family-mono)' }}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#6B7280]">
                        No accounts match the current filters.
                      </td>
                    </tr>
                  ) : (
                    accounts.map((account, index) => (
                      <tr
                        key={account.id}
                        className="hover:bg-[#F8F8FC] transition-colors"
                        style={{ borderBottom: index < accounts.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}
                      >
                        <td className="px-4 py-3.5">
                          <div className="text-sm font-medium text-[#1A1A1A]">{account.full_name}</div>
                          <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'var(--font-family-mono)' }}>{account.id.split('-')[0]}...</div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[#1A1A1A] whitespace-nowrap">{account.email}</td>
                        <td className="px-4 py-3.5 text-sm uppercase text-[#6B7280]">{account.role}</td>
                        <td className="px-4 py-3.5">
                          <StatusBadge value={account.is_active ? 'Passed' : 'Failed'} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(account)}
                              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F8F0F4]"
                              style={{ borderColor: 'rgba(238,164,187,0.5)', background: '#FFF0F5', color: '#9d416d' }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(account.id, account.is_active)}
                              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F8F8FC]"
                              style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#FFFFFF', color: '#1A1A1A' }}
                            >
                              {account.is_active ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              {account.is_active ? 'Disable' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={handlePageSizeChange} />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border bg-[#322e2d] p-5 text-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: '#eea4bb' }}>
                <Shield className="w-5 h-5 text-[#322e2d]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Schema Rules</h3>
                <p className="text-xs text-[#d4cfc8]">The database keeps credentials in Supabase Auth and profile data in public.profiles.</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-[#d4cfc8]">
              <li>• `role` on the profile table is limited to `admin` and `staff`.</li>
              <li>• Account activation follows `is_active` from the schema.</li>
              <li>• Access is denied globally until an admin activates the user.</li>
            </ul>
          </div>
        </section>
      </div>

      {/* Edit Drawer */}
      <AnimatePresence>
        {editTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-[#322e2d]"
              onClick={closeEdit}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                <div>
                  <p className="text-xs text-[#6B7280]" style={{ fontFamily: 'var(--font-family-mono)' }}>Editing account</p>
                  <h2 className="text-base font-semibold text-[#1A1A1A]">{editTarget.full_name}</h2>
                </div>
                <button onClick={closeEdit} className="rounded-xl p-2 hover:bg-[#F8F7F5] transition-colors">
                  <X className="w-4 h-4 text-[#6B7280]" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-y-auto">
                <div className="flex-1 space-y-5 px-5 py-6">

                  {/* Email — read-only, managed by Supabase Auth */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Email</label>
                    <input
                      value={editTarget.email}
                      readOnly
                      className="w-full rounded-xl border px-3 py-2.5 text-sm text-[#6B7280] cursor-not-allowed"
                      style={{ background: '#F8F7F5', borderColor: 'rgba(0,0,0,0.08)' }}
                    />
                    <p className="mt-1 text-[11px] text-[#9CA3AF]">Email is managed by Supabase Auth and cannot be changed here.</p>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#322e2d]">Full Name</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      maxLength={120}
                      placeholder="e.g. Maria Santos"
                      className="w-full rounded-xl border px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/40"
                      style={{ borderColor: 'rgba(0,0,0,0.10)', color: '#1A1A1A' }}
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#322e2d]">Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as 'admin' | 'staff')}
                      className="w-full rounded-xl border px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/40"
                      style={{ borderColor: 'rgba(0,0,0,0.10)', color: '#1A1A1A' }}
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* Active status */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#322e2d]">Account Status</label>
                    <div className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: 'rgba(0,0,0,0.10)' }}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={editActive}
                        onClick={() => setEditActive(v => !v)}
                        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
                        style={{ background: editActive ? '#eea4bb' : '#d1d5db' }}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                          style={{ transform: editActive ? 'translateX(18px)' : 'translateX(2px)' }}
                        />
                      </button>
                      <span className="text-sm" style={{ color: editActive ? '#1A1A1A' : '#6B7280' }}>
                        {editActive ? 'Active — can log in' : 'Disabled — access blocked'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t px-5 py-4 flex gap-3" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="flex-1 rounded-xl border py-2.5 text-sm font-medium text-[#636260] transition-colors hover:bg-[#F8F7F5]"
                    style={{ borderColor: 'rgba(0,0,0,0.08)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !editName.trim()}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-[#322e2d] transition-colors disabled:opacity-50"
                    style={{ background: '#eea4bb' }}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
