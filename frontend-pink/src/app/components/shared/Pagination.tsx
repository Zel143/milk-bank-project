import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZE_OPTIONS } from '../../hooks/usePagination'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

function getPageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  const pages = getPageRange(page, totalPages)
  const start = Math.min((page - 1) * pageSize + 1, total)
  const end = Math.min(page * pageSize, total)

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3"
      style={{ borderColor: 'rgba(0,0,0,0.06)' }}
    >
      {/* Row count + page size */}
      <div className="flex items-center gap-2.5">
        <span
          className="text-xs"
          style={{ color: '#9a9694', fontFamily: 'var(--font-family-mono)' }}
          aria-live="polite"
          aria-atomic="true"
        >
          {total === 0 ? 'No results' : `${start}-${end} of ${total}`}
        </span>
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          aria-label="Rows per page"
          className="rounded-lg border py-1 pl-2 pr-6 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/40"
          style={{
            borderColor: 'rgba(0,0,0,0.08)',
            background: '#F8F7F5',
            color: '#636260',
            fontFamily: 'var(--font-family-mono)',
          }}
        >
          {PAGE_SIZE_OPTIONS.map(s => (
            <option key={s} value={s}>{s} per page</option>
          ))}
        </select>
      </div>

      {/* Page buttons */}
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex h-7 w-7 items-center justify-center rounded-lg border transition-colors hover:bg-[#F8F0F4] disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/40"
          style={{ borderColor: 'rgba(0,0,0,0.08)' }}
        >
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-7 w-7 items-center justify-center text-xs"
              style={{ color: '#9a9694', fontFamily: 'var(--font-family-mono)' }}
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className="flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/40"
              style={
                p === page
                  ? { background: '#322e2d', borderColor: '#322e2d', color: '#eea4bb', fontFamily: 'var(--font-family-mono)' }
                  : { borderColor: 'rgba(0,0,0,0.08)', background: '#F8F7F5', color: '#636260', fontFamily: 'var(--font-family-mono)' }
              }
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="flex h-7 w-7 items-center justify-center rounded-lg border transition-colors hover:bg-[#F8F0F4] disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eea4bb]/40"
          style={{ borderColor: 'rgba(0,0,0,0.08)' }}
        >
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </nav>
    </div>
  )
}
