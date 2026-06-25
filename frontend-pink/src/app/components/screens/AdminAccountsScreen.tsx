import { useEffect, useMemo, useState } from 'react'
import { Search, Lock, CheckCircle2, UserCog, Shield } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'

export function AdminAccountsScreen() {
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState<'All' | 'admin' | 'staff'>('All')
  const [accounts, setAccounts] = useState<any[]>([])

  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) setAccounts(data)
  }

  async function handleToggleStatus(id: string, currentStatus: boolean) {
    await supabase.from('profiles').update({ is_active: !currentStatus, updated_at: new Date().toISOString() }).eq('id', id)
    fetchAccounts()
  }

  async function handlePromote(id: string) {
    await supabase.from('profiles').update({ role: 'admin', updated_at: new Date().toISOString() }).eq('id', id)
    fetchAccounts()
  }

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return accounts.filter((account) => {
      const matchesSearch =
        account.full_name.toLowerCase().includes(query) ||
        account.email.toLowerCase().includes(query)
      const matchesRole = selectedRole === 'All' || account.role === selectedRole
      return matchesSearch && matchesRole
    })
  }, [accounts, search, selectedRole])

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
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#6B7280]">
                        No accounts match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((account, index) => (
                      <tr key={account.id} className="hover:bg-[#F8F8FC] transition-colors" style={{ borderBottom: index < filteredAccounts.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#322e2d] text-xs font-semibold text-[#eea4bb]" style={{ fontFamily: 'var(--font-family-mono)' }}>
                              {account.full_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-[#1A1A1A]">{account.full_name}</div>
                              <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'var(--font-family-mono)' }}>{account.id.split('-')[0]}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[#1A1A1A] whitespace-nowrap">{account.email}</td>
                        <td className="px-4 py-3.5 text-sm uppercase text-[#6B7280]">
                          {account.role}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge value={account.is_active ? 'Passed' : 'Failed'} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(account.id, account.is_active)}
                              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                              style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#FFFFFF', color: '#1A1A1A' }}
                            >
                              {account.is_active ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              {account.is_active ? 'Disable' : 'Activate'}
                            </button>
                            {account.role !== 'admin' && (
                              <button
                                type="button"
                                onClick={() => handlePromote(account.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                                style={{ borderColor: 'rgba(238,164,187,0.5)', background: '#FFF0F5', color: '#9d416d' }}
                              >
                                <UserCog className="w-3.5 h-3.5" />
                                Make Admin
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
    </div>
  )
}