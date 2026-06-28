import { useEffect, useState } from 'react'
import { Save, Lock, MessageSquare } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { StatusBadge } from '../shared/StatusBadge'
import { supabase } from '../../../lib/supabase'
import { formatDate, toTitle } from '../../exportUtils'
import type { AppUser } from '../../types'

const TEMPLATE_STORAGE_KEY = 'mhmbms_notification_templates'

const DEFAULT_TEMPLATES = {
  milkAvailable: 'Magandang araw po! Ang hinihintay na gatas para kay [BABY_NAME] ay handa na. Pumunta po kayo sa Makati Human Milk Bank sa 1126 Rodriguez Ave., Brgy. Bangkal, Makati City para sa dispensing. Para sa katanungan, tawagan po kami sa 8888-7777.',
  dispensingConfirmation: 'Kumpirmasyon: [VOLUME]mL ng pasteurized na gatas ay inilabas na para kay [BABY_NAME]. Kabuuang bayad: ₱[TOTAL_FEE]. Maraming salamat sa inyong tiwala sa Makati Human Milk Bank.',
  statusUpdate: 'Update sa inyong application: [STATUS]. Para sa karagdagang impormasyon, makipag-ugnayan po sa Makati Human Milk Bank sa 8888-7777.',
}

type Templates = typeof DEFAULT_TEMPLATES

function loadTemplates(): Templates {
  try {
    const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY)
    if (saved) return { ...DEFAULT_TEMPLATES, ...JSON.parse(saved) }
  } catch { /* ignore */ }
  return DEFAULT_TEMPLATES
}

type EmailLog = {
  id: string
  recipient_email: string
  trigger_event: string
  status: string
  queued_at: string
}

const TEMPLATE_META: { key: keyof Templates; label: string; variables: string[] }[] = [
  { key: 'milkAvailable',          label: 'Milk Available',          variables: ['[BABY_NAME]'] },
  { key: 'dispensingConfirmation', label: 'Dispensing Confirmation', variables: ['[BABY_NAME]', '[VOLUME]', '[TOTAL_FEE]'] },
  { key: 'statusUpdate',           label: 'Status Update',           variables: ['[STATUS]'] },
]

export function SMSNotificationsScreen({ user }: { user: AppUser }) {
  const isAdmin = user.role === 'Admin' || user.role === 'Administrator'
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [templates, setTemplates] = useState<Templates>(loadTemplates)
  const [editKey, setEditKey] = useState<keyof Templates | null>(null)
  const [draftText, setDraftText] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void supabase
      .from('email_notifications')
      .select('id,recipient_email,trigger_event,status,queued_at')
      .order('queued_at', { ascending: false })
      .then(({ data }) => setLogs((data ?? []) as EmailLog[]))
  }, [])

  function startEdit(key: keyof Templates) {
    setEditKey(key)
    setDraftText(templates[key])
    setSaved(false)
  }

  function saveTemplate() {
    if (!editKey) return
    const updated = { ...templates, [editKey]: draftText }
    setTemplates(updated)
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function cancelEdit() {
    setEditKey(null)
    setDraftText('')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Operations' }]}
        title="SMS Notifications"
        subtitle={isAdmin ? 'Manage notification templates and view delivery logs' : 'View notification templates and delivery logs'}
      />

      {/* Message Templates */}
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
                      <span key={v} className="text-[11px] font-mono bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded border border-pink-100">{v}</span>
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
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={4}
                    aria-label={`Edit ${label} template`}
                    maxLength={500}
                    className="w-full rounded-xl bg-zinc-50/50 border border-zinc-200 px-4 py-3 text-sm outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 transition-all resize-none leading-relaxed"
                  />
                  <div className="flex items-center gap-2 justify-end" aria-live="polite">
                    {saved && <span className="text-xs text-emerald-600 font-medium">Saved</span>}
                    <button onClick={cancelEdit} className="px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={saveTemplate}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
                      style={{ background: '#f472b6' }}
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

      {/* Notification Log */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">Notification Log</h3>
          <p className="text-xs text-zinc-400 mt-0.5">All outgoing email/SMS notifications and delivery status</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50/50">
              <tr className="border-b border-zinc-100">
                {['Recipient', 'Trigger Event', 'Status', 'Queued At'].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-zinc-900 font-medium">{row.recipient_email}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{toTitle(row.trigger_event)}</td>
                  <td className="px-6 py-4"><StatusBadge value={toTitle(row.status)} /></td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{formatDate(row.queued_at)}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-400">No notifications logged yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
