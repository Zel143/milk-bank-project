import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { AppUser, Screen, CreateAccessAccountInput } from './types'
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
  const [statusNotice, setStatusNotice] = useState<string | undefined>(undefined)
  const [statusError, setStatusError] = useState<string | undefined>(undefined)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email!)
      } else {
        setIsInitializing(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email!)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string, email: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error || !data) {
      // If we are signed in but have no profile, sign out
      await supabase.auth.signOut()
      setUser(null)
      setStatusError('No access profile found for this account. Please wait for an admin to set up your profile.')
      setIsInitializing(false)
<<<<<<< HEAD
      return
=======
      return false
>>>>>>> 50d69b7a55e851b0dfcfa93ae047e6afafe71617
    }

    if (!data.is_active) {
      await supabase.auth.signOut()
      setUser(null)
      setStatusError('That account is disabled. An administrator must reactivate it before sign in.')
      setIsInitializing(false)
<<<<<<< HEAD
      return
=======
      return false
>>>>>>> 50d69b7a55e851b0dfcfa93ae047e6afafe71617
    }

    const initials = data.full_name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase() ?? '')
      .join('') || 'MH'

    setUser({
      name: data.full_name,
      role: data.role === 'admin' ? 'Administrator' : 'Nurse', // In a real app we'd map this properly or use an extended role column
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
      setStatusError(error.message)
    }
  }

<<<<<<< HEAD
  async function handleRegisterRequest(account: CreateAccessAccountInput): Promise<void> {
=======
  async function handleRegisterRequest(account: CreateAccessAccountInput): Promise<boolean> {
>>>>>>> 50d69b7a55e851b0dfcfa93ae047e6afafe71617
    setStatusError(undefined)
    setStatusNotice(undefined)
    const { data, error } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: {
        data: {
          full_name: account.fullName,
<<<<<<< HEAD
=======
          role: 'staff',
>>>>>>> 50d69b7a55e851b0dfcfa93ae047e6afafe71617
        }
      }
    })

    if (error) {
      setStatusError(error.message)
<<<<<<< HEAD
      return
    }

    if (data.user) {
      // Create profile manually since there is no trigger
      const { error: profileError } = await supabase.from('profiles').insert({
=======
      return false
    }

    if (data.user) {
      // Create profile manually since this frontend does not rely on a database trigger yet.
      const { error: profileError } = await supabase.from('profiles').upsert({
>>>>>>> 50d69b7a55e851b0dfcfa93ae047e6afafe71617
        id: data.user.id,
        email: account.email.toLowerCase(),
        full_name: account.fullName,
        role: 'staff',
<<<<<<< HEAD
        is_active: false,
      })

      if (profileError) {
        setStatusError('Account created but failed to stage profile: ' + profileError.message)
        return
=======
        is_active: true,
      }, { onConflict: 'id' })

      if (profileError) {
        setStatusError('Account created but failed to stage profile: ' + profileError.message)
        return false
>>>>>>> 50d69b7a55e851b0dfcfa93ae047e6afafe71617
      }

      // Supabase signUp automatically logs in if email confirmation is off. 
      // We log them out immediately since they are inactive.
      await supabase.auth.signOut()
      setStatusNotice(`${account.fullName} was staged and is waiting for admin activation.`)
    }
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
    <Layout
      user={user}
      currentScreen={screen}
      onNavigate={(s) => setScreen(s)}
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
  )
}
