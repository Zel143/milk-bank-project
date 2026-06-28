import { useEffect, useRef, useState } from 'react'
import { Plus, X, Info } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { formatDate, activeProgramToDb } from '../../exportUtils'
import { useProgramFilter } from '../../../lib/programContext'
import { usePagination } from '../../hooks/usePagination'
import { Pagination } from '../shared/Pagination'
import { motion, AnimatePresence } from 'motion/react'

type Profile = { id: string; full_name: string; role: string }
type LabResult = { stage: string; result: string }
type BatchCollection = { collections: { donors: { dtn: string } | null } }
type Batch = { id: string; batch_number: string | null; total_volume_ml: number; program?: string; batch_collections?: BatchCollection[] }
type Row = { id: string; pasteurized_at: string; temperature_c: number; duration_minutes: number; batches?: (Batch & { lab_results?: LabResult[] }) | null; profiles?: { full_name: string } | null }

export function PasteurizationScreen() {
  const [rows, setRows] = useState<Row[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const activeProgram = useProgramFilter()
  const { page, pageSize, total, totalPages, from, to, setPage, setTotal, resetPage, handlePageSizeChange } = usePagination()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    resetPage()
  }, [activeProgram])

  useEffect(() => { void load() }, [page, pageSize, activeProgram])

  async function load(): Promise<void> {
    const dbProgram = activeProgramToDb(activeProgram)
    let eligibleQuery = supabase
      .from('batches')
      .select('id,batch_number,total_volume_ml,program,batch_collections(collections(donors(dtn)))')
      .eq('status', 'pre_test_passed')
    if (dbProgram) eligibleQuery = eligibleQuery.eq('program', dbProgram)

    let recsQuery = supabase
      .from('pasteurization_records')
      .select('id,pasteurized_at,temperature_c,duration_minutes,batches(id,batch_number,total_volume_ml,program,lab_results(stage,result)),profiles(full_name)', { count: 'exact' })
      .order('pasteurized_at', { ascending: false })
      .range(from, to)
    if (dbProgram) recsQuery = recsQuery.eq('batches.program', dbProgram)

    const [{ data: recs, count }, { data: eligible }, { data: staff }] = await Promise.all([
      recsQuery,
      eligibleQuery,
      supabase.from('profiles').select('id,full_name,role').in('role', ['admin', 'staff']).order('full_name')
    ])

    setRows((recs ?? []) as Row[])
    setTotal(count ?? 0)
    setBatches((eligible ?? []) as Batch[])
    setProfiles((staff ?? []) as Profile[])
  }

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSaving(true)
    const form = new FormData(event.currentTarget)
    const batchId = String(form.get('batch_id'))

    const { error } = await supabase.from('pasteurization_records').insert({
      batch_id: batchId,
      performed_by: String(form.get('performed_by')),
      temperature_c: Number(form.get('temperature_c')),
      duration_minutes: Number(form.get('duration_minutes')),
      pasteurized_at: String(form.get('pasteurized_at')) || new Date().toISOString(),
    })

    if (!error) {
      // Advance batch from pre_test_passed -> pasteurized
      await supabase.from('batches').update({ status: 'pasteurized' }).eq('id', batchId)
    } else {
      console.error('Pasteurization insert error:', error)
    }

    setSaving(false)
    setOpen(false)
    await load()
  }

  function getBatchDtns(b: Batch) {
    if (!b.batch_collections || b.batch_collections.length === 0) return 'N/A'
    const dtns = b.batch_collections.map(bc => bc.collections?.donors?.dtn).filter(Boolean)
    return Array.from(new Set(dtns)).join(', ')
  }

  function getPostTestStatus(batch?: (Batch & { lab_results?: LabResult[] }) | null) {
    if (!batch?.lab_results) return 'pending'
    const postTest = batch.lab_results.find(lr => lr.stage === 'post_pasteurization')
    return postTest ? postTest.result : 'pending'
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        crumbs={[{ label: 'Milk Lifecycle' }, { label: 'Pasteurization' }]} 
        title="Pasteurization" 
        subtitle="Record Holder pasteurization runs and advance batch status to PASTEURIZED" 
        actions={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm transition-all hover:opacity-90" style={{ background: '#f472b6' }}>
            <Plus className="w-4 h-4" />Log Pasteurization
          </button>
        } 
      />

      {/* Info Banner */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
        <Info className="w-5 h-5 text-blue-500" />
        <p className="text-sm text-blue-900">
          Only batches that have passed pre-pasteurization testing (<StatusBadge value="PRE_TEST_PASSED" short />) are eligible and shown in the batch selector.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50/50">
            <tr className="border-b border-zinc-100">
              {['Batch Number','Operator','Temperature (°C)','Duration (min)','Date','Post-Test Status'].map((h) => (
                <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-pink-400">{row.batches?.batch_number}</td>
                <td className="px-6 py-4 text-sm text-zinc-900 font-medium">{row.profiles?.full_name || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-zinc-900 font-medium">{row.temperature_c}°C</td>
                <td className="px-6 py-4 text-sm text-zinc-900 font-medium">{row.duration_minutes} min</td>
                <td className="px-6 py-4 text-sm text-zinc-600 font-mono">{formatDate(row.pasteurized_at)}</td>
                <td className="px-6 py-4">
                  <StatusBadge value={getPostTestStatus(row.batches)} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-zinc-400">No pasteurization records found</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={handlePageSizeChange} />
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-white z-50 flex flex-col shadow-2xl border-l border-zinc-100"
            >
              <form onSubmit={save} className="flex flex-col h-full">
                <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">Log Pasteurization</h2>
                  <button type="button" onClick={() => setOpen(false)} className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6 hide-scrollbar space-y-6">
                  
                  {/* Alert Banner */}
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900">
                      Only batches with status <strong>PRE_TEST_PASSED</strong> are eligible for pasteurization.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-700">Batch Number <span className="text-pink-400">*</span></label>
                    <select name="batch_id" required className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all text-zinc-700 appearance-none">
                      <option value="">Select batch...</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>{b.batch_number} ({b.total_volume_ml}mL, {getBatchDtns(b)})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-700">Operator <span className="text-pink-400">*</span></label>
                    <select name="performed_by" required className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all text-zinc-700 appearance-none">
                      <option value="">Select operator...</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-700">Temperature (°C) <span className="text-pink-400">*</span></label>
                      <input name="temperature_c" type="number" step="0.1" defaultValue="62.5" required className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm font-mono outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all" />
                      <p className="text-xs text-zinc-400 mt-1.5">Standard: 62.5°C</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-700">Duration (min) <span className="text-pink-400">*</span></label>
                      <input name="duration_minutes" type="number" defaultValue="30" required className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm font-mono outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all" />
                      <p className="text-xs text-zinc-400 mt-1.5">Standard: 30 min</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-700">Date</label>
                    <input name="pasteurized_at" type="date" required className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all text-zinc-500" />
                  </div>

                </div>

                <div className="px-8 py-5 border-t border-zinc-100 bg-white flex justify-end gap-3 items-center">
                  <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button disabled={saving} className="px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: '#f472b6' }}>
                    {saving ? 'Saving...' : 'Log Pasteurization'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}