import { useEffect, useState, useMemo } from 'react'
import { Plus, Search, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, X } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { supabase } from '../../../lib/supabase'
import { formatDate } from '../../exportUtils'
import type { AppUser } from '../../types'
import { motion, AnimatePresence } from 'motion/react'
import { usePagination } from '../../hooks/usePagination'
import { Pagination } from '../shared/Pagination'

type Beneficiary = { id: string; guardian_name: string; baby_name: string; hospital: string | null; nicu_eligible: boolean; age_of_baby_days: number | null; contact_number: string | null }
type Bottle = { id: string; bottle_number: string | null; remaining_volume_ml: number; batches?: { batch_number: string | null } | null }
type Dispense = { id: string; volume_ml: number; total_fee: number; dispensed_at: string | null; beneficiaries?: Beneficiary | null }

const FEE_PER_ML = 2.00;

export function DispensingScreen({ user }: { user: AppUser }) {
  const [rows, setRows] = useState<Dispense[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [bottles, setBottles] = useState<Bottle[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { page, pageSize, total, totalPages, from, to, setPage, setTotal, handlePageSizeChange } = usePagination()
  
  // Wizard State
  const [step, setStep] = useState(1)
  
  // Step 1: Find Recipient
  const [searchRec, setSearchRec] = useState('')
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null)
  
  // Step 2: Verify Requirements
  const [reqId, setReqId] = useState(false)
  const [reqReferral, setReqReferral] = useState(false)
  const [reqBalance, setReqBalance] = useState(false)
  const [reqDeposit, setReqDeposit] = useState(false)
  
  // Step 3: Select Batch
  const [selectedBottleId, setSelectedBottleId] = useState<string | null>(null)
  const [dispenseVolume, setDispenseVolume] = useState<string>('')
  
  // Computations
  const selectedRecipient = useMemo(() => beneficiaries.find(b => b.id === selectedRecipientId), [beneficiaries, selectedRecipientId])
  const selectedBottle = useMemo(() => bottles.find(b => b.id === selectedBottleId), [bottles, selectedBottleId])
  const requirementsMet = reqId && reqReferral && reqBalance && reqDeposit && (selectedRecipient?.nicu_eligible ?? false)
  const totalFee = Number(dispenseVolume || 0) * FEE_PER_ML

  const filteredRecipients = useMemo(() => beneficiaries.filter(r => 
    [r.guardian_name, r.baby_name].join(' ').toLowerCase().includes(searchRec.toLowerCase())
  ), [beneficiaries, searchRec])

  async function load(): Promise<void> {
    const [{ data: disp, count }, { data: bens }, { data: bots }] = await Promise.all([
      supabase.from('dispensing_records').select('id,volume_ml,total_fee,dispensed_at,beneficiaries(id,guardian_name,baby_name,nicu_eligible)', { count: 'exact' }).order('dispensed_at', { ascending: false }).range(from, to),
      supabase.from('beneficiaries').select('id,guardian_name,baby_name,hospital,nicu_eligible,age_of_baby_days,contact_number').eq('nicu_eligible', true).order('guardian_name'),
      supabase.from('bottles').select('id,bottle_number,remaining_volume_ml,batches(batch_number)').eq('status', 'available').gt('remaining_volume_ml', 0).order('bottle_number')
    ])
    setRows((disp ?? []) as Dispense[])
    setTotal(count ?? 0)
    setBeneficiaries((bens ?? []) as Beneficiary[])
    setBottles((bots ?? []) as Bottle[])
  }

  useEffect(() => { void load() }, [page, pageSize])

  function resetForm() {
    setStep(1)
    setSelectedRecipientId(null)
    setSearchRec('')
    setReqId(false)
    setReqReferral(false)
    setReqBalance(false)
    setReqDeposit(false)
    setSelectedBottleId(null)
    setDispenseVolume('')
  }

  async function handleDisperse(): Promise<void> {
    if (!selectedRecipient || !selectedBottle || !dispenseVolume) return
    setSaving(true)
    const volume = Number(dispenseVolume)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    const { data } = await supabase.from('dispensing_records').insert({
      beneficiary_id: selectedRecipient.id,
      status: 'confirmed',
      volume_ml: volume,
      fee_per_ml: FEE_PER_ML,
      bottle_deposit_amount: 0,
      deposit_paid: reqDeposit,
      clinical_abstract_verified: reqReferral,
      prescription_verified: true,
      cooler_with_ice_verified: true,
      dispensed_by: authUser?.id ?? null,
      dispensed_at: now,
    }).select('id').single()
    
    if (data && selectedBottle) { 
      await supabase.from('dispensing_items').insert({ 
        dispensing_record_id: data.id, 
        bottle_id: selectedBottle.id, 
        volume_ml: volume 
      })
      await supabase.from('bottles').update({ 
        remaining_volume_ml: Math.max(0, selectedBottle.remaining_volume_ml - volume), 
        status: selectedBottle.remaining_volume_ml - volume <= 0 ? 'dispensed' : 'available' 
      }).eq('id', selectedBottle.id) 
    } 
    setSaving(false)
    setOpen(false)
    resetForm()
    await load() 
  }

  function formatAob(days: number | null) {
    if (!days) return 'N/A'
    return `${Math.floor(days / 7)} weeks`
  }

  const steps = [
    { num: 1, label: 'Find Recipient' },
    { num: 2, label: 'Verify Requirements' },
    { num: 3, label: 'Select Batch' },
    { num: 4, label: 'Fee Summary' },
    { num: 5, label: 'Confirm & Dispense' }
  ]

  function renderTimeline() {
    return (
      <div className="flex items-center justify-between w-full relative mb-8 pt-2">
        <div className="absolute top-4 left-6 right-6 h-[2px] bg-zinc-100 -z-10" />
        {steps.map((s) => (
          <div key={s.num} className="flex flex-col items-center gap-2 relative bg-white px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              step === s.num ? 'bg-pink-300 text-white shadow-sm' : 
              step > s.num ? 'bg-emerald-500 text-white' : 
              'bg-zinc-100 text-zinc-400'
            }`}>
              {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
            </div>
            <span className={`text-[11px] font-medium uppercase tracking-wider ${step >= s.num ? 'text-zinc-900' : 'text-zinc-400'}`}>
              {s.label}
            </span>
          </div>
        ))}
        <div className="absolute top-4 left-6 h-[2px] bg-pink-300 -z-10 transition-all duration-300" style={{ width: `calc(${(step - 1) * 25}% - 12px)` }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        crumbs={[{ label: 'Operations' }, { label: 'Dispensing' }]} 
        title="Dispensing" 
        subtitle="Process milk release to NICU-priority recipients with full eligibility verification" 
        actions={
          <button onClick={() => { resetForm(); setOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm transition-all hover:opacity-90" style={{ background: '#f472b6' }}>
            New Dispensing
          </button>
        } 
      />

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900">Dispensing Log</h3>
          <p className="text-sm text-zinc-500">Complete history of milk disbursements</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50/50">
              <tr className="border-b border-zinc-100">
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Baby Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Batch / DTN</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Volume (mL)</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Fee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Dispensed By</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-zinc-900 font-medium">{row.beneficiaries?.guardian_name}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{row.beneficiaries?.baby_name}</td>
                  <td className="px-6 py-4 text-sm text-pink-400 font-mono font-medium">Batch Info TBA</td>
                  <td className="px-6 py-4 text-sm text-zinc-900 font-bold">{row.volume_ml}</td>
                  <td className="px-6 py-4 text-sm text-zinc-900 font-mono">₱{row.total_fee.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600 font-mono">{formatDate(row.dispensed_at)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-zinc-400">No dispensing records yet.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={handlePageSizeChange} />
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="border-b border-zinc-100 px-6 py-4 flex justify-between items-center bg-white shrink-0">
                <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">New Dispensing</h2>
                <div className="flex items-center gap-4">
                  <div className="text-sm font-mono text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">Step {step} of 5</div>
                  <button type="button" onClick={() => setOpen(false)} className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-50/50">
                {renderTimeline()}

                <div className="mt-8 min-h-[350px]">
                  {/* Step 1: Find Recipient */}
                  {step === 1 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-xl mx-auto">
                      <p className="text-zinc-600 font-medium text-center">Search for the recipient to dispense milk to.</p>
                      
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input 
                          value={searchRec}
                          onChange={(e) => setSearchRec(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-white border border-zinc-200 rounded-xl text-base outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all placeholder:text-zinc-400 shadow-sm"
                          placeholder="Margarita Ramos..."
                          maxLength={100}
                          autoFocus
                        />
                      </div>

                      <div className="space-y-3 mt-4">
                        {filteredRecipients.map((rec) => (
                          <div 
                            key={rec.id}
                            onClick={() => setSelectedRecipientId(rec.id)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all bg-white ${
                              selectedRecipientId === rec.id ? 'border-pink-300 bg-pink-50/50 ring-2 ring-pink-100 shadow-sm' : 'border-zinc-200 hover:border-pink-200 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-zinc-900">{rec.guardian_name}</h4>
                                <p className="text-sm text-zinc-500 mt-1">{rec.baby_name} · {rec.hospital || 'No hospital specified'}</p>
                              </div>
                              <span className={`text-xs font-semibold px-2 py-1 rounded-md ${rec.nicu_eligible ? 'bg-pink-100 text-pink-600' : 'bg-zinc-100 text-zinc-500'}`}>
                                {rec.nicu_eligible ? 'NICU' : 'Non-NICU'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-100/60">
                              <span className="text-sm text-zinc-600">AOB: {formatAob(rec.age_of_baby_days)}</span>
                              <span className="text-sm font-mono text-zinc-600">{rec.contact_number || 'No contact'}</span>
                            </div>
                          </div>
                        ))}
                        {filteredRecipients.length === 0 && searchRec && (
                          <div className="text-center py-8 text-zinc-500 bg-white rounded-2xl border border-zinc-200">No NICU recipients found.</div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Verify Requirements */}
                  {step === 2 && selectedRecipient && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-xl mx-auto">
                      <p className="text-zinc-600 font-medium text-center">Verify dispensing requirements for <strong>{selectedRecipient.guardian_name}</strong>.</p>
                      
                      <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-sm bg-white divide-y divide-zinc-100">
                        
                        {/* Requirement 1: NICU admission */}
                        <div className={`p-4 flex items-center justify-between transition-colors ${selectedRecipient.nicu_eligible ? 'bg-emerald-50/30' : 'bg-red-50/30'}`}>
                          <div className="flex items-center gap-3">
                            {selectedRecipient.nicu_eligible ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
                            <span className="font-medium text-zinc-800">NICU admission verified</span>
                          </div>
                          {!selectedRecipient.nicu_eligible && <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">Not met</span>}
                        </div>

                        {/* Requirement 2: Guardian ID */}
                        <div onClick={() => setReqId(!reqId)} className={`p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors ${reqId ? 'bg-emerald-50/30' : 'bg-red-50/30'}`}>
                          <div className="flex items-center gap-3">
                            {reqId ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
                            <span className="font-medium text-zinc-800">Guardian ID presented</span>
                          </div>
                          {!reqId && <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded">Action required</span>}
                        </div>

                        {/* Requirement 3: Referral Letter */}
                        <div onClick={() => setReqReferral(!reqReferral)} className={`p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors ${reqReferral ? 'bg-emerald-50/30' : 'bg-red-50/30'}`}>
                          <div className="flex items-center gap-3">
                            {reqReferral ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
                            <span className="font-medium text-zinc-800">Referral letter from attending physician</span>
                          </div>
                          {!reqReferral && <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded">Action required</span>}
                        </div>

                        {/* Requirement 4: Previous balance */}
                        <div onClick={() => setReqBalance(!reqBalance)} className={`p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors ${reqBalance ? 'bg-emerald-50/30' : 'bg-red-50/50'}`}>
                          <div className="flex items-center gap-3">
                            {reqBalance ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
                            <span className="font-medium text-zinc-800">Previous balance cleared</span>
                          </div>
                          {!reqBalance && <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">Not met</span>}
                        </div>

                        {/* Requirement 5: Deposit ready */}
                        <div onClick={() => setReqDeposit(!reqDeposit)} className={`p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors ${reqDeposit ? 'bg-emerald-50/30' : 'bg-red-50/30'}`}>
                          <div className="flex items-center gap-3">
                            {reqDeposit ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
                            <span className="font-medium text-zinc-800">Deposit ready</span>
                          </div>
                          {!reqDeposit && <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded">Action required</span>}
                        </div>

                      </div>

                      <AnimatePresence>
                        {!requirementsMet && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            All requirements must be met before dispensing can proceed.
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {/* Step 3: Select Batch */}
                  {step === 3 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-xl mx-auto">
                      <p className="text-zinc-600 font-medium text-center">Select an available bottle and specify dispensing volume.</p>
                      
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 hide-scrollbar">
                        {bottles.map((bot) => (
                          <div 
                            key={bot.id}
                            onClick={() => setSelectedBottleId(bot.id)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center bg-white ${
                              selectedBottleId === bot.id ? 'border-pink-300 bg-pink-50/50 ring-2 ring-pink-100 shadow-sm' : 'border-zinc-200 hover:border-pink-200 hover:shadow-sm'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-3">
                                <h4 className="font-semibold text-zinc-900 font-mono">{bot.bottle_number}</h4>
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-md uppercase tracking-wider">Available</span>
                              </div>
                              <p className="text-sm text-zinc-500 mt-1 font-mono">Batch: {bot.batches?.batch_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-zinc-900 tracking-tight">{bot.remaining_volume_ml}<span className="text-sm font-medium text-zinc-500 ml-1">mL</span></p>
                              <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Remaining</p>
                            </div>
                          </div>
                        ))}
                        {bottles.length === 0 && (
                          <div className="text-center py-8 text-zinc-500 bg-white rounded-2xl border border-zinc-200 shadow-sm">No bottles currently available.</div>
                        )}
                      </div>

                      {selectedBottle && (
                        <div className="mt-6 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                          <label className="text-sm font-medium text-zinc-700">Dispensing Volume (mL)</label>
                          <input 
                            type="number"
                            min="1"
                            max={selectedBottle.remaining_volume_ml}
                            value={dispenseVolume}
                            onChange={(e) => setDispenseVolume(e.target.value)}
                            className="w-full mt-2 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 font-mono text-lg outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all shadow-inner"
                            placeholder={`Max: ${selectedBottle.remaining_volume_ml} mL`}
                          />
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Step 4: Fee Summary */}
                  {step === 4 && selectedBottle && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-md mx-auto">
                      <p className="text-zinc-600 font-medium text-center">Review dispensing fee details.</p>
                      
                      <div className="bg-white border border-zinc-200 shadow-sm rounded-3xl p-6 md:p-8 space-y-6">
                        
                        <div className="flex justify-between items-end border-b border-zinc-100 pb-6">
                          <div>
                            <p className="text-sm text-zinc-500 font-medium">Volume</p>
                            <p className="text-xl font-bold text-zinc-900 font-mono mt-1">{dispenseVolume} mL</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-zinc-500 font-medium">Rate</p>
                            <p className="text-xl font-bold text-zinc-900 font-mono mt-1">₱{FEE_PER_ML.toFixed(2)} <span className="text-sm text-zinc-400 font-medium">/ mL</span></p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center bg-pink-50/50 p-5 md:p-6 rounded-2xl border border-pink-100">
                          <h3 className="text-lg font-semibold text-pink-900">Total Fee</h3>
                          <p className="text-3xl font-bold text-pink-600 font-mono tracking-tight">₱{totalFee.toFixed(2)}</p>
                        </div>
                        
                        <p className="text-xs text-zinc-400 text-center uppercase tracking-wider font-semibold">Payment must be collected prior to dispensing.</p>

                      </div>
                    </motion.div>
                  )}

                  {/* Step 5: Confirm & Disperse */}
                  {step === 5 && selectedRecipient && selectedBottle && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-xl mx-auto">
                      
                      <div className="text-center space-y-2 mb-8">
                        <div className="w-16 h-16 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-900">Ready to Dispense</h2>
                        <p className="text-zinc-500">Please review the final details before confirming.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Recipient</p>
                          <p className="font-semibold text-zinc-900">{selectedRecipient.guardian_name}</p>
                          <p className="text-sm text-zinc-500">{selectedRecipient.baby_name}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Bottle / Batch</p>
                          <p className="font-semibold font-mono text-zinc-900">{selectedBottle.bottle_number}</p>
                          <p className="text-sm font-mono text-zinc-500">{selectedBottle.batches?.batch_number}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Volume</p>
                          <p className="text-xl font-bold font-mono text-zinc-900">{dispenseVolume} <span className="text-sm text-zinc-500">mL</span></p>
                        </div>
                        <div className="p-5 rounded-2xl border bg-pink-50/50 border-pink-100 shadow-sm">
                          <p className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-1">Total Fee</p>
                          <p className="text-xl font-bold font-mono text-pink-600">₱{totalFee.toFixed(2)}</p>
                        </div>
                      </div>

                    </motion.div>
                  )}

                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-zinc-100 p-5 bg-white shrink-0">
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => step === 1 ? setOpen(false) : setStep(step - 1)}
                    className="px-6 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors flex items-center gap-2"
                  >
                    {step === 1 ? 'Cancel' : <><ArrowLeft className="w-4 h-4" /> Back</>}
                  </button>
                  
                  {step < 5 ? (
                    <button 
                      disabled={(step === 1 && !selectedRecipientId) || (step === 2 && !requirementsMet) || (step === 3 && (!selectedBottleId || !dispenseVolume || Number(dispenseVolume) > (selectedBottle?.remaining_volume_ml ?? 0) || Number(dispenseVolume) <= 0))}
                      onClick={() => setStep(step + 1)}
                      className="px-8 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{ background: '#f472b6' }}
                    >
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      disabled={saving}
                      onClick={() => void handleDisperse()}
                      className="px-8 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{ background: '#f472b6' }}
                    >
                      {saving ? 'Processing...' : 'Confirm'} <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}