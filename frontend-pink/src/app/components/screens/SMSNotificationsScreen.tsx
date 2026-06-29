import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle, Loader2, Lock, MessageSquare, Save, Search, Send, XCircle } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { formatDate, toTitle } from '../../exportUtils'
import type { AppUser } from '../../types'

const TEMPLATE_STORAGE_KEY = 'mhmbms_notification_templates'

const DEFAULT_TEMPLATES = {
  milkAvailable:
    'Magandang araw po! Ang hinihintay na gatas para kay [BABY_NAME] ay handa na. Pumunta po kayo sa Makati Human Milk Bank sa 1126 Rodriguez Ave., Brgy. Bangkal, Makati City para sa dispensing. Para sa katanungan, tawagan po kami sa 8888-7777.',
  dispensingConfirmation:
    'Kumpirmasyon: [VOLUME]mL ng pasteurized na gatas ay inilabas na para kay [BABY_NAME]. Kabuuang bayad: ₱[TOTAL_FEE]. Maraming salamat sa inyong tiwala sa Makati Human Milk Bank.',
  statusUpdate:
    'Update sa inyong application: [STATUS]. Para sa karagdagang impormasyon, makipag-ugnayan po sa Makati Human Milk Bank sa 8888-7777.',
}

type Templates = typeof DEFAULT_TEMPLATES
type VarKey = 'BABY_NAME' | 'VOLUME' | 'TOTAL_FEE' | 'STATUS'
type VarValues = Record<VarKey, string>

type BeneficiaryOption = {
  id: string
  guardian_name: string
  baby_name: string
  contact_email: string | null
}

type EmailLog = {
  id: string
  recipient_email: string
  trigger_event: string
  status: string
  queued_at: string
}

const TEMPLATE_META: {
  key: keyof Templates
  label: string
  variables: VarKey[]
  triggerEvent: 'milk_available' | 'dispensing_confirmation' | 'status_update'
}[] = [
  { key: 'milkAvailable',          label: 'Milk Available',          variables: ['BABY_NAME'],                        triggerEvent: 'milk_available' },
  { key: 'dispensingConfirmation', label: 'Dispensing Confirmation', variables: ['BABY_NAME', 'VOLUME', 'TOTAL_FEE'], triggerEvent: 'dispensing_confirmation' },
  { key: 'statusUpdate',           label: 'Status Update',           variables: ['STATUS'],                           triggerEvent: 'status_update' },
]

const VAR_LABELS: Record<VarKey, string> = {
  BABY_NAME: 'Baby Name',
  VOLUME:    'Volume (mL)',
  TOTAL_FEE: 'Total Fee (₱)',
  STATUS:    'Status',
}

const EMPTY_VARS: VarValues = { BABY_NAME: '', VOLUME: '', TOTAL_FEE: '', STATUS: '' }

function loadTemplates(): Templates {
  try {
    const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY)
    if (saved) return { ...DEFAULT_TEMPLATES, ...JSON.parse(saved) }
  } catch { /* ignore */ }
  return DEFAULT_TEMPLATES
}

