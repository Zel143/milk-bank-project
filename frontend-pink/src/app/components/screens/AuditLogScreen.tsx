import { useEffect, useState } from 'react'
import { PageHeader } from '../shared/PageHeader'
import { supabase } from '../../../lib/supabase'
import { formatDate, toTitle } from '../../exportUtils'

type Audit = { id: string; table_name: string; action: string; record_id: string | null; changed_at: string }
export function AuditLogScreen() {
  const [rows, setRows] = useState<Audit[]>([])
  useEffect(() => { void supabase.from('audit_logs').select('id,table_name,action,record_id,changed_at').order('changed_at', { ascending: false }).limit(100).then(({ data }) => setRows((data ?? []) as Audit[])) }, [])
  return <div><PageHeader crumbs={[{ label: 'Admin' }]} title="Audit Log" subtitle="Supabase audit trail" /><div className="bg-white rounded-2xl border overflow-x-auto"><table className="w-full"><thead><tr>{['Time','Table','Action','Record'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs text-[#6B7280]">{h}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="px-4 py-3 text-sm">{formatDate(row.changed_at)}</td><td className="px-4 py-3 text-sm">{row.table_name}</td><td className="px-4 py-3 text-sm">{toTitle(row.action)}</td><td className="px-4 py-3 text-xs">{row.record_id}</td></tr>)}</tbody></table></div></div>
}