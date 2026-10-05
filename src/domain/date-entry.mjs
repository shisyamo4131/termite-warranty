// Only format complete input. Never repair invalid dates or move keyboard focus.
export function normalizeDateEntry(value, type = 'date') {
  const text = String(value ?? '').trim()
  if (type === 'month') {
    if (/^\d{6}$/.test(text)) return `${text.slice(0,4)}-${text.slice(4)}`
    return text.replace(/^(\d{4})\/(\d{2})$/, '$1-$2')
  }
  if (/^\d{8}$/.test(text)) return `${text.slice(0,4)}-${text.slice(4,6)}-${text.slice(6)}`
  return text.replace(/^(\d{4})\/(\d{2})\/(\d{2})$/, '$1-$2-$3')
}
