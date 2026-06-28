import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { toProgramLabel, activeProgramToDb, formatDate } from '../../exportUtils'
import { useProgramFilter } from '../../../lib/programContext'
import { usePagination } from '../../hooks/usePagination'
import { Pagination } from '../shared/Pagination'

type Batch = { id: string; batch_number: string | null; status: string; program: string; total_volume_ml: number; created_at: string }
type SummaryItem = { status: string; total_volume_ml: number }

const STATUS_ORDER = [
  'raw', 'pre_testing', 'pre_test_passed', 'pasteurized',
  'post_testing', 'ready', 'dispensed', 'discarded',
  'pre_test_failed', 'post_test_failed',
]

export function InventoryScreen() {
  const [rows, setRows] = useState<Batch[]>([])
  const [summaryData, setSummaryData] = useState<SummaryItem[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const activeProgram = useProgramFilter()
  const { page, pageSize, total, totalPages, from, to, setPage, setTotal, resetPage, handlePageSizeChange } = usePagination()
  const isFirstRender = useRef(true)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    resetPage()
  }, [debouncedSearch, activeProgram])

  useEffect(() => { void loadSummary() }, [activeProgram])
  useEffect(() => { void loadTable() }, [page, pageSize, debouncedSearch, activeProgram])

  async function loadSummary(): Promise<void> {
    const dbProgram = activeProgramToDb(activeProgram)
    let q = supabase.from('batches').select('status,total_volume_ml')
    if (dbProgram) q = q.eq('program', dbProgram)
    const { data } = await q
    setSummaryData((data ?? []) as SummaryItem[])
  }

  async function loadTable(): Promise<void> {
    const dbProgram = activeProgramToDb(activeProgram)
    let q = supabase
      .from('batches')
      .select('id,batch_number,status,program,total_volume_ml,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (dbProgram) q = q.eq('program', dbProgram)
    if (debouncedSearch) q = q.or(`batch_number.ilike.%${debouncedSearch}%,status.ilike.%${debouncedSearch}%,program.ilike.%${debouncedSearch}%`)
    const { data, count } = await q
    setRows((data ?? []) as Batch[])
    setTotal(count ?? 0)
  }

  const summaryMap = useMemo(() => {
    return summaryData.reduce<Record<string, { volume: number; count: number }>>((acc, row) => {
      if (!acc[row.status]) acc[row.status] = { volume: 0, count: 0 }
      acc[row.status].volume += Number(row.total_volume_ml ?? 0)
      acc[row.status].count += 1
      return acc
    }, {})
  }, [summaryData])

  const orderedStatuses = useMemo(() => {
    const ordered = STATUS_ORDER.filter(s => summaryMap[s])
    const extra = Object.keys(summaryMap).filter(s => !STATUS_ORDER.includes(s))
    return [...ordered, ...extra]
  }, [summaryMap])

  return (
    <div className="space-y-5">
      <PageHeader crumbs={[{ label: 'Milk Lifecycle' }]} title="Inventory" subtitle="Live batch status and volume across the milk lifecycle" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {orderedStatuses.map((status) => {
          const { volume, count } = summaryMap[status]
          return (
            <div key={status} className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-5 flex flex-col">
              <StatusBadge value={status.toUpperCase()} />
              <div className="mt-4 text-3xl font-bold font-mono tabular-nums leading-none" style={{ color: '#322e2d' }}>
                {volume.toLocaleString()}
              </div>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">mL</span>
                <span className="text-xs text-zinc-300 font-mono">&middot;</span>
                <span className="text-xs font-mono text-zinc-400">{count}{count === 1 ? ' batch' : ' batches'}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/40 focus-visible:border-[#eea4bb] transition-colors"
              placeholder="Search batches…"
              aria-label="Search inventory"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50/50">
              <tr className="border-b border-zinc-100">
                {['Batch Number', 'Program', 'Volume (mL)', 'Status', 'Created'].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium font-mono" style={{ color: '#eea4bb' }}>{row.batch_number ?? 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-zinc-700">{toProgramLabel(row.program)}</td>
                  <td className="px-6 py-4 text-sm font-mono tabular-nums text-zinc-900">{Number(row.total_volume_ml).toLocaleString()}</td>
                  <td className="px-6 py-4"><StatusBadge value={row.status.toUpperCase()} /></td>
                  <td className="px-6 py-4 text-sm text-zinc-500 font-mono">{formatDate(row.created_at)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-zinc-400">No batches found</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={handlePageSizeChange} />
        </div>
      </div>
    </div>
  )
}
