import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { supabase } from '../../../lib/supabase'
import { formatDate } from '../../exportUtils'

type Batch = { id: string; batch_number: string | null; total_volume_ml: number }
type Row = { id: string; pasteurized_at: string; temperature_c: number; duration_minutes: number; batches?: Batch | null }

export function PasteurizationScreen() {
  const [rows, setRows] = useState<Row[]>([]); const [batches, setBatches] = useState<Batch[]>([]); const [open, setOpen] = useState(false)
  async function load(): Promise<void> { const [{ data: recs }, { data: eligible }] = await Promise.all([supabase.from('pasteurization_records').select('id,pasteurized_at,temperature_c,duration_minutes,batches(id,batch_number,total_volume_ml)').order('pasteurized_at', { ascending: false }), supabase.from('batches').select('id,batch_number,total_volume_ml').eq('status', 'pre_test_passed')]); setRows((recs ?? []) as Row[]); setBatches((eligible ?? []) as Batch[]) }
  useEffect(() => { void load() }, [])
  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> { event.preventDefault(); const form = new FormData(event.currentTarget); await supabase.from('pasteurization_records').insert({ batch_id: String(form.get('batch_id')), temperature_c: Number(form.get('temperature_c')), duration_minutes: Number(form.get('duration_minutes')), pasteurized_at: String(form.get('pasteurized_at')) || new Date().toISOString() }); setOpen(false); await load() }
  return <div><PageHeader crumbs={[{ label: 'Milk Lifecycle' }]} title="Pasteurization" subtitle="Supabase-backed Holder pasteurization logs" actions={<button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg" style={{ background: '#eea4bb' }}><Plus className="w-4 h-4" />Log Pasteurization</button>} />
    <div className="bg-white rounded-2xl border overflow-x-auto"><table className="w-full"><thead><tr>{['Batch','Temperature','Duration','Date'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs text-[#6B7280]">{h}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="px-4 py-3 text-xs text-[#eea4bb]">{row.batches?.batch_number}</td><td className="px-4 py-3 text-sm">{row.temperature_c} C</td><td className="px-4 py-3 text-sm">{row.duration_minutes} min</td><td className="px-4 py-3 text-sm">{formatDate(row.pasteurized_at)}</td></tr>)}</tbody></table></div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><form onSubmit={save} className="w-full max-w-md bg-white rounded-xl p-6 space-y-4"><div className="flex justify-between"><h2 className="font-semibold">Log Pasteurization</h2><button type="button" onClick={() => setOpen(false)}><X className="w-4 h-4" /></button></div><select name="batch_id" required className="w-full border rounded-lg px-3 py-2">{batches.map((b) => <option key={b.id} value={b.id}>{b.batch_number} - {b.total_volume_ml} mL</option>)}</select><input name="temperature_c" type="number" step="0.1" defaultValue="62.5" className="w-full border rounded-lg px-3 py-2" /><input name="duration_minutes" type="number" defaultValue="30" className="w-full border rounded-lg px-3 py-2" /><input name="pasteurized_at" type="datetime-local" className="w-full border rounded-lg px-3 py-2" /><button className="w-full rounded-lg py-2 text-white" style={{ background: '#eea4bb' }}>Save Pasteurization</button></form></div>}
  </div>
}