import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  LayoutDashboard, Users, Droplets, FlaskConical, Thermometer,
  Archive, HeartHandshake, ClipboardList, MessageSquare, Send,
  FileBarChart2, ScrollText, ChevronLeft, ChevronRight, ChevronDown,
  UserCog, LogOut, Menu, Settings, Check
} from 'lucide-react'
import type { ActiveProgram, AppUser, Screen } from '../types'

interface NavItem {
  id: Screen | string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
  /** If set, the item is only shown when activeProgram is in this list. */
  programs?: ActiveProgram[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    label: 'Donors',
    items: [
      {
        id: 'donors',
        label: 'Donor Management',
        icon: <Users className="w-[18px] h-[18px]" />,
        // Milky Way and Mom's Act donors are pre-screened externally
        programs: ['All', 'Supsup Todo'],
      },
    ],
  },
  {
    label: 'Milk Lifecycle',
    items: [
      { id: 'collection', label: 'Collection', icon: <Droplets className="w-[18px] h-[18px]" /> },
      { id: 'lab', label: 'Lab Testing', icon: <FlaskConical className="w-[18px] h-[18px]" /> },
      { id: 'pasteurization', label: 'Pasteurization', icon: <Thermometer className="w-[18px] h-[18px]" /> },
      { id: 'inventory', label: 'Inventory', icon: <Archive className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    label: 'Recipients',
    items: [
      { id: 'recipients', label: 'Recipients', icon: <HeartHandshake className="w-[18px] h-[18px]" /> },
      {
        id: 'inquiry',
        label: 'Inquiries & Waiting',
        icon: <ClipboardList className="w-[18px] h-[18px]" />,
        // Mom's Act is a direct household pickup — no inquiry/waitlist flow
        programs: ['All', 'Supsup Todo', 'Milky Way'],
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'dispensing', label: 'Dispensing', icon: <Send className="w-[18px] h-[18px]" /> },
      { id: 'sms', label: 'Notifications', icon: <MessageSquare className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    label: 'Reports & Admin',
    items: [
      { id: 'reports', label: 'Reports', icon: <FileBarChart2 className="w-[18px] h-[18px]" /> },
      { id: 'audit', label: 'Audit Log', icon: <ScrollText className="w-[18px] h-[18px]" />, adminOnly: true },
      { id: 'users', label: 'User Management', icon: <UserCog className="w-[18px] h-[18px]" />, adminOnly: true },
    ],
  },
]

const SCREEN_TITLES: Partial<Record<Screen, string>> = {
  dashboard: 'Dashboard',
  donors: 'Donor Management',
  collection: 'Milk Collection',
  lab: 'Lab Testing',
  pasteurization: 'Pasteurization',
  inventory: 'Inventory',
  recipients: 'Recipient Management',
  inquiry: 'Inquiry & Waiting List',
  dispensing: 'Dispensing',
  sms: 'Notifications',
  reports: 'Reports',
  audit: 'Audit Log',
}

const ALL_PROGRAMS: ActiveProgram[] = ['All', 'Supsup Todo', 'Milky Way', "Mom's Act"]

const PROGRAM_ABBREV: Record<ActiveProgram, string> = {
  'All': '··',
  'Supsup Todo': 'ST',
  'Milky Way': 'MW',
  "Mom's Act": 'MA',
}

interface LayoutProps {
  user: AppUser
  currentScreen: Screen
  activeProgram: ActiveProgram
  onNavigate: (screen: Screen) => void
  onProgramChange: (program: ActiveProgram) => void
  onLogout: () => void
  children: React.ReactNode
}

export function Layout({ user, currentScreen, activeProgram, onNavigate, onProgramChange, onLogout, children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [programOpen, setProgramOpen] = useState(false)
  const programRef = useRef<HTMLDivElement>(null)
  const isAdmin = user.role === 'Administrator'

  useEffect(() => {
    if (!programOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (programRef.current && !programRef.current.contains(e.target as Node)) {
        setProgramOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [programOpen])

  function handleProgramChange(program: ActiveProgram) {
    onProgramChange(program)
    setProgramOpen(false)
    // Auto-redirect to dashboard if the current screen is hidden in the new program
    const screenItem = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === currentScreen)
    if (screenItem?.programs && !screenItem.programs.includes(program)) {
      onNavigate('dashboard')
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#322e2d' }}>
      {/* Brand */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#eea4bb' }}
        >
          <Droplets className="w-4 h-4" style={{ color: '#322e2d' }} />
        </div>
        {!collapsed && (
          <div>
            <div
              className="text-sm text-white leading-none"
              style={{ fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              Mother's Reach
            </div>
            <div
              className="text-[10px] mt-0.5 leading-none"
              style={{ color: '#7a7573', fontFamily: 'var(--font-family-mono)' }}
            >
              MHMB Clinical Ops
            </div>
          </div>
        )}
      </div>

      {/* Program Switcher */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {collapsed ? (
          // Compact collapsed indicator — click to expand + open switcher
          <button
            onClick={() => { setCollapsed(false); setProgramOpen(true) }}
            title={`Program: ${activeProgram === 'All' ? 'All Programs' : activeProgram} — click to change`}
            className="w-full flex items-center justify-center py-3 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-[9px]"
              style={{
                background: activeProgram === 'All' ? 'rgba(255,255,255,0.06)' : 'rgba(238,164,187,0.18)',
                color: activeProgram === 'All' ? '#5a5655' : '#eea4bb',
                fontFamily: 'var(--font-family-mono)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              {PROGRAM_ABBREV[activeProgram]}
            </div>
          </button>
        ) : (
          <div className="px-3 py-2.5" ref={programRef}>
            {/* Trigger button */}
            <button
              onClick={() => setProgramOpen(o => !o)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-colors hover:bg-[rgba(255,255,255,0.05)]"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: activeProgram === 'All' ? '#5a5655' : '#eea4bb' }}
                />
                <span
                  className="text-[13px] truncate"
                  style={{ color: '#c4bfbc', fontWeight: 500 }}
                >
                  {activeProgram === 'All' ? 'All Programs' : activeProgram}
                </span>
              </div>
              <motion.div
                animate={{ rotate: programOpen ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: '#5a5655' }} />
              </motion.div>
            </button>

            {/* Options list */}
            <AnimatePresence>
              {programOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="pt-1 space-y-0.5">
                    {ALL_PROGRAMS.map(program => {
                      const isSelected = activeProgram === program
                      return (
                        <button
                          key={program}
                          onClick={() => handleProgramChange(program)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                          style={{ color: isSelected ? '#eea4bb' : '#7a7573' }}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: isSelected ? '#eea4bb' : '#3d3836' }}
                          />
                          <span className="flex-1 text-left" style={{ fontWeight: isSelected ? 600 : 400 }}>
                            {program === 'All' ? 'All Programs' : program}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="app-scrollbar app-scrollbar-dark flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_GROUPS.map((group) => {
          // Hide items that don't belong to the active program
          const filteredItems = group.items.filter(item => {
            const programOk = !item.programs || item.programs.includes(activeProgram)
            // Admin-only items for non-admins: always show (grayed), not program-filtered
            if (item.adminOnly) return true
            return programOk
          })

          if (filteredItems.length === 0) return null

          return (
            <div key={group.label}>
              {!collapsed && (
                <div
                  className="px-2 mb-1.5 text-[9px] tracking-[0.12em] uppercase"
                  style={{ color: '#5a5655', fontFamily: 'var(--font-family-mono)' }}
                >
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {filteredItems.map((item) => {
                  const isActive = currentScreen === item.id
                  const isGrayed = item.adminOnly && !isAdmin

                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => {
                        if (!isGrayed) {
                          onNavigate(item.id as Screen)
                          setMobileOpen(false)
                        }
                      }}
                      disabled={isGrayed}
                      whileHover={!isGrayed && !isActive ? { x: 2 } : {}}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                        transition-colors relative group
                        ${isActive
                          ? 'text-[#322e2d]'
                          : isGrayed
                            ? 'text-[#3d3836] cursor-not-allowed'
                            : 'text-[#9a9694] hover:text-[#d4cfc8] hover:bg-[rgba(255,255,255,0.05)]'
                        }
                      `}
                      style={isActive ? { background: '#eea4bb' } : {}}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                          style={{ background: '#d98daa' }}
                        />
                      )}
                      <span className={isActive ? 'text-[#322e2d]' : ''}>{item.icon}</span>
                      {!collapsed && (
                        <span className="text-sm leading-none tracking-[-0.01em]">{item.label}</span>
                      )}
                      {!collapsed && isGrayed && (
                        <span
                          className="ml-auto text-[9px] px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(255,255,255,0.04)', color: '#5a5655', fontFamily: 'var(--font-family-mono)' }}
                        >
                          ADMIN
                        </span>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-[11px] transition-colors hover:bg-[rgba(255,255,255,0.04)]"
          style={{ color: '#5a5655' }}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          {!collapsed && <span style={{ fontFamily: 'var(--font-family-mono)' }}>Collapse</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8F7F5' }}>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden lg:flex flex-col overflow-hidden shrink-0 h-full relative z-20"
        style={{ boxShadow: '2px 0 24px rgba(50,46,45,0.15)' }}
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 backdrop-blur-sm"
              style={{ background: 'rgba(50,46,45,0.6)' }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header
          className="flex items-center justify-between px-6 py-3 shrink-0 z-10"
          style={{
            background: 'rgba(248,247,245,0.90)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(99,98,96,0.10)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-[#F8F0F4] transition-colors text-[#636260]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <div
                className="text-base text-[#322e2d] leading-none"
                style={{ fontWeight: 700, letterSpacing: '-0.02em' }}
              >
                {SCREEN_TITLES[currentScreen] ?? 'Dashboard'}
              </div>
              <div className="text-[11px] text-[#636260] mt-0.5 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-family-mono)' }}>
                Makati Human Milk Bank
                {activeProgram !== 'All' && (
                  <>
                    <span style={{ color: '#c4bfbc' }}>·</span>
                    <span style={{ color: '#eea4bb' }}>{activeProgram}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setAccountOpen((current) => !current)}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-[#F8F0F4] transition-colors"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] shrink-0"
                  style={{ background: '#eea4bb', color: '#322e2d', fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}
                >
                  {user.initials}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs text-[#322e2d] leading-none" style={{ fontWeight: 600 }}>{user.name.split(',')[0]}</div>
                  <div className="text-[10px] text-[#636260] leading-none mt-0.5" style={{ fontFamily: 'var(--font-family-mono)' }}>{user.role}</div>
                </div>
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border bg-white p-1 shadow-lg">
                  <button onClick={() => { onNavigate('settings'); setAccountOpen(false) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#322e2d] hover:bg-[#F8F0F4]"><Settings className="w-4 h-4" />Settings</button>
                  <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#322e2d] hover:bg-[#F8F0F4]"><LogOut className="w-4 h-4" />Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="app-scrollbar flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
