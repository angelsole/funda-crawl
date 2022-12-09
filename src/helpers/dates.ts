const weeksToDate = (weeks: number) => {
  const date = new Date()
  date.setDate(date.getDate() - weeks * 7)
  return date
}

const monthsToDate = (months: number) => {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date
}

export const formatAnnouncementDate = (date: string) => {
  if (date.includes('oday')) {
    return new Date()
  }
  if (date.includes('weeks')) {
    const weeks = parseInt(date.replace(' weeks', ''), 10)
    return weeksToDate(weeks)
  }
  if (date.includes('months')) {
    const months = parseInt(date.replace(' months', ''), 10)
    return monthsToDate(months)
  }
  return new Date(date)
}
