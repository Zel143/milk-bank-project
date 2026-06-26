import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, Search, X } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { exportCsv, exportExcel, fromProgramLabel, toProgramLabel, toTitle, type ExportRow } from '../../exportUtils'

type DonorRow = {
  id: string
  dtn: string | null
  full_name: string
  primary_program: string
  classification: string
  contact_number: string | null
  address: string
  screening_status: string
  created_at: string
}

export function DonorManagementScreen() {
  const [rows, setRows] = useState<DonorRow[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load(): Promise<void> {
    const { data } = await supabase.from('donors').select('id,dtn,full_name,primary_program,classification,contact_number,address,screening_status,created_at').order('created_at', { ascending: false })
    setRows((data ?? []) as DonorRow[])
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => rows.filter((row) => [row.dtn, row.full_name, row.contact_number].join(' ').toLowerCase().includes(search.toLowerCase())), [rows, search])
  const exportRows: ExportRow[] = filtered.map((row) => ({ DTN: row.dtn, Name: row.full_name, Program: toProgramLabel(row.primary_program), Classification: toTitle(row.classification), Contact: row.contact_number, Status: toTitle(row.screening_status) }))

  async function saveDonor(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSaving(true)
    const form = new FormData(event.currentTarget)
    await supabase.from('donors').insert({
      full_name: String(form.get('full_name') ?? ''),
      address: String(form.get('address') ?? ''),
      contact_number: String(form.get('contact_number') ?? ''),
      primary_program: fromProgramLabel(form.get('program')),
      classification: String(form.get('classification') ?? 'community'),
      screening_status: String(form.get('screening_status') ?? 'pending'),
    })
    setSaving(false)
    setOpen(false)
    await load()
  }

  return <div>
    <PageHeader crumbs={[{ label: 'Donors' }]} title="Donor Management" subtitle="Supabase-backed donor profiles and health screening status" actions={<div className="flex gap-2">
      <button onClick={() => exportCsv('donors', exportRows)} className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white"><Download className="w-4 h-4" />CSV</button>
      <button onClick={() => exportExcel('donors', exportRows)} className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white"><Download className="w-4 h-4" />Excel</button>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg" style={{ background: '#eea4bb' }}><Plus className="w-4 h-4" />Add Donor</button>
    </div>} />

    <div className="bg-white rounded-2xl border p-4 mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border" placeholder="Search donor..." /></div></div>

    <div className="bg-white rounded-2xl border overflow-x-auto"><table className="w-full"><thead><tr>{['DTN','Name','Program','Classification','Contact','Status'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs text-[#6B7280]">{h}</th>)}</tr></thead><tbody>{filtered.map((row) => <tr key={row.id} className="border-t"><td className="px-4 py-3 text-xs text-[#eea4bb]">{row.dtn}</td><td className="px-4 py-3 text-sm">{row.full_name}</td><td className="px-4 py-3 text-sm">{toProgramLabel(row.primary_program)}</td><td className="px-4 py-3 text-sm">{toTitle(row.classification)}</td><td className="px-4 py-3 text-sm">{row.contact_number}</td><td className="px-4 py-3"><StatusBadge value={toTitle(row.screening_status)} /></td></tr>)}</tbody></table></div>

    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><form onSubmit={saveDonor} className="w-full max-w-lg bg-white rounded-xl p-6 space-y-4"><div className="flex justify-between"><h2 className="font-semibold">Add Donor</h2><button type="button" onClick={() => setOpen(false)}><X className="w-4 h-4" /></button></div><input name="full_name" required className="w-full border rounded-lg px-3 py-2" placeholder="Full name" /><input name="address" required className="w-full border rounded-lg px-3 py-2" placeholder="Address" /><input name="contact_number" required className="w-full border rounded-lg px-3 py-2" placeholder="Contact number" /><select name="program" required className="w-full border rounded-lg px-3 py-2"><option>Supsup Todo</option><option>Mom's Act</option><option>Milky Way</option></select><select name="classification" className="w-full border rounded-lg px-3 py-2"><option value="community">Community</option><option value="private">Private</option><option value="institutional">Institutional</option></select><select name="screening_status" className="w-full border rounded-lg px-3 py-2"><option value="pending">Pending</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="not_required">Not Required</option></select><button disabled={saving} className="w-full rounded-lg py-2 text-white" style={{ background: '#eea4bb' }}>{saving ? 'Saving...' : 'Save Donor'}</button></form></div>}
  </div>
}