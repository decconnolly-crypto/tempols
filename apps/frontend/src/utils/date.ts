export function formatDateStr(date: Date): string {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  
  export function formatReadableDate(dateStr: string): string {
    const today = formatDateStr(new Date())
    const tomorrowDate = new Date()
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const tomorrow = formatDateStr(tomorrowDate)
  
    if (dateStr === today) return "Today's Focus"
    if (dateStr === tomorrow) return "Tomorrow's Schedule"
  
    const [year, month, day] = dateStr.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }