export type ExportRow = Record<string, string | number | boolean | null | undefined>

function escapeCsv(value: unknown): string {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function downloadFile(filename: string, type: string, content: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportCsv(filename: string, rows: ExportRow[]): void {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(','))].join('\n')
  downloadFile(`${filename}.csv`, 'text/csv;charset=utf-8', csv)
}

export function exportExcel(filename: string, rows: ExportRow[]): void {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const cells = (values: unknown[], tag: 'th' | 'td') => values.map((value) => `<${tag}>${String(value ?? '').replace(/[<>&]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char] ?? char))}</${tag}>`).join('')
  const html = `<html><head><meta charset="utf-8" /></head><body><table><thead><tr>${cells(headers, 'th')}</tr></thead><tbody>${rows.map((row) => `<tr>${cells(headers.map((h) => row[h]), 'td')}</tr>`).join('')}</tbody></table></body></html>`
  downloadFile(`${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8', html)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(value))
}

export function toProgramLabel(value: string | null | undefined): string {
  if (value === 'supsup_todo') return 'Supsup Todo'
  if (value === 'moms_act') return "Mom's Act"
  if (value === 'milky_way') return 'Milky Way'
  return value ?? ''
}

export function fromProgramLabel(value: FormDataEntryValue | null): string {
  const text = String(value ?? '')
  if (text === 'Supsup Todo') return 'supsup_todo'
  if (text === "Mom's Act") return 'moms_act'
  if (text === 'Milky Way') return 'milky_way'
  return text
}

export function toTitle(value: string | null | undefined): string {
  return String(value ?? '').split('_').filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ')
}