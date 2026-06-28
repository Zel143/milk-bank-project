import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, Search, X, Pencil, Trash2, AlertTriangle, ShieldOff } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { exportCsv, fromProgramLabel, toProgramLabel, toTitle, type ExportRow } from '../../exportUtils'
import { useProgramFilter } from '../../../lib/programContext'
import { motion, AnimatePresence } from 'motion/react'

type DonorRow = {
  id: string
  dtn: string | null
  full_name: string
  primary_program: string
  classification: string
  contact_number: string | null
  address: string
  screening_status: string
  date_of_birth: string | null
  occupation: string | null
  civil_status: string | null
  created_at: string
}

const CHECKLIST_ITEMS = [
  { id: 'tb', label: 'History of Tuberculosis (TB)' },
  { id: 'hepb', label: 'History of Hepatitis B' },
  { id: 'mastitis', label: 'History of Mastitis' },
  { id: 'syphilis', label: 'History of Syphilis' },
  { id: 'herpes', label: 'History of Herpes / STDs' },
  { id: 'blood', label: 'Blood transfusion in past 12 months' },
  { id: 'organ', label: 'Organ transplant history' },
  { id: 'alcohol', label: 'Alcohol use in past 24 hours' },
  { id: 'smoker', label: 'Active smoker' },
  { id: 'drugs', label: 'Illegal drug use' },
]

/** D4: Programs where health screening is bypassed (pre-screened externally) */
const BYPASS_PROGRAMS = ['milky_way', 'moms_act']

