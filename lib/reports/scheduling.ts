import { parseISO } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

export type ScheduleInput = {
  dayOfWeek: number
  timeOfDay: string
  timezone: string
}

export function computeNextWeeklyRun(input: ScheduleInput, now: Date = new Date()): Date {
  const [hours, minutes] = input.timeOfDay.split(':').map((part) => Number.parseInt(part, 10))

  const zonedNow = toZonedTime(now, input.timezone)
  const candidate = new Date(zonedNow)
  candidate.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0)

  let offsetDays = input.dayOfWeek - candidate.getDay()
  if (offsetDays < 0 || (offsetDays === 0 && candidate <= zonedNow)) {
    offsetDays += 7
  }

  candidate.setDate(candidate.getDate() + offsetDays)

  return fromZonedTime(candidate, input.timezone)
}

export function parseDateRange(from?: string, to?: string): { from?: string; to?: string } {
  if (!from && !to) {
    return {}
  }

  const parsedFrom = from ? parseISO(from) : null
  const parsedTo = to ? parseISO(to) : null

  return {
    from: parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? parsedFrom.toISOString().slice(0, 10) : undefined,
    to: parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo.toISOString().slice(0, 10) : undefined,
  }
}

