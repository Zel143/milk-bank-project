import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { formatDate, toTitle } from '../../exportUtils'

type Batch = { id: string; batch_number: string | null; status: string }
type Lab = { id: string; stage: string; result: string; sample_volume_ml: number; sent_to_lab_at: string; expected_result_at: string; result_received_at: string | null; batches?: Batch | null }

export function LabTestingScreen() {
  const [rows, setRows] = useState<Lab[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [open, setOpen] = useState(false)
  async function load(): Promise<void> {
    const [{ data: labs }, { data: batchRows }] = await Promise.all([
      supabase.from('lab_results').select('id,stage,result,sample_volume_ml,sent_to_lab_at,expected_result_at,result_received_at,batches(id,batch_number,status)').order('sent_to_lab_at', { ascending: false }),
      supabase.from('batches').select('id,batch_number,status').in('status', ['raw','pre_testing','pasteurized','post_testing']).order('created_at', { ascending: false }),
    ])
    setRows((labs ?? []) as Lab[]); setBatches((batchRows ?? []) as Batch[])
  }
  useEffect(() => { void load() }, [])
  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); const form = new FormData(event.currentTarget); const result = String(form.get('result'))
    await supabase.from('lab_results').insert({ batch_id: String(form.get('batch_id')), stage: String(form.get('stage')), result, sample_volume_ml: Number(form.get('sample_volume_ml') || 5), sent_to_lab_at: String(form.get('sent_to_lab_at')) || new Date().toISOString(), result_received_at: result === 'pending' ? null : new Date().toISOString() })
    setOpen(false); await load()
  }
  return <div><PageHeader crumbs={[{ label: 'Milk Lifecycle' }]} title="Laboratory Testing" subtitle="Supabase-backed lab results and status transitions" actions={<button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg" style={{ background: '#eea4bb' }}><Plus className="w-4 h-4" />Log Result</button>} />
    <div className="bg-white rounded-2xl border overflow-x-auto"><table className="w-full"><thead><tr>{['Batch','Stage','Sample','Sent','Expected','Result'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs text-[#6B7280]">{h}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="px-4 py-3 text-xs text-[#eea4bb]">{row.batches?.batch_number}</td><td className="px-4 py-3 text-sm">{toTitle(row.stage)}</td><td className="px-4 py-3 text-sm">{row.sample_volume_ml}</td><td className="px-4 py-3 text-sm">{formatDate(row.sent_to_lab_at)}</td><td className="px-4 py-3 text-sm">{formatDate(row.expected_result_at)}</td><td className="px-4 py-3"><StatusBadge value={toTitle(row.result)} /></td></tr>)}</tbody></table></div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><form onSubmit={save} className="w-full max-w-md bg-white rounded-xl p-6 space-y-4"><div className="flex justify-between"><h2 className="font-semibold">Log Lab Result</h2><button type="button" onClick={() => setOpen(false)}><X className="w-4 h-4" /></button></div><select name="batch_id" required className="w-full border rounded-lg px-3 py-2">{batches.map((b) => <option key={b.id} value={b.id}>{b.batch_number} - {b.status}</option>)}</select><select name="stage" className="w-full border rounded-lg px-3 py-2"><option value="pre_pasteurization">Pre Pasteurization</option><option value="post_pasteurization">Post Pasteurization</option></select><select name="result" className="w-full border rounded-lg px-3 py-2"><option value="pending">Pending</option><option value="passed">Passed</option><option value="failed">Failed</option></select><input name="sample_volume_ml" type="number" step="0.1" max="5" defaultValue="5" className="w-full border rounded-lg px-3 py-2" /><input name="sent_to_lab_at" type="datetime-local" className="w-full border rounded-lg px-3 py-2" /><button className="w-full rounded-lg py-2 text-white" style={{ background: '#eea4bb' }}>Save Result</button></form></div>}
  </div>
}