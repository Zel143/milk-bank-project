import { ChevronRight } from 'lucide-react'
import { useProgramFilter } from '../../../lib/programContext'

interface Crumb {
  label: string
  onClick?: () => void
}

interface PageHeaderProps {
  crumbs: Crumb[]
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

const PROGRAM_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Supsup Todo': { bg: '#fdf2f8', text: '#be185d', dot: '#f472b6' },
  "Mom's Act":   { bg: '#eff6ff', text: '#1d4ed8', dot: '#60a5fa' },
  'Milky Way':   { bg: '#f0fdf4', text: '#15803d', dot: '#4ade80' },
}

export function PageHeader({ crumbs, title, subtitle, actions }: PageHeaderProps) {
  const activeProgram = useProgramFilter()
  const programStyle = activeProgram !== 'All' ? PROGRAM_COLORS[activeProgram] : null

  return (
    <div className="mb-7">
      {/* Breadcrumb row */}
      <nav className="flex items-center gap-1 mb-2.5" aria-label="Breadcrumb">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-[#D1D5DB]" />}
            {crumb.onClick ? (
              <button
                onClick={crumb.onClick}
                className="text-[11px] text-[#9CA3AF] hover:text-[#7C5CFC] transition-colors"
                style={{ fontFamily: 'var(--font-family-mono)' }}
              >
                {crumb.label}
              </button>
            ) : (
              <span
                className="text-[11px] text-[#9CA3AF]"
                style={{ fontFamily: 'var(--font-family-mono)' }}
              >
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      {/* Title row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="text-2xl text-[#1A1A1A]"
              style={{ fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2 }}
            >
              {title}
            </h1>
            {/* Program context pill — visible whenever a specific program is active */}
            {programStyle && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: programStyle.bg, color: programStyle.text }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: programStyle.dot }}
                />
                {activeProgram}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-sm text-[#6B7280] leading-relaxed">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
