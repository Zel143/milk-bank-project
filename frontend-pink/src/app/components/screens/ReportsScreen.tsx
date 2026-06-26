import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { supabase } from '../../../lib/supabase'
import { exportCsv, exportExcel, toProgramLabel, toTitle, type ExportRow } from '../../exportUtils'

type Collection = { id: string; program: string; volume_ml: number; collected_at: string }
type Batch = { id: string; status: string; program: string; total_volume_ml: number }
type Donor = { id: string }
type Beneficiary = { id: string }
type Dispense = { id: string; volume_ml: number; total_fee: number; dispensed_at: string | null }

export function ReportsScreen() {
  const [collections, setCollections] = useState<Collection[]>([]); const [batches, setBatches] = useState<Batch[]>([]); const [donors, setDonors] = useState<Donor[]>([]); const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]); const [dispensing, setDispensing] = useState<Dispense[]>([])
  useEffect(() => { void Promise.all([supabase.from('collections').select('id,program,volume_ml,collected_at'), supabase.from('batches').select('id,status,program,total_volume_ml'), supabase.from('donors').select('id'), supabase.from('beneficiaries').select('id'), supabase.from('dispensing_records').select('id,volume_ml,total_fee,dispensed_at')]).then(([c,b,d,r,ds]) => { setCollections((c.data ?? []) as Collection[]); setBatches((b.data ?? []) as Batch[]); setDonors((d.data ?? []) as Donor[]); setBeneficiaries((r.data ?? []) as Beneficiary[]); setDispensing((ds.data ?? []) as Dispense[]) }) }, [])
  const reportRows: ExportRow[] = useMemo(() => {
    const byProgram = collections.reduce<Record<string, number>>((acc, row) => { acc[row.program] = (acc[row.program] ?? 0) + Number(row.volume_ml); return acc }, {})
    return Object.entries(byProgram).map(([program, volume]) => ({ Program: toProgramLabel(program), CollectedML: volume, BatchCount: batches.filter((b) => b.program === program).length, ReadyML: batches.filter((b) => b.program === program && b.status === 'ready').reduce((s, b) => s + Number(b.total_volume_ml), 0), DispensedML: dispensing.reduce((s, d) => s + Number(d.volume_ml), 0) }))
  }, [collections, batches, dispensing])
  const stats = [{ label: 'Collections', value: collections.length }, { label: 'Volume Collected', value: collections.reduce((s, c) => s + Number(c.volume_ml), 0) + ' mL' }, { label: 'Batches', value: batches.length }, { label: 'Donors', value: donors.length }, { label: 'Recipients', value: beneficiaries.length }, { label: 'Dispensed', value: dispensing.reduce((s, d) => s + Number(d.volume_ml), 0) + ' mL' }]
  return <div><PageHeader crumbs={[{ label: 'Reports' }]} title="Reports" subtitle="Dynamic Supabase reports with CSV and Excel export" actions={<div className="flex gap-2"><button onClick={() => exportCsv('milk-bank-report', reportRows)} className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white"><Download className="w-4 h-4" />CSV</button><button onClick={() => exportExcel('milk-bank-report', reportRows)} className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white"><Download className="w-4 h-4" />Excel</button></div>} />
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">{stats.map((s) => <div key={s.label} className="bg-white rounded-2xl border p-4"><div className="text-2xl text-[#eea4bb]">{s.value}</div><div className="text-sm text-[#6B7280]">{s.label}</div></div>)}</div>
    <div className="bg-white rounded-2xl border overflow-x-auto"><table className="w-full"><thead><tr>{['Program','Collected mL','Batch Count','Ready mL','Status Volumes'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs text-[#6B7280]">{h}</th>)}</tr></thead><tbody>{reportRows.map((row) => <tr key={String(row.Program)} className="border-t"><td className="px-4 py-3 text-sm">{row.Program}</td><td className="px-4 py-3 text-sm">{row.CollectedML}</td><td className="px-4 py-3 text-sm">{row.BatchCount}</td><td className="px-4 py-3 text-sm">{row.ReadyML}</td><td className="px-4 py-3 text-sm">{batches.filter((b) => toProgramLabel(b.program) === row.Program).map((b) => `${toTitle(b.status)}:${b.total_volume_ml}`).join(', ')}</td></tr>)}</tbody></table></div>
  </div>
}