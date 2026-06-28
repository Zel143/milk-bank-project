import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { toProgramLabel, toTitle } from '../../exportUtils'

type Batch = {
  id: string
  batch_number: string | null
  status: string
  program: string
  total_volume_ml: number
  created_at: string
}

export function InventoryScreen() {
  const [rows, setRows] = useState<Batch[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    void supabase
      .from('batches')
      .select('id,batch_number,status,program,total_volume_ml,created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows((data ?? []) as Batch[]))
  }, [])

  const filtered = useMemo(
    () => rows.filter((r) =>
      [r.batch_number, r.status, r.program].join(' ').toLowerCase().includes(search.toLowerCase())
    ),
    [rows, search]
  )

  const summary = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + Number(row.total_volume_ml ?? 0)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Milk Lifecycle' }]}
        title="Inventory"
        subtitle="Dynamic inventory from Supabase batch status and volume"
      />

      {/* Status summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(summary).map(([status, volume]) => (
          <div key={status} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
            <StatusBadge value={toTitle(status)} />
            <div className="text-2xl font-bold font-mono text-zinc-900 mt-3">{volume}</div>
            <div className="text-xs text-zinc-400 font-mono uppercase tracking-wider mt-1">mL</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-zinc-50/50 border border-zinc-200 outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400"
            placeholder="Search by batch number, status, or program…"
          />
        </div>
      </div>

      {/* Batch table */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-x-auto shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100">
              {['Batch', 'Program', 'Volume (mL)', 'Status'].map((h) => (
                <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-pink-400 font-mono">{row.batch_number}</td>
                <td className="px-6 py-4 text-sm text-zinc-600">{toProgramLabel(row.program)}</td>
                <td className="px-6 py-4 text-sm text-zinc-900 font-mono tabular-nums">{row.total_volume_ml}</td>
                <td className="px-6 py-4"><StatusBadge value={toTitle(row.status)} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-400">No batches found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}