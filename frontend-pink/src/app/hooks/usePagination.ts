import { useState } from 'react'

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

export interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
  from: number
  to: number
  setPage: (page: number) => void
  setTotal: (total: number) => void
  resetPage: () => void
  handlePageSizeChange: (size: number) => void
}

export function usePagination(defaultPageSize = 20): PaginationState {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [total, setTotal] = useState(0)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  function resetPage() {
    setPage(1)
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPage(1)
  }

  return { page, pageSize, total, totalPages, from, to, setPage, setTotal, resetPage, handlePageSizeChange }
}
