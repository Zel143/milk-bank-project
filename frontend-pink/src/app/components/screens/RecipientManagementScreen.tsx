import { useEffect, useRef, useState } from 'react'
import { Plus, Search, X, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { motion, AnimatePresence } from 'motion/react'
import { usePagination } from '../../hooks/usePagination'
import { Pagination } from '../shared/Pagination'

type Recipient = {
  id: string
  guardian_name: string
  baby_name: string
  hospital: string | null
  nicu_eligible: boolean
  contact_number: string | null
  contact_email: string | null
  age_of_baby_days: number | null
}

export function RecipientManagementScreen() {
  const [rows, setRows] = useState<Recipient[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'nicu' | 'non-nicu'>('all')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isNicu, setIsNicu] = useState(true)
  const [editRow, setEditRow] = useState<Recipient | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Recipient | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { page, pageSize, total, totalPages, from, to, setPage, setTotal, resetPage, handlePageSizeChange } = usePagination()
  const isFirstRender = useRef(true)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    resetPage()
  }, [debouncedSearch, filter])

  useEffect(() => { void load() }, [page, pageSize, debouncedSearch, filter])

  async function load(): Promise<void> {
    let q = supabase
      .from('beneficiaries')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (debouncedSearch) q = q.or(`guardian_name.ilike.%${debouncedSearch}%,baby_name.ilike.%${debouncedSearch}%,hospital.ilike.%${debouncedSearch}%`)
    if (filter === 'nicu') q = q.eq('nicu_eligible', true)
    if (filter === 'non-nicu') q = q.eq('nicu_eligible', false)
    const { data, count } = await q
    setRows((data ?? []) as Recipient[])
    setTotal(count ?? 0)
  }

  function openAdd() {
    setEditRow(null)
    setIsNicu(true)
    setOpen(true)
  }

  function openEdit(row: Recipient) {
    setEditRow(row)
    setIsNicu(row.nicu_eligible)
    setOpen(true)
  }

  function closeDrawer() {
    setOpen(false)
    setEditRow(null)
    setIsNicu(true)
  }

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSaving(true)
    const form = new FormData(event.currentTarget)

    const aobStr = String(form.get('aob_text') ?? '')
    const match = aobStr.match(/(\d+)/)
    const weeks = match ? parseInt(match[1], 10) : 0
    const ageOfBabyDays = weeks > 0 ? weeks * 7 : null

    const payload = {
      guardian_name: String(form.get('guardian_name')),
      baby_name: String(form.get('baby_name')),
      hospital: String(form.get('hospital')),
      contact_number: String(form.get('contact_number')),
      contact_email: null,
      nicu_eligible: isNicu,
      age_of_baby_days: ageOfBabyDays,
    }

    if (editRow) {
      await supabase.from('beneficiaries').update(payload).eq('id', editRow.id)
    } else {
      await supabase.from('beneficiaries').insert(payload)
    }

    setSaving(false)
    closeDrawer()
    await load()
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('beneficiaries').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    await load()
  }

  function formatAob(days: number | null) {
    if (!days) return 'N/A'
    const weeks = Math.floor(days / 7)
    return `${weeks} weeks`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Recipients' }, { label: 'Recipient Management' }]}
        title="Recipient Management"
        subtitle="Register and manage milk beneficiaries. NICU babies receive dispensing priority."
        actions={
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm transition-all hover:opacity-90" style={{ background: '#f472b6' }}>
            <Plus className="w-4 h-4" aria-hidden="true" />Add Recipient
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-zinc-100 flex items-center gap-4 bg-zinc-50/50">
          <div className="relative flex-1 max-w-3xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400"
              placeholder="Search guardian, baby, hospital…"
              aria-label="Search recipients"
              autoComplete="off"
              maxLength={100}
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'nicu' | 'non-nicu')}
            aria-label="Filter by NICU status"
            className="rounded-xl bg-white border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all text-zinc-700 min-w-[160px]"
          >
            <option value="all">All Recipients</option>
            <option value="nicu">NICU Only</option>
            <option value="non-nicu">Non-NICU Only</option>
          </select>

          <div className="text-sm text-zinc-500 font-medium ml-2 shrink-0 tabular-nums">
            {total} {total === 1 ? 'record' : 'records'}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50/50">
              <tr className="border-b border-zinc-100">
                {['Guardian Name', 'Baby Name', 'Hospital', 'NICU Status', 'Contact', 'AOB', 'Actions'].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-zinc-900 font-medium">{r.guardian_name}</td>
                  <td className="px-6 py-4 text-sm text-zinc-900">{r.baby_name}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{r.hospital || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <StatusBadge value={r.nicu_eligible ? 'NICU' : 'Non-NICU'} />
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-zinc-600">{r.contact_number || r.contact_email || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{formatAob(r.age_of_baby_days)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(r)}
                        aria-label={`Edit ${r.guardian_name}`}
                        className="p-1.5 text-zinc-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        aria-label={`Delete ${r.guardian_name}`}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-zinc-400">No recipients found</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={handlePageSizeChange} />
        </div>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteTarget && (
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
              aria-labelledby="del-recipient-title"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="del-recipient-title" className="font-semibold text-zinc-900">Delete Recipient</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    This will permanently remove <span className="font-medium text-zinc-700">{deleteTarget.guardian_name}</span> and their baby <span className="font-medium text-zinc-700">{deleteTarget.baby_name}</span>. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Delete Recipient'}
                </button>
              </div>
            </motion.div>
          </motion.div>
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
              className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-white z-50 flex flex-col shadow-2xl border-l border-zinc-100"
              role="dialog"
              aria-modal="true"
              aria-label={editRow ? 'Edit Recipient' : 'Add Recipient'}
            >
              <form onSubmit={save} className="flex flex-col h-full">
                <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">
                    {editRow ? 'Edit Recipient' : 'Add Recipient'}
                  </h2>
                  <button type="button" onClick={closeDrawer} aria-label="Close drawer" className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full transition-colors">
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6 hide-scrollbar space-y-6">

                  {/* NICU Toggle Banner */}
                  <div className="bg-pink-50/30 border border-pink-200/50 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">NICU Status</h3>
                      <p className="text-sm text-zinc-500 mt-0.5">NICU babies receive dispensing priority</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-md ${isNicu ? 'bg-pink-100 text-pink-600' : 'bg-zinc-100 text-zinc-500'}`}>
                        {isNicu ? 'NICU' : 'Non-NICU'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isNicu}
                        aria-label="Toggle NICU status"
                        onClick={() => setIsNicu(!isNicu)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${isNicu ? 'bg-pink-300' : 'bg-zinc-200'}`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isNicu ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label htmlFor="rcp-guardian" className="text-sm font-medium text-zinc-700">Guardian Name <span className="text-pink-400">*</span></label>
                      <input id="rcp-guardian" name="guardian_name" required defaultValue={editRow?.guardian_name ?? ''} placeholder="Full name…" autoComplete="name" maxLength={100} className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="rcp-baby" className="text-sm font-medium text-zinc-700">Baby Name <span className="text-pink-400">*</span></label>
                      <input id="rcp-baby" name="baby_name" required defaultValue={editRow?.baby_name ?? ''} placeholder="Baby's name…" maxLength={100} className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="rcp-hospital" className="text-sm font-medium text-zinc-700">Hospital <span className="text-pink-400">*</span></label>
                    <input id="rcp-hospital" name="hospital" required defaultValue={editRow?.hospital ?? ''} placeholder="Hospital name…" maxLength={100} className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label htmlFor="rcp-contact" className="text-sm font-medium text-zinc-700">Contact Number <span className="text-pink-400">*</span></label>
                      <input id="rcp-contact" name="contact_number" required type="tel" defaultValue={editRow?.contact_number ?? ''} placeholder="09XXXXXXXXX" autoComplete="tel" spellCheck={false} maxLength={11} className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm font-mono outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="rcp-aob" className="text-sm font-medium text-zinc-700">Age of Baby (AOB)</label>
                      <input
                        id="rcp-aob"
                        name="aob_text"
                        placeholder="e.g., 28 weeks…"
                        defaultValue={editRow?.age_of_baby_days ? `${Math.floor(editRow.age_of_baby_days / 7)} weeks` : ''}
                        maxLength={20}
                        className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-2.5 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all placeholder:text-zinc-400"
                      />
                    </div>
                  </div>

                </div>

                <div className="px-8 py-5 border-t border-zinc-100 bg-white flex justify-end gap-3 items-center">
                  <button type="button" onClick={closeDrawer} className="px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button disabled={saving} className="px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: '#f472b6' }}>
                    {saving ? 'Saving…' : editRow ? 'Save Changes' : 'Add Recipient'}
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
