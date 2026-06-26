import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { fromProgramLabel, formatDate, toProgramLabel } from '../../exportUtils'

type Donor = { id: string; dtn: string | null; full_name: string; primary_program: string }
type Collection = { id: string; ctn: string | null; program: string; volume_ml: number; collection_mode: string; collected_at: string; donors?: Donor | null }

export function MilkCollectionScreen() {
  const [rows, setRows] = useState<Collection[]>([])
  const [donors, setDonors] = useState<Donor[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  async function load(): Promise<void> {
    const [{ data: collections }, { data: donorRows }] = await Promise.all([
      supabase.from('collections').select('id,ctn,program,volume_ml,collection_mode,collected_at,donors(id,dtn,full_name,primary_program)').order('collected_at', { ascending: false }),
      supabase.from('donors').select('id,dtn,full_name,primary_program').order('full_name'),
    ])
    setRows((collections ?? []) as Collection[])
    setDonors((donorRows ?? []) as Donor[])
  }
  useEffect(() => { void load() }, [])
  const filtered = useMemo(() => rows.filter((row) => [row.ctn, row.donors?.dtn, row.donors?.full_name].join(' ').toLowerCase().includes(search.toLowerCase())), [rows, search])

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const donorId = String(form.get('donor_id') ?? '')
    const program = fromProgramLabel(form.get('program'))
    const volume = Number(form.get('volume_ml') ?? 0)
    const { data: collection } = await supabase.from('collections').insert({ donor_id: donorId, program, volume_ml: volume, collection_mode: String(form.get('collection_mode')), collected_at: String(form.get('collected_at')) || new Date().toISOString(), cold_chain_verified: true }).select('id').single()
    const { data: batch } = await supabase.from('batches').insert({ program, status: 'raw' }).select('id').single()
    if (collection && batch) await supabase.from('batch_collections').insert({ collection_id: collection.id, batch_id: batch.id, volume_ml: volume })
    setOpen(false); await load()
  }

  return <div><PageHeader crumbs={[{ label: 'Milk Lifecycle' }]} title="Milk Collection" subtitle="Supabase-backed collection and batch creation" actions={<button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg" style={{ background: '#eea4bb' }}><Plus className="w-4 h-4" />New Collection</button>} />
    <div className="bg-white rounded-2xl border p-4 mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg" placeholder="Search collection..." /></div></div>
    <div className="bg-white rounded-2xl border overflow-x-auto"><table className="w-full"><thead><tr>{['CTN','Donor','Program','Volume','Mode','Date'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs text-[#6B7280]">{h}</th>)}</tr></thead><tbody>{filtered.map((row) => <tr key={row.id} className="border-t"><td className="px-4 py-3 text-xs text-[#eea4bb]">{row.ctn}</td><td className="px-4 py-3 text-sm">{row.donors?.full_name}<div className="text-xs text-[#6B7280]">{row.donors?.dtn}</div></td><td className="px-4 py-3 text-sm">{toProgramLabel(row.program)}</td><td className="px-4 py-3 text-sm">{row.volume_ml}</td><td className="px-4 py-3"><StatusBadge value={row.collection_mode} short /></td><td className="px-4 py-3 text-sm">{formatDate(row.collected_at)}</td></tr>)}</tbody></table></div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><form onSubmit={save} className="w-full max-w-md bg-white rounded-xl p-6 space-y-4"><div className="flex justify-between"><h2 className="font-semibold">New Collection</h2><button type="button" onClick={() => setOpen(false)}><X className="w-4 h-4" /></button></div><select name="donor_id" required className="w-full border rounded-lg px-3 py-2">{donors.map((d) => <option key={d.id} value={d.id}>{d.dtn} - {d.full_name}</option>)}</select><select name="program" required className="w-full border rounded-lg px-3 py-2"><option>Supsup Todo</option><option>Mom's Act</option><option>Milky Way</option></select><input name="volume_ml" type="number" min="30" max="240" required className="w-full border rounded-lg px-3 py-2" placeholder="Volume mL" /><select name="collection_mode" className="w-full border rounded-lg px-3 py-2"><option value="field_collection">Field Collection</option><option value="pickup">Pickup</option></select><input name="collected_at" type="datetime-local" className="w-full border rounded-lg px-3 py-2" /><button className="w-full rounded-lg py-2 text-white" style={{ background: '#eea4bb' }}>Save Collection</button></form></div>}
  </div>
}