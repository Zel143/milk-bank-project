import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { supabase } from '../../../lib/supabase'
import { exportCsv, exportExcel, toProgramLabel, toTitle, type ExportRow } from '../../exportUtils'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

type Collection = { id: string; program: string; volume_ml: number; collected_at: string }
type Batch = { id: string; status: string; program: string; total_volume_ml: number }
type Donor = { id: string }
type Dispense = { id: string; volume_ml: number; total_fee: number; dispensed_at: string | null; status: string; beneficiary_id: string }

const STATUS_COLORS = {
  'Ready': '#FF5D8F',
  'In Testing': '#FF87AB',
  'Pasteurized': '#FFA6C1',
  'Raw': '#FFC4D6',
  'Dispensed': '#FADDE1',
  'Discarded': '#F4ACB7'
}

const STATS_PALETTE = [
  '#FF97B7', '#FFACC5', '#FFCAD4', '#FF5D8F',
  '#FF87AB', '#FFA6C1', '#FFC4D6', '#FADDE1', '#F4ACB7'
]

export function ReportsScreen() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [donors, setDonors] = useState<Donor[]>([])
  const [dispensing, setDispensing] = useState<Dispense[]>([])

  useEffect(() => {
    void Promise.all([
      supabase.from('collections').select('id,program,volume_ml,collected_at'),
      supabase.from('batches').select('id,status,program,total_volume_ml'),
      supabase.from('donors').select('id'),
      supabase.from('dispensing_records').select('id,volume_ml,total_fee,dispensed_at,status,beneficiary_id').eq('status', 'confirmed')
    ]).then(([c,b,d,ds]) => {
      setCollections((c.data ?? []) as Collection[])
      setBatches((b.data ?? []) as Batch[])
      setDonors((d.data ?? []) as Donor[])
      setDispensing((ds.data ?? []) as Dispense[])
    })
  }, [])

  // Derived Stats
  const volCollected = collections.reduce((s, c) => s + Number(c.volume_ml), 0)
  
  const volPasteurized = batches
    .filter(b => ['pasteurized', 'post_testing', 'ready', 'dispensed'].includes(b.status))
    .reduce((s, b) => s + Number(b.total_volume_ml), 0)
    
  const volDispensed = dispensing.reduce((s, d) => s + Number(d.volume_ml), 0)
  
  const volDiscarded = batches
    .filter(b => b.status === 'discarded')
    .reduce((s, b) => s + Number(b.total_volume_ml), 0)

  const discardRate = volCollected > 0 ? ((volDiscarded / volCollected) * 100).toFixed(1) + '%' : '0%'
  const uniqueRecipients = new Set(dispensing.map(d => d.beneficiary_id)).size

  const stats = [
    { label: 'Collections', value: collections.length, sub: 'batches' },
    { label: 'Volume Collected', value: volCollected, sub: 'mL' },
    { label: 'Volume Pasteurized', value: volPasteurized, sub: 'mL' },
    { label: 'Volume Dispensed', value: volDispensed, sub: 'mL' },
    { label: 'Volume Discarded', value: volDiscarded, sub: 'mL' },
    { label: 'Donors Registered', value: donors.length, sub: 'donors' },
    { label: 'Recipients Served', value: uniqueRecipients, sub: 'recipients' },
    { label: 'Discard Rate', value: discardRate, sub: '' }
  ]

  // Pie Chart Data
  const pieDataMap = {
    'Ready': 0,
    'In Testing': 0,
    'Pasteurized': 0,
    'Raw': 0,
    'Dispensed': 0,
    'Discarded': 0
  }

  batches.forEach(b => {
    let key = 'Raw'
    if (['pre_testing', 'post_testing'].includes(b.status)) key = 'In Testing'
    else if (b.status === 'ready') key = 'Ready'
    else if (b.status === 'pasteurized') key = 'Pasteurized'
    else if (b.status === 'dispensed') key = 'Dispensed'
    else if (b.status === 'discarded') key = 'Discarded'
    
    pieDataMap[key as keyof typeof pieDataMap] += Number(b.total_volume_ml)
  })

  const pieData = Object.entries(pieDataMap)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))

  // Ledger Logic
  const programs = ['in_house', 'moms_act', 'milky_way', 'supsup_todo']
  const ledgerRows = programs.map(prog => {
    const progCollections = collections.filter(c => c.program === prog)
    const progBatches = batches.filter(b => b.program === prog)
    
    const rawVolume = progCollections.reduce((sum, c) => sum + Number(c.volume_ml), 0)
    const qaFailure = progBatches.filter(b => b.status === 'discarded').reduce((sum, b) => sum + Number(b.total_volume_ml), 0)
    
    const netToPast = Math.max(0, rawVolume - qaFailure)
    
    const carryover = progBatches
      .filter(b => ['pasteurized', 'post_testing', 'ready', 'pre_testing', 'pre_test_passed', 'raw'].includes(b.status))
      .reduce((sum, b) => sum + Number(b.total_volume_ml), 0)

    return {
      program: toProgramLabel(prog),
      rawVolume,
      qaFailure: qaFailure > 0 ? -qaFailure : 0,
      netToPast,
      carryover
    }
  }).filter(r => r.rawVolume > 0 || r.carryover > 0)

  const ledgerTotals = ledgerRows.reduce((acc, row) => ({
    rawVolume: acc.rawVolume + row.rawVolume,
    qaFailure: acc.qaFailure + row.qaFailure,
    netToPast: acc.netToPast + row.netToPast,
    carryover: acc.carryover + row.carryover
  }), { rawVolume: 0, qaFailure: 0, netToPast: 0, carryover: 0 })

  const reportRows: ExportRow[] = ledgerRows.map(r => ({
    Program: r.program,
    CollectedML: r.rawVolume,
    DiscardedML: r.qaFailure,
    NetToPasteurizationML: r.netToPast,
    CarryoverBalanceML: r.carryover
  }))

  return (
    <div className="space-y-6">
      <PageHeader 
        crumbs={[{ label: 'Reports' }]} 
        title="Reports" 
        subtitle="Auto-generated operational reports with export to PDF and Excel" 
        actions={
          <div className="flex gap-2">
            <button onClick={() => exportCsv('milk-bank-report', reportRows)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-zinc-200 rounded-xl bg-white shadow-sm hover:bg-zinc-50 transition-colors"><Download className="w-4 h-4" /> CSV</button>
            <button onClick={() => exportExcel('milk-bank-report', reportRows)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-zinc-200 rounded-xl bg-white shadow-sm hover:bg-zinc-50 transition-colors"><Download className="w-4 h-4" /> Excel</button>
          </div>
        } 
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-3xl border border-zinc-100 p-6 shadow-sm flex flex-col overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-3xl" style={{ backgroundColor: STATS_PALETTE[i % STATS_PALETTE.length] }} />
            <div className="text-3xl font-bold font-mono tracking-tight tabular-nums" style={{ color: STATS_PALETTE[i % STATS_PALETTE.length] }}>
              {typeof s.value === 'number' ? new Intl.NumberFormat('en-PH').format(s.value) : s.value}
            </div>
            <div className="text-sm font-semibold text-zinc-800 mt-2">{s.label}</div>
            <div className="text-xs font-mono text-zinc-400 uppercase mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 col-span-1">
          <div className="mb-4">
            <h3 className="font-semibold text-zinc-900">Inventory by Status</h3>
            <p className="text-sm text-zinc-500">Volume distribution (mL)</p>
          </div>
          
          {pieData.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="relative h-52 w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={84}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        new Intl.NumberFormat('en-PH').format(value) + ' mL', name
                      ]}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono tabular-nums" style={{ color: '#322e2d' }}>
                      {new Intl.NumberFormat('en-PH').format(pieData.reduce((s, d) => s + d.value, 0))}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mt-0.5">mL total</div>
                  </div>
                </div>
              </div>
              <div className="w-full space-y-2">
                {Object.keys(STATUS_COLORS).map(status => {
                  const val = pieDataMap[status as keyof typeof pieDataMap]
                  return (
                    <div key={status} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] }}></div>
                        <span className="text-zinc-600">{status}</span>
                      </div>
                      <span className="font-mono font-medium text-zinc-900">{val} mL</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-zinc-400 text-sm bg-zinc-50 rounded-2xl">
              No data available
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden col-span-2 flex flex-col">
          <div className="p-6 border-b border-zinc-100 bg-white">
            <h3 className="font-semibold text-zinc-900">Collection Unit Ledger</h3>
            <p className="text-sm text-zinc-500">Breakdown by program with QA failure adjustments and carryover balances</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  {['Program', 'Raw Volume (mL)', 'QA Failure Adj. (mL)', 'Net to Pasteurization (mL)', 'Carryover Balance (mL)'].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-mono font-semibold text-zinc-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {ledgerRows.map((row) => (
                  <tr key={row.program} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-zinc-700">{row.program}</td>
                    <td className="px-6 py-4 text-sm font-mono text-zinc-900">{row.rawVolume}</td>
                    <td className={`px-6 py-4 text-sm font-mono ${row.qaFailure < 0 ? 'text-red-500' : 'text-zinc-400'}`}>{row.qaFailure}</td>
                    <td className="px-6 py-4 text-sm font-mono text-zinc-900">{row.netToPast}</td>
                    <td className="px-6 py-4 text-sm font-mono text-zinc-900">{row.carryover}</td>
                  </tr>
                ))}
                {ledgerRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-zinc-400">No ledger data available.</td>
                  </tr>
                )}
                {ledgerRows.length > 0 && (
                  <tr style={{ backgroundColor: '#FADDE1' }}>
                    <td className="px-6 py-4 text-sm font-bold" style={{ color: '#FF5D8F' }}>Total</td>
                    <td className="px-6 py-4 text-sm font-mono font-bold" style={{ color: '#FF5D8F' }}>{ledgerTotals.rawVolume}</td>
                    <td className="px-6 py-4 text-sm font-mono font-bold" style={{ color: '#FF5D8F' }}>{ledgerTotals.qaFailure}</td>
                    <td className="px-6 py-4 text-sm font-mono font-bold" style={{ color: '#FF5D8F' }}>{ledgerTotals.netToPast}</td>
                    <td className="px-6 py-4 text-sm font-mono font-bold" style={{ color: '#FF5D8F' }}>{ledgerTotals.carryover}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}