export function SMSNotificationsScreen({ user }: { user: AppUser }) {
  const isAdmin = user.role === 'Admin' || user.role === 'Administrator'

  // Template editing
  const [templates, setTemplates]         = useState<Templates>(loadTemplates)
  const [editKey, setEditKey]             = useState<keyof Templates | null>(null)
  const [draftText, setDraftText]         = useState('')
  const [templateSaved, setTemplateSaved] = useState(false)

  // Notification log
  const [logs, setLogs] = useState<EmailLog[]>([])

  // Compose form
  const [selectedTemplate, setSelectedTemplate]       = useState<keyof Templates>('milkAvailable')
  const [query, setQuery]                             = useState('')
  const [options, setOptions]                         = useState<BeneficiaryOption[]>([])
  const [showDropdown, setShowDropdown]               = useState(false)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryOption | null>(null)
  const [recipientEmail, setRecipientEmail]           = useState('')
  const [vars, setVars]                               = useState<VarValues>(EMPTY_VARS)
  const [latestInquiryId, setLatestInquiryId]         = useState<string | null>(null)
  const [isSending, setIsSending]                     = useState(false)
  const [sendResult, setSendResult]                   = useState<'success' | 'error' | null>(null)
  const [sendError, setSendError]                     = useState('')

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from('email_notifications')
      .select('id,recipient_email,trigger_event,status,queued_at')
      .order('queued_at', { ascending: false })
      .limit(50)
    setLogs((data ?? []) as EmailLog[])
  }, [])

  useEffect(() => { void fetchLogs() }, [fetchLogs])

  // Debounced beneficiary search
  useEffect(() => {
    if (!query.trim()) {
      setOptions([])
      setShowDropdown(false)
      return
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('beneficiaries')
        .select('id,guardian_name,baby_name,contact_email')
        .or(`guardian_name.ilike.%${query}%,baby_name.ilike.%${query}%`)
        .limit(8)
      const results = (data ?? []) as BeneficiaryOption[]
      setOptions(results)
      setShowDropdown(true)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  async function selectBeneficiary(b: BeneficiaryOption) {
    setSelectedBeneficiary(b)
    setQuery(`${b.baby_name} — ${b.guardian_name}`)
    setRecipientEmail(b.contact_email ?? '')
    setShowDropdown(false)
    setSendResult(null)

    const [{ data: inquiry }, { data: dispensing }] = await Promise.all([
      supabase
        .from('inquiries')
        .select('id,status')
        .eq('beneficiary_id', b.id)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('dispensing_records')
        .select('volume_ml,total_fee')
        .eq('beneficiary_id', b.id)
        .eq('status', 'confirmed')
        .order('dispensed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    setLatestInquiryId(inquiry?.id ?? null)
    setVars({
      BABY_NAME: b.baby_name,
      STATUS:    inquiry    ? toTitle(inquiry.status)      : '',
      VOLUME:    dispensing ? String(dispensing.volume_ml) : '',
      TOTAL_FEE: dispensing ? String(dispensing.total_fee) : '',
    })
  }

  function clearBeneficiary() {
    setSelectedBeneficiary(null)
    setQuery('')
    setRecipientEmail('')
    setVars(EMPTY_VARS)
    setLatestInquiryId(null)
    setSendResult(null)
  }

  const currentMeta = TEMPLATE_META.find(m => m.key === selectedTemplate)!

  const composedMessage = useMemo(
    () =>
      templates[selectedTemplate]
        .replace(/\[BABY_NAME\]/g, vars.BABY_NAME || '[BABY_NAME]')
        .replace(/\[VOLUME\]/g,    vars.VOLUME    || '[VOLUME]')
        .replace(/\[TOTAL_FEE\]/g, vars.TOTAL_FEE || '[TOTAL_FEE]')
        .replace(/\[STATUS\]/g,    vars.STATUS    || '[STATUS]'),
    [templates, selectedTemplate, vars],
  )

  const canSend =
    !!selectedBeneficiary &&
    recipientEmail.trim().includes('@') &&
    currentMeta.variables.every(v => vars[v].trim() !== '') &&
    !isSending

  async function handleSend() {
    if (!canSend || !selectedBeneficiary) return
    setIsSending(true)
    setSendResult(null)
    setSendError('')

    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          recipientEmail: recipientEmail.trim(),
          subject:        currentMeta.label,
          body:           composedMessage,
          triggerEvent:   currentMeta.triggerEvent,
          beneficiaryId:  selectedBeneficiary.id,
          inquiryId:      latestInquiryId,
        },
      })

      if (error || !(data as { success?: boolean })?.success) {
        setSendResult('error')
        setSendError(
          (data as { error?: string })?.error ?? error?.message ?? 'Failed to send email.',
        )
      } else {
        setSendResult('success')
        clearBeneficiary()
        void fetchLogs()
      }
    } catch (err) {
      setSendResult('error')
      setSendError(err instanceof Error ? err.message : 'Unexpected error.')
    } finally {
      setIsSending(false)
    }
  }

  // Template editing
  function startEdit(key: keyof Templates) {
    setEditKey(key)
    setDraftText(templates[key])
    setTemplateSaved(false)
  }

  function saveTemplate() {
    if (!editKey) return
    const updated = { ...templates, [editKey]: draftText }
    setTemplates(updated)
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated))
    setTemplateSaved(true)
    setTimeout(() => setTemplateSaved(false), 2000)
  }

  function cancelEdit() {
    setEditKey(null)
    setDraftText('')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Operations' }]}
        title="Notifications"
        subtitle={
          isAdmin
            ? 'Compose and send email notifications, manage templates, and view delivery logs'
            : 'Send email notifications to beneficiaries and view delivery logs'
        }
      />

      {/* ── Compose & Send ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
          <Send className="w-4 h-4 text-pink-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-zinc-900">Compose & Send</h3>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Template selector */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Template</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_META.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setSelectedTemplate(key); setSendResult(null) }}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    selectedTemplate === key
                      ? 'border-pink-300 text-pink-700'
                      : 'border-zinc-200 text-zinc-600 hover:border-pink-200 hover:text-pink-600'
                  }`}
                  style={selectedTemplate === key ? { background: '#fdf2f6' } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Beneficiary search + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Beneficiary</p>
              <div className="relative" ref={dropdownRef}>
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value)
                    if (selectedBeneficiary) clearBeneficiary()
                  }}
                  placeholder="Search by baby or guardian name…"
                  aria-label="Search beneficiary"
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-zinc-200 bg-zinc-50/50 outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all"
                />
                {showDropdown && (
                  <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-zinc-200 shadow-lg overflow-hidden">
                    {options.length > 0
                      ? options.map(b => (
                          <button
                            key={b.id}
                            onClick={() => selectBeneficiary(b)}
                            className="w-full text-left px-4 py-3 hover:bg-pink-50 transition-colors border-b border-zinc-50 last:border-0"
                          >
                            <p className="text-sm font-medium text-zinc-900">{b.baby_name}</p>
                            <p className="text-xs text-zinc-500">Guardian: {b.guardian_name}</p>
                          </button>
                        ))
                      : (
                          <div className="px-4 py-3 text-sm text-zinc-400">No beneficiaries found</div>
                        )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                Email Address
                {!isAdmin && <Lock className="w-3 h-3" aria-hidden="true" />}
              </p>
              {isAdmin ? (
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="beneficiary@email.com"
                  aria-label="Recipient email address"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-zinc-200 bg-zinc-50/50 outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all"
                />
              ) : (
                <div className="px-4 py-2.5 text-sm rounded-xl border border-zinc-100 bg-zinc-50 min-h-[42px] flex items-center">
                  {recipientEmail ? (
                    <span className="text-zinc-900">{recipientEmail}</span>
                  ) : selectedBeneficiary ? (
                    <span className="text-amber-600 text-xs">No email on file — update the beneficiary record</span>
                  ) : (
                    <span className="text-zinc-400">Select a beneficiary first</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Variable fields */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              Message Variables
              {!isAdmin && <Lock className="w-3 h-3" aria-hidden="true" />}
            </p>
            <div
              className={`grid gap-3 ${
                currentMeta.variables.length === 1
                  ? 'grid-cols-1 max-w-xs'
                  : 'grid-cols-2 sm:grid-cols-3'
              }`}
            >
              {currentMeta.variables.map(varKey => (
                <div key={varKey}>
                  <p className="text-xs text-zinc-500 mb-1">{VAR_LABELS[varKey]}</p>
                  {isAdmin ? (
                    <input
                      value={vars[varKey]}
                      onChange={e => setVars(v => ({ ...v, [varKey]: e.target.value }))}
                      placeholder={`[${varKey}]`}
                      aria-label={VAR_LABELS[varKey]}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-zinc-50/50 outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all"
                    />
                  ) : (
                    <div className="px-3 py-2 text-sm rounded-xl border border-zinc-100 bg-zinc-50 min-h-[38px] flex items-center">
                      {vars[varKey] ? (
                        <span className="text-zinc-900">{vars[varKey]}</span>
                      ) : (
                        <span className="text-zinc-400 font-mono text-xs">[{varKey}]</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Message preview */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Preview</p>
            <p className="text-sm text-zinc-700 leading-relaxed bg-zinc-50/50 rounded-xl px-4 py-3 border border-zinc-100 whitespace-pre-wrap">
              {composedMessage}
            </p>
          </div>

          {/* Send row */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="text-sm min-h-[20px]" aria-live="polite">
              {sendResult === 'success' && (
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                  Email sent successfully
                </span>
              )}
              {sendResult === 'error' && (
                <span className="flex items-center gap-1.5 text-red-500">
                  <XCircle className="w-4 h-4" aria-hidden="true" />
                  {sendError || 'Failed to send email'}
                </span>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 shrink-0"
              style={{ background: '#eea4bb' }}
            >
              {isSending ? (
                <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Sending…</>
              ) : (
                <><Send className="w-4 h-4" aria-hidden="true" /> Send Email</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Message Templates ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
          <MessageSquare className="w-4 h-4 text-pink-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-zinc-900">Message Templates</h3>
          {!isAdmin && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Read-only for staff</span>
            </div>
          )}
        </div>

        <div className="divide-y divide-zinc-100">
          {TEMPLATE_META.map(({ key, label, variables }) => (
            <div key={key} className="px-6 py-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-sm font-medium text-zinc-800">{label}</p>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {variables.map(v => (
                      <span
                        key={v}
                        className="text-[11px] font-mono bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded border border-pink-100"
                      >
                        [{v}]
                      </span>
                    ))}
                  </div>
                </div>
                {isAdmin && editKey !== key && (
                  <button
                    onClick={() => startEdit(key)}
                    className="text-xs font-medium text-pink-500 hover:text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50 transition-colors shrink-0"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editKey === key ? (
                <div className="space-y-3">
                  <textarea
                    value={draftText}
                    onChange={e => setDraftText(e.target.value)}
                    rows={4}
                    aria-label={`Edit ${label} template`}
                    maxLength={1000}
                    className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-3 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all resize-none leading-relaxed"
                  />
                  <div className="flex items-center gap-2 justify-end" aria-live="polite">
                    {templateSaved && (
                      <span className="text-xs text-emerald-600 font-medium">Saved</span>
                    )}
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveTemplate}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90"
                      style={{ background: '#eea4bb' }}
                    >
                      <Save className="w-3.5 h-3.5" aria-hidden="true" />
                      Save Template
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-600 leading-relaxed bg-zinc-50/50 rounded-xl px-4 py-3 border border-zinc-100">
                  {templates[key]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Notification Log ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">Notification Log</h3>
          <p className="text-xs text-zinc-400 mt-0.5">All outgoing email notifications and delivery status</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50/50">
              <tr className="border-b border-zinc-100">
                {['Recipient', 'Template', 'Status', 'Sent At'].map(h => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.map(row => (
                <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-zinc-900 font-medium">{row.recipient_email}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{toTitle(row.trigger_event)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge value={toTitle(row.status)} />
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{formatDate(row.queued_at)}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-400">
                    No notifications sent yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
