const padDatePart = (value: number) => String(value).padStart(2, '0')

export const formatCanonicalLocalDate = (date: Date | null) => date
  ? `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
  : ''

export const parseCanonicalLocalDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return date.getFullYear() === Number(match[1])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3])
    ? date
    : null
}

export const currentLocalDate = () => formatCanonicalLocalDate(new Date())