export function DonorManagementScreen() {
  const [rows, setRows] = useState<DonorRow[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'personal' | 'screening'>('personal')
  const [editRow, setEditRow] = useState<DonorRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DonorRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // D4: Track selected program to conditionally suppress screening tab
  const [selectedProgram, setSelectedProgram] = useState<string>('')
  // G2: Consent acknowledgment state
  const [consentAcknowledged, setConsentAcknowledged] = useState(false)

  const screeningBypassed = BYPASS_PROGRAMS.includes(fromProgramLabel(selectedProgram) ?? '')

  async function load(): Promise<void> {
    const { data } = await supabase
      .from('donors')
      .select('id,dtn,full_name,primary_program,classification,contact_number,address,screening_status,date_of_birth,occupation,civil_status,created_at')
      .order('created_at', { ascending: false })
    setRows((data ?? []) as DonorRow[])
  }

  useEffect(() => { void load() }, [])

  const activeProgram = useProgramFilter()

  const filtered = useMemo(
    () => rows.filter((row) => {
      const matchesSearch = [row.dtn, row.full_name, row.contact_number].join(' ').toLowerCase().includes(search.toLowerCase())
      const matchesProgram = activeProgram === 'All' || toProgramLabel(row.primary_program) === activeProgram
      return matchesSearch && matchesProgram
    }),
    [rows, search, activeProgram]
  )
  const exportRows: ExportRow[] = filtered.map((row) => ({
    DTN: row.dtn, Name: row.full_name, Program: toProgramLabel(row.primary_program),
    Classification: toTitle(row.classification), Contact: row.contact_number, Status: toTitle(row.screening_status),
  }))

  function openAdd() {
    setEditRow(null)
    setSelectedProgram('')
    setConsentAcknowledged(false)
    setActiveTab('personal')
    setOpen(true)
  }

  function openEdit(row: DonorRow) {
    setEditRow(row)
    setSelectedProgram(toProgramLabel(row.primary_program) ?? '')
    setConsentAcknowledged(false)
    setActiveTab('personal')
    setOpen(true)
  }

  function closeDrawer() {
    setOpen(false)
    setEditRow(null)
    setSelectedProgram('')
    setConsentAcknowledged(false)
    setActiveTab('personal')
  }

  async function saveDonor(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSaving(true)
    const form = new FormData(event.currentTarget)
    const program = fromProgramLabel(form.get('program'))
    const isBypass = BYPASS_PROGRAMS.includes(program ?? '')

    const payload = {
      full_name: String(form.get('full_name') ?? ''),
      address: String(form.get('address') ?? ''),
      contact_number: String(form.get('contact_number') ?? ''),
      date_of_birth: form.get('date_of_birth') || null,
      occupation: form.get('occupation') ? String(form.get('occupation')) : null,
      civil_status: form.get('civil_status') ? String(form.get('civil_status')) : null,
      primary_program: program,
      classification: String(form.get('classification') || 'community'),
    }

    if (editRow) {
      await supabase.from('donors').update(payload).eq('id', editRow.id)
    } else {
      // D4: Auto-set screening_status based on program
      const screeningStatus = isBypass ? 'not_required' : 'pending'
      const { data: newDonor } = await supabase
        .from('donors')
        .insert({ ...payload, screening_status: screeningStatus })
        .select('id')
        .single()

      if (newDonor && !isBypass) {
        // G1: Include counseling/interview/consent timestamps
        await supabase.from('donor_screenings').insert({
          donor_id: newDonor.id,
          program,
          screening_result: 'pending',
          tuberculosis_history: form.get('tb') === 'on',
          hepatitis_b_history: form.get('hepb') === 'on',
          mastitis_history: form.get('mastitis') === 'on',
          syphilis_history: form.get('syphilis') === 'on',
          herpes_or_std_history: form.get('herpes') === 'on',
          blood_transfusion_last_12_months: form.get('blood') === 'on',
          organ_transplant_history: form.get('organ') === 'on',
          alcohol_last_24_hours: form.get('alcohol') === 'on',
          smoking_history: form.get('smoker') === 'on',
          illegal_drug_use: form.get('drugs') === 'on',
          last_delivery_date: form.get('last_delivery_date') || null,
          counseling_completed_at: form.get('counseling_completed_at') || null,
          interview_completed_at: form.get('interview_completed_at') || null,
          consent_signed_at: form.get('consent_signed_at') || null,
        })
      }
    }

    setSaving(false)
    closeDrawer()
    await load()
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('donors').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Donors' }]}
        title="Donor Management"
        subtitle="Register and manage milk donor profiles and health screenings"
        actions={
          <div className="flex gap-2">
            <button onClick={() => exportCsv('donors', exportRows)} className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 transition-colors">
              <Download className="w-4 h-4" aria-hidden="true" />Export
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-colors hover:opacity-90 shadow-sm" style={{ background: '#f472b6' }}>
              <Plus className="w-4 h-4" aria-hidden="true" />Add Donor
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-zinc-50/50 border border-zinc-200 outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all"
            placeholder="Search by name, DTN, or contact…"
            aria-label="Search donors"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-x-auto shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100">
              {['DTN', 'Full Name', 'Program', 'Classification', 'Contact', 'Screening Status', 'Actions'].map((h) => (
                <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-pink-400 font-mono">{row.dtn}</td>
                <td className="px-6 py-4 text-sm text-zinc-900 font-medium">{row.full_name}</td>
                <td className="px-6 py-4 text-sm text-zinc-600">{toProgramLabel(row.primary_program)}</td>
                <td className="px-6 py-4 text-sm text-zinc-600">{toTitle(row.classification)}</td>
                <td className="px-6 py-4 text-sm text-zinc-600 font-mono">{row.contact_number}</td>
                <td className="px-6 py-4"><StatusBadge value={toTitle(row.screening_status)} /></td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(row)}
                      aria-label={`Edit ${row.full_name}`}
                      className="p-1.5 text-zinc-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(row)}
                      aria-label={`Delete ${row.full_name}`}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-zinc-400">No donors found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-zinc-950/30 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-zinc-100"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-dialog-title"
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 id="delete-dialog-title" className="font-semibold text-zinc-900">Delete Donor</h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      This will permanently remove <span className="font-medium text-zinc-700">{deleteTarget.full_name}</span> ({deleteTarget.dtn}). This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Delete Donor'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add / Edit Drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-white z-50 flex flex-col shadow-2xl border-l border-zinc-100"
              role="dialog"
              aria-modal="true"
              aria-label={editRow ? 'Edit Donor' : 'Add Donor'}
            >
              <form onSubmit={saveDonor} className="flex flex-col h-full">
                <div className="px-8 py-6 border-b border-zinc-100">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">
                      {editRow ? 'Edit Donor' : 'Add Donor'}
                    </h2>
                    <button type="button" onClick={closeDrawer} aria-label="Close drawer" className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full transition-colors">
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex gap-6 border-b border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('personal')}
                      className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'personal' ? 'border-[#eea4bb] text-[#eea4bb]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
                    >
                      Personal Info
                    </button>
                    {/* D4: Only show screening tab when program is NOT bypassed */}
                    {!editRow && !screeningBypassed && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('screening')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'screening' ? 'border-[#eea4bb] text-[#eea4bb]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
                      >
                        Health Screening
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6 hide-scrollbar">
                  {activeTab === 'personal' ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-zinc-700">DTN <span className="text-zinc-400 font-normal">(auto-generated)</span></label>
                          <input disabled value={editRow?.dtn ?? 'Auto-generated by system'} className="w-full rounded-xl bg-pink-50/50 border border-pink-100 px-4 py-2.5 text-sm text-zinc-500 font-mono outline-none" />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="donor-program" className="text-sm font-medium text-zinc-700">Program Type <span className="text-pink-400">*</span></label>
                          <select
                            id="donor-program"
                            name="program"
                            required
                            value={selectedProgram}
                            onChange={(e) => {
                              setSelectedProgram(e.target.value)
                              // D4: reset to personal tab if switching to bypass program
                              setActiveTab('personal')
                            }}
                            className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-700 appearance-none"
                          >
                            <option value="">Select program</option>
                            <option>Supsup Todo</option>
                            <option>Mom's Act</option>
                            <option>Milky Way</option>
                          </select>
                        </div>
                      </div>

                      {/* D4: Screening bypass notice banner */}
                      {screeningBypassed && !editRow && (
                        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800">
                          <ShieldOff className="w-4 h-4 mt-0.5 shrink-0" />
                          <div className="text-sm">
                            <p className="font-semibold">Health screening not required</p>
                            <p className="text-xs mt-0.5 text-sky-700">Donors in this program are pre-screened externally. Screening status will be set to <strong>Not Required</strong> automatically.</p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label htmlFor="donor-name" className="text-sm font-medium text-zinc-700">Full Name <span className="text-pink-400">*</span></label>
                        <input id="donor-name" name="full_name" required defaultValue={editRow?.full_name ?? ''} placeholder="First Middle Last" autoComplete="name" className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400" />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="donor-address" className="text-sm font-medium text-zinc-700">Home Address <span className="text-pink-400">*</span></label>
                        <input id="donor-address" name="address" required defaultValue={editRow?.address ?? ''} placeholder="House No., Street, Barangay, City" autoComplete="street-address" className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400" />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label htmlFor="donor-contact" className="text-sm font-medium text-zinc-700">Contact Number <span className="text-pink-400">*</span></label>
                          <input id="donor-contact" name="contact_number" required type="tel" defaultValue={editRow?.contact_number ?? ''} placeholder="09XXXXXXXXX" autoComplete="tel" spellCheck={false} className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm font-mono outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400" />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="donor-dob" className="text-sm font-medium text-zinc-700">Date of Birth</label>
                          <input id="donor-dob" type="date" name="date_of_birth" defaultValue={editRow?.date_of_birth ?? ''} className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-500" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label htmlFor="donor-occupation" className="text-sm font-medium text-zinc-700">Occupation</label>
                          <input id="donor-occupation" name="occupation" defaultValue={editRow?.occupation ?? ''} placeholder="e.g., Homemaker" autoComplete="organization-title" className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400" />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="donor-civil" className="text-sm font-medium text-zinc-700">Civil Status</label>
                          <select id="donor-civil" name="civil_status" defaultValue={editRow?.civil_status ?? ''} className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-700 appearance-none">
                            <option value="">Select</option>
                            <option value="single">Single</option>
                            <option value="married">Married</option>
                            <option value="separated">Separated</option>
                            <option value="widowed">Widowed</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="donor-classification" className="text-sm font-medium text-zinc-700">Classification</label>
                        <select id="donor-classification" name="classification" defaultValue={editRow?.classification ?? ''} className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-700 appearance-none">
                          <option value="">Select</option>
                          <option value="community">Community</option>
                          <option value="private">Private</option>
                          <option value="institutional">Institutional</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label htmlFor="donor-delivery" className="text-sm font-medium text-zinc-700">Last Delivery Date</label>
                        <input id="donor-delivery" type="date" name="last_delivery_date" className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-500" />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-zinc-700">Clinical Health Checklist</label>
                        <div className="border border-zinc-200 rounded-2xl bg-white overflow-hidden divide-y divide-zinc-100 shadow-sm">
                          {CHECKLIST_ITEMS.map((item) => (
                            <label key={item.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-zinc-50/50 cursor-pointer transition-colors group">
                              <div className="relative flex items-center justify-center">
                                <input type="checkbox" name={item.id} className="peer sr-only" />
                                <div className="w-5 h-5 border-2 border-zinc-300 rounded bg-white peer-checked:bg-zinc-800 peer-checked:border-zinc-800 transition-colors" />
                                <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <span className="text-sm text-zinc-700 group-hover:text-zinc-900 transition-colors">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* G1: Completion timestamps section */}
                      <div className="space-y-4 pt-2 border-t border-zinc-100">
                        <div className="pt-4">
                          <p className="text-sm font-semibold text-zinc-700">Completion Timestamps</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Log when each step was completed with the donor.</p>
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="ts-counseling" className="text-sm font-medium text-zinc-700">Counseling Completed At</label>
                          <input id="ts-counseling" type="datetime-local" name="counseling_completed_at" className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-500" />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="ts-interview" className="text-sm font-medium text-zinc-700">Interview Completed At</label>
                          <input id="ts-interview" type="datetime-local" name="interview_completed_at" className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-500" />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="ts-consent" className="text-sm font-medium text-zinc-700">Consent Signed At</label>
                          <input id="ts-consent" type="datetime-local" name="consent_signed_at" className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-500" />
                        </div>
                      </div>

                      {/* G2: Maternal consent acknowledgment */}
                      <div className="space-y-3 pt-2 border-t border-zinc-100">
                        <div className="pt-2 p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-700 leading-relaxed">
                          <p className="font-semibold text-zinc-900 mb-2">Maternal Authorization Statement</p>
                          <p>I, the undersigned, hereby voluntarily consent to donate my breast milk to the Makati Human Milk Bank. I understand that my donated milk will be used to feed sick and premature babies in the NICU. I attest that I am currently in good health and that all information I have provided is true and accurate to the best of my knowledge. I give permission for the milk bank to screen, pasteurize, and distribute my donated milk as they see fit for the benefit of recipient infants.</p>
                        </div>
                        <label className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 bg-white cursor-pointer group hover:border-zinc-300 transition-colors">
                          <div className="shrink-0 mt-0.5">
                            <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${consentAcknowledged ? 'bg-zinc-800 border-zinc-800' : 'border border-zinc-300 bg-white group-hover:border-zinc-400'}`}>
                              {consentAcknowledged && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                            </div>
                            <input
                              type="checkbox"
                              required
                              className="hidden"
                              checked={consentAcknowledged}
                              onChange={(e) => setConsentAcknowledged(e.target.checked)}
                            />
                          </div>
                          <p className="text-sm text-zinc-700 font-medium leading-snug">
                            I have read this consent statement to the donor and they have agreed and signed.
                          </p>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-8 py-5 border-t border-zinc-100 bg-white flex justify-end gap-3 items-center">
                  <button type="button" onClick={closeDrawer} className="px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button disabled={saving} className="px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: '#eea4bb' }}>
                    {saving ? 'Saving…' : editRow ? 'Save Changes' : 'Register Donor'}
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
