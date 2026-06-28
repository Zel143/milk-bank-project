import { useEffect, useState } from 'react'
import { Archive, ClipboardList, Droplets, Send, Users, ArrowRight } from 'lucide-react'
import { PageHeader } from '../shared/PageHeader'
import { supabase } from '../../../lib/supabase'
import { toProgramLabel, toTitle } from '../../exportUtils'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts'
import { motion } from 'motion/react'

type Batch = { id: string; status: string; program: string; total_volume_ml: number }
type ReportBase = { report_month: string; program: string; raw_collected_ml: number }
type Waitlist = { inquiry_id: string; guardian_name: string; baby_name: string; requested_at: string }

export function DashboardScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [donorCount, setDonorCount] = useState(0)
  const [reports, setReports] = useState<ReportBase[]>([])
  const [waitlist, setWaitlist] = useState<Waitlist[]>([])

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [b, d, r, w] = await Promise.all([
          supabase.from('batches').select('id,status,program,total_volume_ml'),
          supabase.from('donors').select('id', { count: 'exact', head: true }),
          supabase.from('collection_unit_report_base').select('*'),
          supabase.from('waitlist_fifo').select('*')
        ])
        
        setBatches((b.data ?? []) as Batch[])
        setDonorCount(d.count ?? 0)
        setReports((r.data ?? []) as ReportBase[])
        setWaitlist((w.data ?? []) as Waitlist[])
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      }
    }
    void fetchDashboard()
  }, [])

  const pipelineStages = [
    { id: 'raw', label: 'Raw', hex: '#FADDE1' },
    { id: 'pre_testing', label: 'Pre-Test', hex: '#FFC4D6' },
    { id: 'pre_test_passed', label: 'Test Passed', hex: '#FFACC5' },
    { id: 'pasteurized', label: 'Pasteurized', hex: '#FF97B7' },
    { id: 'post_testing', label: 'Post-Test', hex: '#FFA6C1' },
    { id: 'ready', label: 'Ready', hex: '#FF87AB' },
    { id: 'dispensed', label: 'Dispensed', hex: '#FF5D8F' },
    { id: 'discarded', label: 'Discarded', hex: '#F08080' },
  ]

  const pipelineData = pipelineStages.map(stage => {
    const stageBatches = batches.filter(b => b.status === stage.id || (b.status || '').toLowerCase() === stage.id)
    const volume = stageBatches.reduce((acc, b) => acc + Number(b.total_volume_ml), 0)
    return { ...stage, count: stageBatches.length, volume }
  })

  const PROGRAM_COLORS: Record<string, string> = {
    supsup_todo: '#f472b6',
    milky_way:   '#3f3f46',
    moms_act:    '#fb923c',
  }
  const PROGRAM_LABELS: Record<string, string> = {
    supsup_todo: 'Supsup Todo',
    milky_way:   'Milky Way',
    moms_act:    "Mom's Act",
  }

  const monthlyDataMap = new Map<string, Record<string, number>>()
  reports.forEach(r => {
    const m = r.report_month ? new Date(r.report_month).toLocaleString('default', { month: 'short' }) : 'Unknown'
    if (!monthlyDataMap.has(m)) monthlyDataMap.set(m, { name: m as unknown as number })
    const entry = monthlyDataMap.get(m)!
    entry[r.program] = (entry[r.program] || 0) + Number(r.raw_collected_ml || 0)
  })
  const monthlyChartData = Array.from(monthlyDataMap.values())
  const activePrograms = Array.from(new Set(reports.map(r => r.program)))

  const programDataMap = new Map<string, number>()
  reports.forEach(r => {
    programDataMap.set(r.program, (programDataMap.get(r.program) || 0) + Number(r.raw_collected_ml || 0))
  })
  const programChartData = Array.from(programDataMap.entries()).map(([name, value]) => ({ name: toProgramLabel(name) || name, value }))
  const programColors = ['#f472b6', '#3f3f46', '#a1a1aa', '#fb7185']

  return (
    <div className="space-y-6">
      <PageHeader crumbs={[{ label: 'Overview' }]} title="Dashboard" subtitle="Live operational summary and metrics" />
      
      {/* Milk Lifecycle Pipeline */}
      <div className="bg-[#18181b] rounded-[32px] p-8 overflow-hidden relative shadow-xl border border-zinc-800">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-white font-semibold text-xl tracking-tight">Milk Lifecycle Pipeline</h3>
            <p className="text-zinc-500 text-sm mt-1">Real-time batch status across all stages</p>
          </div>
          <button onClick={() => onNavigate('inventory')} className="text-pink-300 hover:text-pink-200 text-sm font-medium flex items-center gap-1 transition-colors">
            Full inventory <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-4 hide-scrollbar snap-x">
          {pipelineData.map((stage, idx) => (
            <motion.div 
              key={stage.id} 
              className="flex-shrink-0 bg-[#27272a] rounded-3xl p-5 w-40 snap-start border border-zinc-800 relative z-10"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.hex }} />
                <span className="text-sm font-medium tracking-wide" style={{ color: stage.hex }}>{stage.label}</span>
              </div>
              <div className="text-4xl font-semibold text-white tracking-tight font-mono">{stage.volume}</div>
              <div className="text-zinc-500 text-xs mt-1 font-mono uppercase tracking-wider">mL &middot; {stage.count}b</div>
              {idx !== pipelineData.length - 1 && (
                <div className="absolute top-1/2 -right-4 w-4 h-px bg-zinc-700 -z-10" />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Collection Volume */}
        <div className="lg:col-span-2 bg-white rounded-[32px] p-8 border border-zinc-100 shadow-sm">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-zinc-950 font-semibold text-xl tracking-tight">Monthly Collection Volume</h3>
              <p className="text-zinc-400 text-sm mt-1">mL collected per month, 2026</p>
            </div>
            <div className="bg-pink-50 text-pink-500 text-xs font-mono px-3 py-1.5 rounded-full border border-pink-100 tracking-wide uppercase">All Programs</div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  cursor={{ stroke: '#fce7f3', strokeWidth: 2 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ fontSize: 11, color: '#71717a' }}>{PROGRAM_LABELS[value] ?? value}</span>}
                />
                {activePrograms.length > 0
                  ? activePrograms.map(prog => (
                      <Line key={prog} type="monotone" dataKey={prog} stroke={PROGRAM_COLORS[prog] ?? '#a1a1aa'} strokeWidth={2.5} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                    ))
                  : <Line type="monotone" dataKey="total" stroke="#f472b6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#f472b6', stroke: '#fff', strokeWidth: 3 }} />
                }
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Program Breakdown */}
        <div className="bg-white rounded-[32px] p-8 border border-zinc-100 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-zinc-950 font-semibold text-xl tracking-tight">Program Breakdown</h3>
            <p className="text-zinc-400 text-sm mt-1">Volume by collection program</p>
          </div>
          
          <div className="space-y-5 mb-8 flex-grow">
            {programChartData.map((item, index) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-zinc-700">{item.name}</span>
                  <span className="text-zinc-400 font-mono text-xs">{item.value} mL</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / (Math.max(...programChartData.map(d => d.value)) || 1)) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full" 
                    style={{ backgroundColor: programColors[index % programColors.length] }} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="h-32 w-full mt-auto">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={programChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Tooltip cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={24}>
                  {programChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={programColors[index % programColors.length]} />
                  ))}
                </Bar>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10 }} dy={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NICU Waiting List */}
        <div className="bg-white rounded-[32px] p-8 border border-zinc-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-zinc-950 font-semibold text-xl tracking-tight">NICU Waiting List</h3>
            <button onClick={() => onNavigate('inquiry')} className="text-pink-500 hover:text-pink-600 text-sm font-medium flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {waitlist.length === 0 ? (
              <div className="text-zinc-400 text-sm py-4">No patients currently waiting.</div>
            ) : (
              waitlist.slice(0, 5).map(item => {
                const daysWaiting = Math.floor((new Date().getTime() - new Date(item.requested_at).getTime()) / (1000 * 60 * 60 * 24))
                return (
                <div key={item.inquiry_id} className="flex items-center justify-between p-4 bg-[#fbfaf9] rounded-2xl border border-zinc-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-pink-200 text-pink-700 flex items-center justify-center font-bold text-sm font-mono shrink-0">
                      {item.guardian_name ? item.guardian_name[0].toUpperCase() : 'M'}
                    </div>
                    <div>
                      <div className="font-medium text-zinc-900">{item.guardian_name}</div>
                      <div className="text-sm text-zinc-500">{item.baby_name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-pink-500 font-medium font-mono">{daysWaiting}d</div>
                    <div className="text-xs text-zinc-400 uppercase tracking-wider">waiting</div>
                  </div>
                </div>
              )})
            )}
          </div>
        </div>

        {/* Ready to Dispense — replaces vestigial Active Inquiries card */}
        <div className="bg-white rounded-[32px] p-8 border border-zinc-100 shadow-sm">
          <h3 className="text-zinc-950 font-semibold text-xl tracking-tight mb-2">Ready to Dispense</h3>
          <p className="text-zinc-400 text-sm mb-6">Pasteurized bottles available in inventory</p>
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <div className="text-5xl font-black font-mono" style={{ color: '#FF5D8F' }}>
              {batches.filter(b => b.status === 'ready').reduce((s, b) => s + Number(b.total_volume_ml), 0)}
            </div>
            <div className="text-zinc-400 text-sm font-mono uppercase tracking-wider">mL available</div>
            <div className="text-zinc-400 text-xs mt-1">
              {batches.filter(b => b.status === 'ready').length} batch{batches.filter(b => b.status === 'ready').length !== 1 ? 'es' : ''} ready
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}