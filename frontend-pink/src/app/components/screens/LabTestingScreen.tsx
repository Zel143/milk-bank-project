import { useEffect, useRef, useState, useMemo } from 'react'
import { Plus, X } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { formatDate, toTitle, activeProgramToDb } from '../../exportUtils'
import { useProgramFilter } from '../../../lib/programContext'
import { usePagination } from '../../hooks/usePagination'
import { Pagination } from '../shared/Pagination'
import { motion, AnimatePresence } from 'motion/react'

type BatchCollection = { collections: { ctn: string; donors: { dtn: string } | null } }
type Batch = { id: string; batch_number: string | null; status: string; program?: string; batch_collections?: BatchCollection[] }
type Lab = {
  id: string
  stage: string
  result: string
  sample_volume_ml: number
  sent_to_lab_at: string
  expected_result_at: string
  result_received_at: string | null
  recorded_by_name: string | null
  batches?: Batch | null
}

export function LabTestingScreen() {
  const [rows, setRows] = useState<Lab[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'pre_pasteurization' | 'post_pasteurization'>('pre_pasteurization')

  const [testType, setTestType] = useState<'pre_pasteurization' | 'post_pasteurization'>('pre_pasteurization')
  const [testResult, setTestResult] = useState<'passed' | 'failed' | null>(null)

  const activeProgram = useProgramFilter()
  const { page, pageSize, total, totalPages, from, to, setPage, setTotal, resetPage, handlePageSizeChange } = usePagination()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    resetPage()
  }, [activeProgram, activeTab])

  useEffect(() => { void load() }, [page, pageSize, activeProgram, activeTab])

  async function load(): Promise<void> {
    const dbProgram = activeProgramToDb(activeProgram)
    let batchesQuery = supabase
      .from('batches')
      .select('id,batch_number,status,program')
      .in('status', ['raw', 'pre_testing', 'pasteurized', 'post_testing'])
      .order('created_at', { ascending: false })
    if (dbProgram) batchesQuery = batchesQuery.eq('program', dbProgram)

    let labsQuery = supabase
      .from('lab_results')
      .select('id,stage,result,sample_volume_ml,sent_to_lab_at,expected_result_at,result_received_at,recorded_by_name,batches(id,batch_number,status,program,batch_collections(collections(ctn,donors(dtn))))', { count: 'exact' })
      .eq('stage', activeTab)
      .order('sent_to_lab_at', { ascending: false })
      .range(from, to)
    if (dbProgram) labsQuery = labsQuery.eq('batches.program', dbProgram)

    const [{ data: labs, count }, { data: batchRows }] = await Promise.all([labsQuery, batchesQuery])
    setRows((labs ?? []) as Lab[])
    setTotal(count ?? 0)
    setBatches((batchRows ?? []) as Batch[])
  }

  const filteredRows = useMemo(() => rows, [rows])

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!testResult) {
      alert('Please select a Pass or Fail result.')
      return
    }

    setSaving(true)
    const form = new FormData(event.currentTarget)
    const batchId = String(form.get('batch_id'))

    const sentAt = new Date().toISOString()
    // expected_result_at is NOT NULL in the schema - must always be provided (14-day turnaround)
    const expectedAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const resultReceivedAt = String(form.get('result_received_at'))
    const testedBy = String(form.get('tested_by') ?? '').trim()

    const { error: insertError } = await supabase.from('lab_results').insert({
      batch_id: batchId,
      stage: testType,
      result: testResult,
      sample_volume_ml: 5,
      sent_to_lab_at: sentAt,
      expected_result_at: expectedAt,
      result_received_at: resultReceivedAt || sentAt,
      recorded_by_name: testedBy || null,
    })

    if (insertError) {
      console.error('Lab result insert error:', insertError)
      setSaving(false)
      return
    }

    // Advance batch status based on result + stage
    let newStatus: string | null = null
    if (testType === 'pre_pasteurization') {
      newStatus = testResult === 'passed' ? 'pre_test_passed' : 'discarded'
    } else {
      newStatus = testResult === 'passed' ? 'ready' : 'discarded'
    }

    if (newStatus) {
      await supabase.from('batches').update({ status: newStatus }).eq('id', batchId)
    }

    if (testType === 'post_pasteurization' && testResult === 'passed') {
      const { data: batchData } = await supabase.from('batches').select('total_volume_ml').eq('id', batchId).single()
      const { data: existingBottles } = await supabase.from('bottles').select('id').eq('batch_id', batchId)
      if (!existingBottles || existingBottles.length === 0) {
        await supabase.from('bottles').insert({
          batch_id: batchId,
          volume_ml: batchData?.total_volume_ml ?? 0,
          remaining_volume_ml: batchData?.total_volume_ml ?? 0,
          status: 'available',
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
    }

    setSaving(false)
    setOpen(false)
    setTestResult(null)
    setTestType('pre_pasteurization')
    await load()
  }

  function calculateDaysElapsed(sentAt: string) {
    if (!sentAt) return '0d'
    const diff = Math.floor((Date.now() - new Date(sentAt).getTime()) / (1000 * 60 * 60 * 24))
    return `${Math.max(0, diff)}d`
  }

  function getBatchAllCtns(b?: Batch | null) {
    if (!b?.batch_collections?.length) return 'N/A'
    return b.batch_collections.map(bc => bc.collections?.ctn).filter(Boolean).join(', ')
  }

  function getBatchAllDtns(b?: Batch | null) {
    if (!b?.batch_collections?.length) return 'N/A'
    const dtns = b.batch_collections.map(bc => bc.collections?.donors?.dtn).filter(Boolean)
    return Array.from(new Set(dtns)).join(', ')
  }

  function getTesterName(name: string | null) {
    return name ?? 'N/A'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Milk Lifecycle' }]}
        title="Laboratory Testing"
        subtitle="Log pre- and post-pasteurization lab results and advance batch status"
        actions={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-colors hover:opacity-90 shadow-sm" style={{ background: '#f472b6' }}>
            <Plus className="w-4 h-4" aria-hidden="true" />Log Result
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
        <div className="flex px-6 pt-4 border-b border-zinc-100 gap-8">
          <button
            onClick={() => setActiveTab('pre_pasteurization')}
            className={`pb-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'pre_pasteurization' ? 'border-pink-300 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
          >
            Pre-Pasteurization Tests
          </button>
          <button
            onClick={() => setActiveTab('post_pasteurization')}
            className={`pb-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'post_pasteurization' ? 'border-pink-300 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
          >
            Post-Pasteurization Tests
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50/50">
              <tr className="border-b border-zinc-100">
                {['Batch Number', 'CTN', 'DTN', 'Sample (mL)', 'Date Sent', 'Expected', 'Days Elapsed', 'Result', 'Tested By'].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-pink-400">{row.batches?.batch_number}</td>
                  <td className="px-6 py-4 text-sm font-mono text-zinc-500 max-w-[150px] truncate" title={getBatchAllCtns(row.batches)}>{getBatchAllCtns(row.batches)}</td>
                  <td className="px-6 py-4 text-sm font-mono text-zinc-500 max-w-[150px] truncate" title={getBatchAllDtns(row.batches)}>{getBatchAllDtns(row.batches)}</td>
                  <td className="px-6 py-4 text-sm text-zinc-900 font-medium tabular-nums">{row.sample_volume_ml}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{formatDate(row.sent_to_lab_at)}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{formatDate(row.expected_result_at)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900 tabular-nums">{calculateDaysElapsed(row.sent_to_lab_at)}</td>
                  <td className="px-6 py-4"><StatusBadge value={toTitle(row.result)} /></td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{getTesterName(row.recorded_by_name)}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-sm text-zinc-400">No lab results found</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={handlePageSizeChange} />
        </div>
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
              role="dialog"
              aria-modal="true"
              aria-label="Log Lab Result"
            >
              <form onSubmit={save} className="flex flex-col h-full">
                <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">Log Lab Result</h2>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close drawer" className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full transition-colors">
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6 hide-scrollbar space-y-8">

                  <div className="space-y-2">
                    <label htmlFor="lab-batch" className="text-sm font-medium text-zinc-700">Batch Number <span className="text-pink-400">*</span></label>
                    <select id="lab-batch" name="batch_id" required className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-3 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-700 appearance-none">
                      <option value="">Select batch…</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>{b.batch_number} ({toTitle(b.status)})</option>
                      ))}
                    </select>
                  </div>

                  <fieldset className="space-y-3">
                    <legend className="text-sm font-medium text-zinc-700">Test Type</legend>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${testType === 'pre_pasteurization' ? 'border-pink-400 bg-pink-400' : 'border-zinc-300 group-hover:border-pink-300'}`}>
                          {testType === 'pre_pasteurization' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span className="text-sm text-zinc-700">Pre-Pasteurization</span>
                        <input type="radio" name="stage" value="pre_pasteurization" className="sr-only" checked={testType === 'pre_pasteurization'} onChange={() => setTestType('pre_pasteurization')} />
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${testType === 'post_pasteurization' ? 'border-pink-400 bg-pink-400' : 'border-zinc-300 group-hover:border-pink-300'}`}>
                          {testType === 'post_pasteurization' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span className="text-sm text-zinc-700">Post-Pasteurization</span>
                        <input type="radio" name="stage" value="post_pasteurization" className="sr-only" checked={testType === 'post_pasteurization'} onChange={() => setTestType('post_pasteurization')} />
                      </label>
                    </div>
                  </fieldset>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-zinc-700">Result <span className="text-pink-400">*</span></p>
                    <div className="flex gap-4" role="group" aria-label="Test result">
                      <button
                        type="button"
                        onClick={() => setTestResult('passed')}
                        aria-pressed={testResult === 'passed'}
                        className={`flex-1 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all border ${testResult === 'passed' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'}`}
                      >
                        PASS
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestResult('failed')}
                        aria-pressed={testResult === 'failed'}
                        className={`flex-1 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all border ${testResult === 'failed' ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'}`}
                      >
                        FAIL
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="lab-result-date" className="text-sm font-medium text-zinc-700">Result Date <span className="text-pink-400">*</span></label>
                      <input id="lab-result-date" name="result_received_at" required type="date" className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-3 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-500" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="lab-tested-by" className="text-sm font-medium text-zinc-700">Tested By</label>
                      <input id="lab-tested-by" name="tested_by" placeholder="e.g., Juan Dela Cruz, M.T." maxLength={100} className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-3 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400" />
                    </div>
                  </div>

                </div>

                <div className="px-8 py-5 border-t border-zinc-100 bg-white flex justify-end gap-3 items-center">
                  <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button disabled={saving} className="px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: '#f472b6' }}>
                    {saving ? 'Saving…' : 'Log Result'}
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
