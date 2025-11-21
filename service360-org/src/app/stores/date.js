export const parseDate = (dateString) => {
  if (!dateString) return null

  if (dateString instanceof Date) {
    return isNaN(dateString) ? null : dateString
  }

  const dotMatch = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (dotMatch) {
    const day = parseInt(dotMatch[1], 10)
    const month = parseInt(dotMatch[2], 10) - 1 
    const year = parseInt(dotMatch[3], 10)
    const date = new Date(year, month, day)
    return isNaN(date) ? null : date
  }

  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10)
    const month = parseInt(isoMatch[2], 10) - 1
    const day = parseInt(isoMatch[3], 10)
    const date = new Date(year, month, day)
    return isNaN(date) ? null : date
  }

  const parsed = new Date(dateString)
  return isNaN(parsed) ? null : parsed
}

export const formatDate = (date) => {
  const parsed = parseDate(date)
  if (!parsed) return null

  const day = String(parsed.getDate()).padStart(2, '0')
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const year = parsed.getFullYear()

  return `${day}.${month}.${year}`
}

export const formatDateToISO = (date) => {
  const parsed = parseDate(date)
  if (!parsed) return null

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}