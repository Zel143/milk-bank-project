import { useEffect, useState } from 'react'
import { Archive, ClipboardList, Droplets, Send, Users } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { supabase } from '../../../lib/supabase'
import { toProgramLabel, toTitle } from '../../exportUtils'

type Batch = { id: string; status: string; program: string; total_volume_ml: number }
type Inquiry = { id: string; status: string; beneficiaries?: { guardian_name: string; baby_name: string } | null }
export function DashboardScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [batches, setBatches] = useState<Batch[]>([]); const [donorCount, setDonorCount] = useState(0); const [inquiries, setInquiries] = useState<Inquiry[]>([])
  useEffect(() => { void Promise.all([supabase.from('batches').select('id,status,program,total_volume_ml'), supabase.from('donors').select('id', { count: 'exact', head: true }), supabase.from('inquiries').select('id,status,beneficiaries(guardian_name,baby_name)').neq('status','cancelled')]).then(([b,d,i]) => { setBatches((b.data ?? []) as Batch[]); setDonorCount(d.count ?? 0); setInquiries((i.data ?? []) as Inquiry[]) }) }, [])
  const collected = batches.reduce((s,b) => s + Number(b.total_volume_ml), 0)
  const ready = batches.filter((b) => b.status === 'ready').reduce((s,b) => s + Number(b.total_volume_ml), 0)
  const dispensed = batches.filter((b) => b.status === 'dispensed').reduce((s,b) => s + Number(b.total_volume_ml), 0)
  const cards = [{ label: 'Total Milk', value: `${collected} mL`, icon: Droplets, screen: 'collection' }, { label: 'Ready', value: `${ready} mL`, icon: Archive, screen: 'inventory' }, { label: 'Donors', value: donorCount, icon: Users, screen: 'donors' }, { label: 'Inquiries', value: inquiries.length, icon: ClipboardList, screen: 'inquiry' }, { label: 'Dispensed', value: `${dispensed} mL`, icon: Send, screen: 'dispensing' }]
  const byProgram = batches.reduce<Record<string, number>>((acc,b) => { acc[b.program] = (acc[b.program] ?? 0) + Number(b.total_volume_ml); return acc }, {})
  return <div><PageHeader crumbs={[{ label: 'Overview' }]} title="Dashboard" subtitle="Live Supabase operational summary" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">{cards.map((card) => { const Icon = card.icon; return <button key={card.label} onClick={() => onNavigate(card.screen)} className="bg-white rounded-2xl border p-4 text-left"><Icon className="w-4 h-4 text-[#eea4bb]" /><div className="text-2xl mt-3 text-[#322e2d]">{card.value}</div><div className="text-xs text-[#6B7280]">{card.label}</div></button> })}</div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><div className="bg-white rounded-2xl border p-5"><h3 className="font-semibold mb-3">Volume by Program</h3>{Object.entries(byProgram).map(([program, volume]) => <div key={program} className="flex justify-between border-t py-2 text-sm"><span>{toProgramLabel(program)}</span><span>{volume} mL</span></div>)}</div><div className="bg-white rounded-2xl border p-5"><h3 className="font-semibold mb-3">Active Inquiries</h3>{inquiries.map((row) => <div key={row.id} className="flex justify-between border-t py-2 text-sm"><span>{row.beneficiaries?.guardian_name} / {row.beneficiaries?.baby_name}</span><span>{toTitle(row.status)}</span></div>)}</div></div>
  </div>
}