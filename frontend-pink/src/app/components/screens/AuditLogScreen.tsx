import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '../shared/PageHeader'
import { supabase } from '../../../lib/supabase'
import { Search } from 'lucide-react'
import { usePagination } from '../../hooks/usePagination'
import { Pagination } from '../shared/Pagination'

type Profile = { full_name: string; role: string }
type Audit = {
  id: string
  table_name: string
  action: string
  record_id: string | null
  changed_at: string
  old_row: any
  new_row: any
  profiles: Profile | null
}
type UserOption = { id: string; full_name: string }

export function AuditLogScreen() {
  const [rows, setRows] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [allUsers, setAllUsers] = useState<UserOption[]>([])
  const [allModules, setAllModules] = useState<string[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState('All Users')
  const [selectedModule, setSelectedModule] = useState('All Modules')

  const { page, pageSize, total, totalPages, from, to, setPage, setTotal, resetPage, handlePageSizeChange } = usePagination()
  const isFirstRender = useRef(true)

  // Load dropdown options once on mount
  useEffect(() => {
    void Promise.all([
      supabase.from('profiles').select('id,full_name').order('full_name'),
      supabase.from('audit_logs').select('table_name').limit(1000),
    ]).then(([{ data: profiles }, { data: tables }]) => {
      setAllUsers((profiles ?? []) as UserOption[])
      const unique = [...new Set((tables ?? []).map((t: any) => t.table_name as string))].sort()
      setAllModules(unique)
    })
  }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Reset page when filters change
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    resetPage()
  }, [debouncedSearch, selectedUser, selectedModule])

  useEffect(() => { void load() }, [page, pageSize, debouncedSearch, selectedUser, selectedModule])

  async function load(): Promise<void> {
    setLoading(true)
    let q = supabase
      .from('audit_logs')
      .select('id,table_name,action,record_id,changed_at,old_row,new_row,profiles:changed_by(full_name,role)', { count: 'exact' })
      .order('changed_at', { ascending: false })
      .range(from, to)

    if (selectedModule !== 'All Modules') {
      q = q.eq('table_name', selectedModule)
    }

    if (selectedUser !== 'All Users') {
      if (selectedUser === 'System') {
        q = q.is('changed_by', null)
      } else {
        const userObj = allUsers.find(u => u.full_name === selectedUser)
        if (userObj) q = q.eq('changed_by', userObj.id)
      }
    }

    if (debouncedSearch) {
      q = q.or(`table_name.ilike.%${debouncedSearch}%,action.ilike.%${debouncedSearch}%,record_id.ilike.%${debouncedSearch}%`)
    }

    const { data, count } = await q
    setRows((data ?? []) as Audit[])
    setTotal(count ?? 0)
    setLoading(false)
  }

  function formatTime(isoString: string) {
    const d = new Date(isoString)
    const date = d.toISOString().split('T')[0]
    const time = d.toTimeString().split(' ')[0].substring(0, 5)
    return { date, time }
  }

  function getChangeSummary(row: Audit) {
    if (row.action === 'delete') return `Record deleted`

    const isInsert = row.action === 'insert'
    const payload = isInsert ? row.new_row : row.new_row

    switch (row.table_name) {
      case 'donors':
        if (isInsert) return `New donor registered: ${payload.full_name}`
        if (row.old_row?.screening_status !== row.new_row?.screening_status) {
          return `Screening status: ${row.old_row?.screening_status || 'none'} → ${row.new_row?.screening_status}`
        }
        return `Donor details updated for ${payload.full_name}`

      case 'batches':
        if (row.old_row?.status !== row.new_row?.status) {
          return `status: ${(row.old_row?.status || 'RAW').toUpperCase()} → ${(row.new_row?.status || '').toUpperCase()}`
        }
        if (isInsert) return `New batch created: ${payload.batch_number}`
        return `Batch updated`

      case 'lab_results':
        if (isInsert) return `${payload.stage} test logged`
        if (row.old_row?.result !== row.new_row?.result) {
          return `${payload.stage} result: ${row.new_row?.result}`
        }
        return `Lab result updated`

      case 'dispensing_records':
        if (isInsert) return `${payload.volume_ml || 0}mL dispensed`
        if (row.old_row?.status !== row.new_row?.status) {
          return `Dispensing status: ${row.old_row?.status} → ${row.new_row?.status}`
        }
        return `Dispensing record updated`

      case 'email_notifications':
        return `Email sent regarding ${payload.trigger_event}`

      default:
        return isInsert ? `New record created in ${row.table_name}` : `Record updated in ${row.table_name}`
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Admin' }, { label: 'Audit Log' }]}
        title="Audit Log"
        subtitle="Read-only system event log. All batch status transitions and record changes are captured here."
      />

      <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-3 flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by action, record, or module…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            maxLength={200}
            aria-label="Search audit log"
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
          />
        </div>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          aria-label="Filter by user"
          className="w-full md:w-auto px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-pink-300 transition-all"
        >
          <option value="All Users">All Users</option>
          <option value="System">System</option>
          {allUsers.map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
        </select>
        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          aria-label="Filter by module"
          className="w-full md:w-auto px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-pink-300 transition-all"
        >
          <option value="All Modules">All Modules</option>
          {allModules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="text-sm text-zinc-500 whitespace-nowrap px-2 tabular-nums">
          {total} events
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                {['Timestamp', 'User', 'Role', 'Action', 'Module', 'Record ID', 'Change Summary'].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-mono font-semibold text-zinc-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-zinc-400">Loading audit log…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-zinc-500">No audit events match the current filters.</td></tr>
              ) : (
                rows.map((row) => {
                  const { date, time } = formatTime(row.changed_at)
                  const summary = getChangeSummary(row)
                  const actionColor = row.action === 'insert' ? 'bg-emerald-100 text-emerald-700' : row.action === 'delete' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'

                  return (
                    <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-zinc-600 whitespace-nowrap">
                        <div className="text-zinc-800">{date}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{time}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-900 font-medium whitespace-nowrap">{row.profiles?.full_name || 'System'}</td>
                      <td className="px-6 py-4 text-sm text-zinc-500 capitalize whitespace-nowrap">{row.profiles?.role || 'Administrator'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-md ${actionColor}`}>
                          {row.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-zinc-600 whitespace-nowrap">{row.table_name}</td>
                      <td className="px-6 py-4 text-xs font-mono text-pink-400 whitespace-nowrap">{row.record_id ? (row.record_id.length > 13 ? row.record_id.substring(0, 13) + '…' : row.record_id) : '-'}</td>
                      <td className="px-6 py-4 text-sm text-zinc-700 max-w-md truncate">{summary}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={handlePageSizeChange} />
      </div>
    </div>
  )
}
