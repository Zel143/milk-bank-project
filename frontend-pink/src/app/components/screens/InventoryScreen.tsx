import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { toProgramLabel, toTitle } from '../../exportUtils'

type Batch = { id: string; batch_number: string | null; status: string; program: string; total_volume_ml: number; created_at: string }
export function InventoryScreen() {
  const [rows, setRows] = useState<Batch[]>([]); const [search, setSearch] = useState('')
  useEffect(() => { void supabase.from('batches').select('id,batch_number,status,program,total_volume_ml,created_at').order('created_at', { ascending: false }).then(({ data }) => setRows((data ?? []) as Batch[])) }, [])
  const filtered = useMemo(() => rows.filter((r) => [r.batch_number, r.status, r.program].join(' ').toLowerCase().includes(search.toLowerCase())), [rows, search])
  const summary = rows.reduce<Record<string, number>>((acc, row) => { acc[row.status] = (acc[row.status] ?? 0) + Number(row.total_volume_ml ?? 0); return acc }, {})
  return <div><PageHeader crumbs={[{ label: 'Milk Lifecycle' }]} title="Inventory" subtitle="Dynamic inventory from Supabase batch status and volume" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">{Object.entries(summary).map(([status, volume]) => <div key={status} className="bg-white rounded-2xl border p-4"><StatusBadge value={toTitle(status)} /><div className="text-2xl mt-3">{volume}</div><div className="text-xs text-[#6B7280]">mL</div></div>)}</div>
    <div className="bg-white rounded-2xl border p-4 mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg" placeholder="Search inventory..." /></div></div>
    <div className="bg-white rounded-2xl border overflow-x-auto"><table className="w-full"><thead><tr>{['Batch','Program','Volume','Status'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs text-[#6B7280]">{h}</th>)}</tr></thead><tbody>{filtered.map((row) => <tr key={row.id} className="border-t"><td className="px-4 py-3 text-xs text-[#eea4bb]">{row.batch_number}</td><td className="px-4 py-3 text-sm">{toProgramLabel(row.program)}</td><td className="px-4 py-3 text-sm">{row.total_volume_ml}</td><td className="px-4 py-3"><StatusBadge value={toTitle(row.status)} /></td></tr>)}</tbody></table></div>
  </div>
}