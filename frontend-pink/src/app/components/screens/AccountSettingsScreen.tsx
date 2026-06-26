import { PageHeader } from '../shared/PageHeader'
import type { AppUser } from '../../types'

export function AccountSettingsScreen({ user }: { user: AppUser }) {
  return <div>
    <PageHeader crumbs={[{ label: 'Account' }]} title="Account Settings" subtitle="Current signed-in account details" />
    <div className="bg-white rounded-2xl border p-6 max-w-xl space-y-4">
      <div><div className="text-xs text-[#6B7280]">Name</div><div className="text-sm text-[#322e2d]">{user.name}</div></div>
      <div><div className="text-xs text-[#6B7280]">Role</div><div className="text-sm text-[#322e2d]">{user.role}</div></div>
      <div><div className="text-xs text-[#6B7280]">Initials</div><div className="text-sm text-[#322e2d]">{user.initials}</div></div>
    </div>
  </div>
}