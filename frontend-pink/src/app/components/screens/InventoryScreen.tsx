import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { toProgramLabel, toTitle, activeProgramToDb } from '../../exportUtils'
import { useProgramFilter } from '../../../lib/programContext'
import { usePagination } from '../../hooks/usePagination'
import { Pagination } from '../shared/Pagination'

type Batch = { id: string; batch_number: string | null; status: string; program: string; total_volume_ml: number; created_at: string }
type SummaryItem = { status: string; total_volume_ml: number }

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

  const summary = summaryData.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + Number(row.total_volume_ml ?? 0)
    return acc
  }, {})

  return (
    <div>
      <PageHeader crumbs={[{ label: 'Milk Lifecycle' }]} title="Inventory" subtitle="Dynamic inventory from Supabase batch status and volume" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {Object.entries(summary).map(([status, volume]) => (
          <div key={status} className="bg-white rounded-2xl border p-4">
            <StatusBadge value={toTitle(status)} />
            <div className="text-2xl mt-3">{volume}</div>
            <div className="text-xs text-[#6B7280]">mL</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
            className="w-full pl-9 pr-3 py-2 border rounded-lg"
            placeholder="Search inventory…"
            aria-label="Search inventory"
          />
        </div>
      </div>
      <div className="bg-white rounded-2xl border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {['Batch', 'Program', 'Volume', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-[#6B7280]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-3 text-xs text-[#eea4bb]">{row.batch_number}</td>
                <td className="px-4 py-3 text-sm">{toProgramLabel(row.program)}</td>
                <td className="px-4 py-3 text-sm">{row.total_volume_ml}</td>
                <td className="px-4 py-3"><StatusBadge value={toTitle(row.status)} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-400">No batches found</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={handlePageSizeChange} />
      </div>
    </div>
  )
}
