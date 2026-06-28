import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search, X, ChevronDown } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { fromProgramLabel, formatDate, toProgramLabel } from '../../exportUtils'
import { motion, AnimatePresence } from 'motion/react'

type Donor = { id: string; dtn: string | null; full_name: string; primary_program: string }
type StaffProfile = { id: string; full_name: string; role: string }
type Collection = {
  id: string
  ctn: string | null
  program: string
  volume_ml: number
  collection_mode: string
  collected_at: string
  donors?: Donor | null
  age_of_baby_days?: number | null
}

function modeToShort(mode: string): string {
  if (mode === 'field_collection' || mode === 'FC') return 'FC'
  if (mode === 'pickup' || mode === 'PU') return 'PU'
  return mode.toUpperCase()
}

export function MilkCollectionScreen() {
  const [rows, setRows] = useState<Collection[]>([])
  const [donors, setDonors] = useState<Donor[]>([])
  const [staffList, setStaffList] = useState<StaffProfile[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Donor search combobox state
  const [donorQuery, setDonorQuery] = useState('')
  const [donorOpen, setDonorOpen] = useState(false)
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null)
  const donorRef = useRef<HTMLDivElement>(null)

  // Collection mode (to conditionally show DoPU — G3)
  const [collectionMode, setCollectionMode] = useState<string>('field_collection')

  async function load(): Promise<void> {
    const [{ data: collections }, { data: donorRows }, { data: profiles }] = await Promise.all([
      supabase
        .from('collections')
        .select('id,ctn,program,volume_ml,collection_mode,collected_at,age_of_baby_days,donors(id,dtn,full_name,primary_program)')
        .order('collected_at', { ascending: false }),
      supabase.from('donors').select('id,dtn,full_name,primary_program').order('full_name'),
      // D5: fetch active staff profiles for the collected_by dropdown
      supabase.from('profiles').select('id,full_name,role').eq('is_active', true).order('full_name'),
    ])
    setRows((collections ?? []) as Collection[])
    setDonors((donorRows ?? []) as Donor[])
    setStaffList((profiles ?? []) as StaffProfile[])
  }
  useEffect(() => { void load() }, [])

  // Close donor dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (donorRef.current && !donorRef.current.contains(e.target as Node)) {
        setDonorOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCollections = useMemo(
    () => rows.filter((row) => [row.ctn, row.donors?.dtn, row.donors?.full_name].join(' ').toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  )

  const filteredDonors = useMemo(
    () => donors.filter((d) => [d.dtn, d.full_name].join(' ').toLowerCase().includes(donorQuery.toLowerCase())).slice(0, 8),
    [donors, donorQuery]
  )

  function formatAob(days: number | null | undefined): string {
    if (!days) return 'N/A'
    const weeks = Math.floor(days / 7)
    if (weeks >= 4) return `${Math.floor(weeks / 4)}mo ${weeks % 4}w`
    return `${weeks}w`
  }

  function openDrawer() {
    setSelectedDonor(null)
    setDonorQuery('')
    setCollectionMode('field_collection')
    setOpen(true)
  }

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSaving(true)
    const form = new FormData(event.currentTarget)
    const donorId = selectedDonor?.id ?? String(form.get('donor_id') ?? '')
    const program = fromProgramLabel(form.get('program'))
    const volume = Number(form.get('volume_ml') ?? 0)
    const mode = String(form.get('collection_mode'))

    const aobInput = String(form.get('aob') ?? '').trim()
    let ageOfBabyDays: number | null = null
    if (aobInput) {
      const num = parseInt(aobInput)
      if (!isNaN(num)) {
        ageOfBabyDays = aobInput.toLowerCase().includes('month')
          ? num * 30
          : aobInput.toLowerCase().includes('week') ? num * 7 : num
      }
    }

    // G3: only send pickup_at when mode is pickup
    const pickupAt = mode === 'pickup' ? (String(form.get('pickup_at') || '') || null) : null
    // D5: send UUID from profiles dropdown (not free text)
    const collectedBy = String(form.get('collected_by') || '') || null

    const { data: collection } = await supabase.from('collections').insert({
      donor_id: donorId,
      program,
      volume_ml: volume,
      collection_mode: mode,
      collected_at: String(form.get('collected_at')) || new Date().toISOString(),
      age_of_baby_days: ageOfBabyDays,
      cold_chain_verified: true,
      pickup_at: pickupAt,
      collected_by: collectedBy,
    }).select('id').single()

    const { data: batch } = await supabase.from('batches').insert({
      program,
      status: 'raw',
      total_volume_ml: volume,
    }).select('id').single()

    if (collection && batch) {
      await supabase.from('batch_collections').insert({
        collection_id: collection.id,
        batch_id: batch.id,
        volume_ml: volume,
      })
    }

    setSaving(false)
    setOpen(false)
    setSelectedDonor(null)
    setDonorQuery('')
    setCollectionMode('field_collection')
    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Milk Lifecycle' }]}
        title="Milk Collection"
        subtitle="Log donor collections and create batches"
        actions={
          <button onClick={openDrawer} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-colors hover:opacity-90 shadow-sm" style={{ background: '#f472b6' }}>
            <Plus className="w-4 h-4" aria-hidden="true" />New Collection
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-zinc-50/50 border border-zinc-200 outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all"
            placeholder="Search by CTN, donor name, or DTN…"
            aria-label="Search collections"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-x-auto shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100">
              {['CTN', 'Donor', 'Program', 'Volume', 'Mode', 'AOB', 'Date'].map((h) => (
                <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredCollections.map((row) => (
              <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-pink-400 font-mono">{row.ctn}</td>
                <td className="px-6 py-4 text-sm text-zinc-900 font-medium">
                  {row.donors?.full_name}
                  <div className="text-xs text-zinc-500 font-normal mt-0.5 font-mono">{row.donors?.dtn}</div>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-600">{toProgramLabel(row.program)}</td>
                <td className="px-6 py-4 text-sm text-zinc-600 font-mono tabular-nums">{row.volume_ml} mL</td>
                <td className="px-6 py-4">
                  <StatusBadge value={modeToShort(row.collection_mode)} />
                </td>
                <td className="px-6 py-4 text-sm text-zinc-600">{formatAob(row.age_of_baby_days)}</td>
                <td className="px-6 py-4 text-sm text-zinc-600">{formatDate(row.collected_at)}</td>
              </tr>
            ))}
            {filteredCollections.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-zinc-400">No collections found</td></tr>
            )}
          </tbody>
        </table>
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
              aria-label="New Collection"
            >
              <form onSubmit={save} className="flex flex-col h-full">
                <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">New Collection</h2>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close drawer" className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full transition-colors">
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6 hide-scrollbar space-y-6">

                  <div className="space-y-1.5">
                    <label htmlFor="col-program" className="text-sm font-medium text-zinc-700">Program Type <span className="text-pink-400">*</span></label>
                    <select id="col-program" name="program" required className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-700 appearance-none">
                      <option value="">Select program</option>
                      <option>Supsup Todo</option>
                      <option>Mom's Act</option>
                      <option>Milky Way</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-700">CTN <span className="text-zinc-400 font-normal">(auto-generated)</span></label>
                      <input disabled value="Auto-generated" className="w-full rounded-xl bg-pink-50/50 border border-pink-100 px-4 py-2.5 text-sm text-zinc-500 font-mono outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-700">Batch No. <span className="text-zinc-400 font-normal">(auto-generated)</span></label>
                      <input disabled value="Auto-generated" className="w-full rounded-xl bg-pink-50/50 border border-pink-100 px-4 py-2.5 text-sm text-zinc-500 font-mono outline-none" />
                    </div>
                  </div>

                  {/* Donor searchable combobox */}
                  <div className="space-y-1.5" ref={donorRef}>
                    <label htmlFor="donor-search" className="text-sm font-medium text-zinc-700">Donor <span className="text-pink-400">*</span></label>
                    <div className="relative">
                      <input
                        id="donor-search"
                        type="text"
                        value={selectedDonor ? `${selectedDonor.dtn} - ${selectedDonor.full_name}` : donorQuery}
                        onChange={(e) => {
                          setDonorQuery(e.target.value)
                          setSelectedDonor(null)
                          setDonorOpen(true)
                        }}
                        onFocus={() => setDonorOpen(true)}
                        placeholder="Search by name or DTN…"
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 pr-9 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400"
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" aria-hidden="true" />
                      {/* Hidden input carries actual donor id for form submission */}
                      <input type="hidden" name="donor_id" value={selectedDonor?.id ?? ''} required />
                      <AnimatePresence>
                        {donorOpen && filteredDonors.length > 0 && (
                          <motion.ul
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden"
                            role="listbox"
                            aria-label="Donor suggestions"
                          >
                            {filteredDonors.map((d) => (
                              <li
                                key={d.id}
                                role="option"
                                aria-selected={selectedDonor?.id === d.id}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setSelectedDonor(d)
                                  setDonorQuery('')
                                  setDonorOpen(false)
                                }}
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-pink-50 cursor-pointer transition-colors"
                              >
                                <span className="text-xs font-mono text-pink-400 shrink-0">{d.dtn}</span>
                                <span className="text-sm text-zinc-800">{d.full_name}</span>
                                <span className="ml-auto text-xs text-zinc-400">{toProgramLabel(d.primary_program)}</span>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label htmlFor="col-volume" className="text-sm font-medium text-zinc-700">Volume (mL) <span className="text-pink-400">*</span></label>
                      <input id="col-volume" name="volume_ml" type="number" inputMode="numeric" min="30" max="240" required placeholder="30 - 240" className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm font-mono outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="col-mode" className="text-sm font-medium text-zinc-700">Collection Mode <span className="text-pink-400">*</span></label>
                      <select
                        id="col-mode"
                        name="collection_mode"
                        required
                        value={collectionMode}
                        onChange={(e) => setCollectionMode(e.target.value)}
                        className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-700 appearance-none"
                      >
                        <option value="field_collection">FC - Field Collection</option>
                        <option value="pickup">PU - Pickup</option>
                      </select>
                    </div>
                  </div>

                  {/* G3: DoPU field — only shown when mode is pickup */}
                  {collectionMode === 'pickup' && (
                    <div className="space-y-1.5">
                      <label htmlFor="col-dopu" className="text-sm font-medium text-zinc-700">
                        Date of Pickup (DoPU) <span className="text-pink-400">*</span>
                        <span className="ml-2 text-xs font-normal text-zinc-400">Required for Mom's Act pickups</span>
                      </label>
                      <input
                        id="col-dopu"
                        name="pickup_at"
                        type="datetime-local"
                        required
                        className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-500"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label htmlFor="col-date" className="text-sm font-medium text-zinc-700">Collection Date</label>
                      <input id="col-date" name="collected_at" type="datetime-local" className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="col-aob" className="text-sm font-medium text-zinc-700">Age of Baby (AOB)</label>
                      <input id="col-aob" name="aob" placeholder="e.g., 6 weeks…" className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400" />
                    </div>
                  </div>

                  {/* D5: Collected By — staff UUID dropdown (fixes FK constraint) */}
                  <div className="space-y-1.5">
                    <label htmlFor="col-by" className="text-sm font-medium text-zinc-700">Collected By</label>
                    <select
                      id="col-by"
                      name="collected_by"
                      className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-700 appearance-none"
                    >
                      <option value="">Select staff member…</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                      ))}
                    </select>
                  </div>

                </div>

                <div className="px-8 py-5 border-t border-zinc-100 bg-white flex justify-end gap-3 items-center">
                  <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button disabled={saving || !selectedDonor} className="px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: '#eea4bb' }}>
                    {saving ? 'Saving…' : 'Log Collection'}
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
