import { useEffect, useState } from 'react'
import { PageHeader } from '../shared/PageHeader'
import { supabase } from '../../../lib/supabase'
import { formatDate, toTitle } from '../../exportUtils'
import type { AppUser } from '../../types'

type EmailLog = { id: string; recipient_email: string; trigger_event: string; status: string; queued_at: string }
export function SMSNotificationsScreen({ user }: { user: AppUser }) {
  const [rows, setRows] = useState<EmailLog[]>([])
  useEffect(() => { void supabase.from('email_notifications').select('id,recipient_email,trigger_event,status,queued_at').order('queued_at', { ascending: false }).then(({ data }) => setRows((data ?? []) as EmailLog[])) }, [])
  return <div><PageHeader crumbs={[{ label: 'Operations' }]} title="Email Notifications" subtitle={`Supabase-backed notification log for ${user.role}`} /><div className="bg-white rounded-2xl border overflow-x-auto"><table className="w-full"><thead><tr>{['Recipient','Event','Status','Queued'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs text-[#6B7280]">{h}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="px-4 py-3 text-sm">{row.recipient_email}</td><td className="px-4 py-3 text-sm">{toTitle(row.trigger_event)}</td><td className="px-4 py-3 text-sm">{toTitle(row.status)}</td><td className="px-4 py-3 text-sm">{formatDate(row.queued_at)}</td></tr>)}</tbody></table></div></div>
}