import { useEffect, useRef, useState } from 'react'
import { Plus, X, Clock } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { formatDate, toTitle } from '../../exportUtils'
import { motion, AnimatePresence } from 'motion/react'
import { usePagination } from '../../hooks/usePagination'
import { Pagination } from '../shared/Pagination'

type Beneficiary = { id: string; guardian_name: string; baby_name: string; nicu_eligible: boolean }
type Inquiry = { id: string; inquiry_type: string; status: string; requested_at: string; nicu_confirmed: boolean; notes: string | null; beneficiaries?: Beneficiary | null }

export function InquiryWaitingListScreen() {
  const [rows, setRows] = useState<Inquiry[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [waitingCount, setWaitingCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [activeTab, setActiveTab] = useState<'active' | 'waiting'>('active')
  const { page, pageSize, total, totalPages, from, to, setPage, setTotal, resetPage, handlePageSizeChange } = usePagination()
  const isFirstRender = useRef(true)

  // Form state
  const [inquiryType, setInquiryType] = useState<'walk_in' | 'hotline_call'>('walk_in')
  const [nicuConfirmed, setNicuConfirmed] = useState(false)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    resetPage()
  }, [activeTab])

  useEffect(() => { void load() }, [page, pageSize, activeTab])

  async function load(): Promise<void> {
    let inqQuery = supabase
      .from('inquiries')
      .select('id,inquiry_type,status,requested_at,nicu_confirmed,notes,beneficiaries(id,guardian_name,baby_name,nicu_eligible)', { count: 'exact' })
      .order('requested_at', { ascending: false })
      .range(from, to)

    if (activeTab === 'active') {
      inqQuery = inqQuery.neq('status', 'waiting')
    } else {
      inqQuery = inqQuery.eq('status', 'waiting')
    }

    const [{ data: inq, count }, { data: bens }, { count: wCount }] = await Promise.all([
      inqQuery,
      supabase.from('beneficiaries').select('id,guardian_name,baby_name,nicu_eligible').order('guardian_name'),
      supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
    ])

    setRows((inq ?? []) as Inquiry[])
    setTotal(count ?? 0)
    setBeneficiaries((bens ?? []) as Beneficiary[])
    setWaitingCount(wCount ?? 0)
  }

  const displayedRows = rows

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> { 
    event.preventDefault()
    if (!nicuConfirmed) {
      alert('You must confirm NICU admission.')
      return
    }
    
    setSaving(true)
    const form = new FormData(event.currentTarget)
    
    await supabase.from('inquiries').insert({ 
      beneficiary_id: String(form.get('beneficiary_id')), 
      inquiry_type: inquiryType, 
      status: 'waiting', 
      nicu_confirmed: nicuConfirmed, 
      notes: String(form.get('notes') ?? '') 
    })
    
    setSaving(false)
    setOpen(false)
    setNicuConfirmed(false)
    setInquiryType('walk_in')
    await load() 
  }

  function calculateDaysWaiting(requestedAt: string) {
    if (!requestedAt) return '0d'
    const start = new Date(requestedAt).getTime()
    const now = new Date().getTime()
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24))
    return `${Math.max(0, diff)}d`
  }
  
  return (
    <div className="space-y-6">
      <PageHeader 
        crumbs={[{ label: 'Recipients' }, { label: 'Inquiry & Waiting List' }]} 
        title="Inquiry & Waiting List" 
        subtitle="Log availability inquiries and manage the NICU priority waiting list" 
        actions={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm transition-all hover:opacity-90" style={{ background: '#f472b6' }}>
            <Plus className="w-4 h-4" />Log Inquiry
          </button>
        } 
      />

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex px-6 pt-4 border-b border-zinc-100 gap-8">
          <button 
            onClick={() => setActiveTab('active')}
            className={`pb-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'active' ? 'border-pink-300 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
          >
            Active Inquiries
          </button>
          <button 
            onClick={() => setActiveTab('waiting')}
            className={`pb-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'waiting' ? 'border-pink-300 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
          >
            Waiting List
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'waiting' ? 'bg-pink-100 text-pink-600' : 'bg-zinc-100 text-zinc-500'}`}>
              {waitingCount}
            </span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50/50">
              <tr className="border-b border-zinc-100">
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Baby Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">NICU</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Days Waiting</th>
                {activeTab === 'active' && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                )}
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {displayedRows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-zinc-900 font-medium">{row.beneficiaries?.guardian_name}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{row.beneficiaries?.baby_name}</td>
                  <td className="px-6 py-4">
                    <StatusBadge value={row.nicu_confirmed ? 'NICU' : 'Non-NICU'} />
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{row.inquiry_type === 'walk_in' ? 'Walk-in' : 'Hotline Call'}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600 font-mono">{formatDate(row.requested_at)}</td>
                  <td className="px-6 py-4 text-sm text-zinc-900 font-medium flex items-center gap-1.5 mt-2.5">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    {calculateDaysWaiting(row.requested_at)}
                  </td>
                  {activeTab === 'active' && (
                    <td className="px-6 py-4">
                      <StatusBadge value={toTitle(row.status)} />
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-zinc-500 truncate max-w-xs" title={row.notes || ''}>
                    {row.notes || '-'}
                  </td>
                </tr>
              ))}
              {displayedRows.length === 0 && (
                <tr><td colSpan={activeTab === 'active' ? 8 : 7} className="px-6 py-8 text-center text-sm text-zinc-400">No records found in this view.</td></tr>
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
            >
              <form onSubmit={save} className="flex flex-col h-full">
                <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">Log Inquiry</h2>
                  <button type="button" onClick={() => setOpen(false)} className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6 hide-scrollbar space-y-6">
                  
                  {/* Inquiry Type Radio */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-zinc-700">Inquiry Type <span className="text-pink-400">*</span></label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${inquiryType === 'walk_in' ? 'border-zinc-800 bg-zinc-800' : 'border-zinc-300 group-hover:border-zinc-400'}`}>
                          {inquiryType === 'walk_in' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span className="text-sm text-zinc-700 font-medium">Walk-in</span>
                        <input type="radio" name="inquiry_type" value="walk_in" className="hidden" checked={inquiryType === 'walk_in'} onChange={() => setInquiryType('walk_in')} />
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${inquiryType === 'hotline_call' ? 'border-zinc-800 bg-zinc-800' : 'border-zinc-300 group-hover:border-zinc-400'}`}>
                          {inquiryType === 'hotline_call' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span className="text-sm text-zinc-700 font-medium">Hotline Call</span>
                        <input type="radio" name="inquiry_type" value="hotline_call" className="hidden" checked={inquiryType === 'hotline_call'} onChange={() => setInquiryType('hotline_call')} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-700">Recipient <span className="text-pink-400">*</span></label>
                    <select name="beneficiary_id" required className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all text-zinc-700 appearance-none">
                      <option value="">Select recipient...</option>
                      {beneficiaries.map((b) => (
                        <option key={b.id} value={b.id}>{b.guardian_name} - {b.baby_name}{b.nicu_eligible ? ' (NICU)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  {/* Confirmation Checkbox */}
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 cursor-pointer group hover:border-zinc-300 transition-colors">
                    <div className="shrink-0 mt-0.5">
                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${nicuConfirmed ? 'bg-zinc-800 border-zinc-800' : 'border border-zinc-300 bg-white group-hover:border-zinc-400'}`}>
                        {nicuConfirmed && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                      </div>
                      <input 
                        type="checkbox" 
                        required 
                        className="hidden" 
                        checked={nicuConfirmed} 
                        onChange={(e) => setNicuConfirmed(e.target.checked)} 
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 leading-snug">I confirm this baby is currently admitted to the <strong className="font-bold">NICU</strong>.</p>
                      <p className="text-xs text-zinc-500 mt-1">Required — only NICU babies are eligible for milk from this bank.</p>
                    </div>
                  </label>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-700">Notes</label>
                    <textarea
                      name="notes"
                      rows={4}
                      placeholder="Additional notes about the inquiry..."
                      maxLength={500}
                      className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all placeholder:text-zinc-400 resize-none"
                    />
                  </div>

                </div>

                <div className="px-8 py-5 border-t border-zinc-100 bg-white flex justify-end gap-3 items-center">
                  <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button disabled={saving} className="px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: '#f472b6' }}>
                    {saving ? 'Saving...' : 'Log Inquiry'}
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