export type AccessRole = 'Admin' | 'Doctor' | 'Nurse' | 'Midwife' | 'Medical Technologist'

export type UserRole = AccessRole | 'Administrator'

export type DatabaseRole = 'admin' | 'staff'

export type ProgramType = 'Supsup Todo' | "Mom's Act" | 'Milky Way'

export type ScreeningStatus = 'Pending' | 'Passed' | 'Failed'

export type BatchStatus =
  | 'RAW'
  | 'PRE_TESTING'
  | 'PRE_TEST_PASSED'
  | 'PASTEURIZED'
  | 'POST_TESTING'
  | 'READY'
  | 'DISPENSED'
  | 'PRE_TEST_FAILED'
  | 'POST_TEST_FAILED'
  | 'DISCARDED'

export type CollectionMode = 'FC' | 'PU'

export type InquiryStatus = 'WAITING' | 'NOTIFIED' | 'FULFILLED' | 'CANCELLED'

export type InquiryType = 'Walk-in' | 'Hotline Call'

export type SMSStatus = 'Sent' | 'Failed' | 'Pending'

export type TestType = 'PRE' | 'POST'

export type TestResult = 'PASS' | 'FAIL' | 'Pending'

export type DonorClassification = 'Community' | 'Private' | 'Institutional'

export interface AppUser {
  name: string
  role: UserRole
  initials: string
}

export interface AccessAccount {
  id: string
  fullName: string
  email: string
  role: AccessRole
  databaseRole: DatabaseRole
  department: string
  isActive: boolean
  password: string
  lastSeenAt: string | null
  createdAt: string
}

export interface CreateAccessAccountInput {
  fullName: string
  email: string
  password: string
}

export interface Donor {
  dtn: string
  name: string
  firstName: string
  lastName: string
  program: ProgramType
  screeningStatus: ScreeningStatus
  contact: string
  address: string
  dateOfBirth: string
  occupation: string
  civilStatus: string
  classification: DonorClassification
  prenatalCenter: string
  lastDeliveryDate: string
}

export interface MilkBatch {
  batchNumber: string
  ctn: string
  dtn: string
  donorName: string
  program: ProgramType
  volume: number
  collectionDate: string
  mode: CollectionMode
  status: BatchStatus
  aob: string
  collectedBy: string
}

export interface LabTest {
  id: string
  batchNumber: string
  ctn: string
  dtn: string
  sampleVolume: number
  dateSent: string
  expectedDate: string
  daysElapsed: number
  result: TestResult
  testedBy: string
  testType: TestType
}

export interface PasteurizationRecord {
  id: string
  batchNumber: string
  operator: string
  temperature: number
  duration: number
  date: string
  postTestStatus: string
}

export interface Recipient {
  id: string
  guardianName: string
  babyName: string
  hospital: string
  nicuStatus: boolean
  contact: string
  aob: string
}

export interface Inquiry {
  id: string
  recipientId: string
  recipientName: string
  babyName: string
  nicuStatus: boolean
  inquiryType: InquiryType
  date: string
  daysWaiting: number
  status: InquiryStatus
  notes: string
}

export interface SMSLog {
  id: string
  recipient: string
  contact: string
  message: string
  trigger: string
  dateSent: string
  status: SMSStatus
}

export interface DispensingRecord {
  id: string
  recipient: string
  babyName: string
  batchNumber: string
  dtn: string
  volume: number
  totalFee: number
  dispensedBy: string
  date: string
}

export interface AuditLog {
  id: string
  timestamp: string
  user: string
  role: UserRole
  action: string
  module: string
  recordId: string
  summary: string
}

export type Screen =
  | 'login'
  | 'dashboard'
  | 'donors'
  | 'collection'
  | 'lab'
  | 'pasteurization'
  | 'inventory'
  | 'recipients'
  | 'inquiry'
  | 'sms'
  | 'dispensing'
  | 'reports'
  | 'audit'
  | 'users'
  | 'settings'
