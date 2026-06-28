import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { ActiveProgram, AppUser, Screen, CreateAccessAccountInput } from './types'
import { ProgramContext } from '../lib/programContext'
import { Layout } from './components/Layout'
import { LoginScreen } from './components/screens/LoginScreen'
import { AdminAccountsScreen } from './components/screens/AdminAccountsScreen'
import { DashboardScreen } from './components/screens/DashboardScreen'
import { DonorManagementScreen } from './components/screens/DonorManagementScreen'
import { MilkCollectionScreen } from './components/screens/MilkCollectionScreen'
import { LabTestingScreen } from './components/screens/LabTestingScreen'
import { PasteurizationScreen } from './components/screens/PasteurizationScreen'
import { InventoryScreen } from './components/screens/InventoryScreen'
import { RecipientManagementScreen } from './components/screens/RecipientManagementScreen'
import { InquiryWaitingListScreen } from './components/screens/InquiryWaitingListScreen'
import { SMSNotificationsScreen } from './components/screens/SMSNotificationsScreen'
import { DispensingScreen } from './components/screens/DispensingScreen'
import { ReportsScreen } from './components/screens/ReportsScreen'
import { AuditLogScreen } from './components/screens/AuditLogScreen'
import { AccountSettingsScreen } from './components/screens/AccountSettingsScreen'
import { supabase } from '../lib/supabase'

function ScreenContent({
  screen,
  user,
  onNavigate,
}: {
  screen: Screen
  user: AppUser
  onNavigate: (s: Screen) => void
}) {
  switch (screen) {
    case 'dashboard':
      return <DashboardScreen onNavigate={onNavigate} />
    case 'donors':
      return <DonorManagementScreen />
    case 'collection':
      return <MilkCollectionScreen />
    case 'lab':
      return <LabTestingScreen />
    case 'pasteurization':
      return <PasteurizationScreen />
    case 'inventory':
      return <InventoryScreen />
    case 'recipients':
      return <RecipientManagementScreen />
    case 'inquiry':
      return <InquiryWaitingListScreen />
    case 'sms':
      return <SMSNotificationsScreen user={user} />
    case 'dispensing':
      return <DispensingScreen user={user} />
    case 'reports':
      return <ReportsScreen />
    case 'audit':
      return <AuditLogScreen />
    case 'users':
      return <AdminAccountsScreen />
    case 'settings':
      return <AccountSettingsScreen user={user} />
    default:
      return <DashboardScreen onNavigate={onNavigate} />
  }
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [activeProgram, setActiveProgram] = useState<ActiveProgram>('All')
  const [statusNotice, setStatusNotice] = useState<string | undefined>(undefined)
  const [statusError, setStatusError] = useState<string | undefined>(undefined)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsInitializing(false)
        return
      }
      if (event === 'TOKEN_REFRESHED') return
      if (session?.user) {
        loadProfile(session.user.id, session.user.email!, session.user.user_metadata)
      } else {
        setIsInitializing(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(
    userId: string,
    email: string,
    userMeta?: Record<string, unknown>,
  ): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile row yet — auto-create from signup metadata (first login after email confirm)
        const fullName = typeof userMeta?.full_name === 'string' ? userMeta.full_name.trim() : ''
        if (!fullName) {
          await supabase.auth.signOut()
          setUser(null)
          setStatusError('Account setup is incomplete. Please contact an administrator.')
          setIsInitializing(false)
          return
        }

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email.toLowerCase(),
            full_name: fullName,
            role: 'staff',
            is_active: true,
          })
          .select()
          .single()

        if (insertError || !newProfile) {
          await supabase.auth.signOut()
          setUser(null)
          setStatusError(
            insertError?.message
              ? `Account setup failed: ${insertError.message}`
              : 'Account setup failed. Please contact an administrator.',
          )
          setIsInitializing(false)
          return
        }

        applyProfile(newProfile)
        return
      }

      await supabase.auth.signOut()
      setUser(null)
      setStatusError('Failed to load your profile. Please try again.')
      setIsInitializing(false)
      return
    }

    if (!data.is_active) {
      await supabase.auth.signOut()
      setUser(null)
      setStatusError('Your account has been deactivated. Contact an administrator to reactivate it.')
      setIsInitializing(false)
      return
    }

    applyProfile(data)
  }

  function applyProfile(data: { full_name: string; role: string }) {
    const initials =
      data.full_name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase() ?? '')
        .join('') || 'MH'

    setUser({
      name: data.full_name,
      role: data.role === 'admin' ? 'Administrator' : 'Nurse',
      initials,
    })
    setIsInitializing(false)
  }

  async function handleLogin(credentials: { email: string; password: string }): Promise<void> {
    setStatusError(undefined)
    setStatusNotice(undefined)
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    if (error) {
      const msg = error.message ?? ''
      if (msg.toLowerCase().includes('email not confirmed')) {
        setStatusError('Please confirm your email first — check your inbox for the confirmation link.')
      } else if (msg.toLowerCase().includes('invalid login credentials')) {
        setStatusError('Incorrect email or password. Please try again.')
      } else if (msg.toLowerCase().includes('too many requests')) {
        setStatusError('Too many attempts. Please wait a moment before trying again.')
      } else {
        setStatusError(msg || 'Sign in failed. Please try again.')
      }
    }
  }

  async function handleRegisterRequest(account: CreateAccessAccountInput): Promise<boolean> {
    setStatusError(undefined)
    setStatusNotice(undefined)

    const { error } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: {
        data: {
          full_name: account.fullName,
          role: 'staff',
        },
      },
    })

    if (error) {
      const msg = error.message ?? ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('user already exists')) {
        setStatusError('An account with that email already exists. Try signing in instead.')
      } else {
        setStatusError(msg || 'Registration failed. Please try again.')
      }
      return false
    }

    // Email confirmation is required — session is null until the link is clicked.
    // The profile row is created automatically on first sign-in after confirmation.
    setStatusNotice(
      `Check your inbox at ${account.email} and click the confirmation link to activate your account.`,
    )
    return true
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setScreen('dashboard')
  }

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F8F7F5]">Loading session...</div>
  }

  if (!user) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onRegisterRequest={handleRegisterRequest}
        notice={statusNotice}
        error={statusError}
      />
    )
  }

  return (
    <ProgramContext.Provider value={activeProgram}>
      <Layout
        user={user}
        currentScreen={screen}
        activeProgram={activeProgram}
        onNavigate={(s) => setScreen(s)}
        onProgramChange={setActiveProgram}
        onLogout={handleLogout}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <ScreenContent screen={screen} user={user} onNavigate={setScreen} />
          </motion.div>
        </AnimatePresence>
      </Layout>
    </ProgramContext.Provider>
  )
}
