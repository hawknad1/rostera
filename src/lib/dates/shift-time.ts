export class ShiftTimeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ShiftTimeError"
  }
}

export type ParsedShiftTime = {
  hours: number
  minutes: number
  totalMinutes: number
  formatted: string
}

const SHIFT_TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/
const MINUTES_PER_DAY = 24 * 60

export function parseShiftTime(value: string): ParsedShiftTime {
  const trimmed = value.trim()
  const match = SHIFT_TIME_PATTERN.exec(trimmed)

  if (!match) {
    throw new ShiftTimeError("Enter a valid time in 24-hour HH:mm format.")
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  return {
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
    formatted: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  }
}

export function calculateShiftDurationMinutes(input: {
  startTime: string
  endTime: string
  isOvernight: boolean
}): number {
  const start = parseShiftTime(input.startTime)
  const end = parseShiftTime(input.endTime)

  if (start.totalMinutes === end.totalMinutes) {
    throw new ShiftTimeError("Shift start and end cannot be the same time.")
  }

  if (input.isOvernight) {
    if (end.totalMinutes > start.totalMinutes) {
      throw new ShiftTimeError("Overnight shifts must end the following day.")
    }

    return end.totalMinutes + MINUTES_PER_DAY - start.totalMinutes
  }

  if (end.totalMinutes < start.totalMinutes) {
    throw new ShiftTimeError("Mark the shift as ending the following day.")
  }

  return end.totalMinutes - start.totalMinutes
}

export function formatShiftDuration(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new ShiftTimeError("Shift duration must be greater than zero.")
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  const hourLabel = hours === 1 ? "1 hour" : `${hours} hours`
  const minuteLabel = remainingMinutes === 1 ? "1 minute" : `${remainingMinutes} minutes`

  if (hours === 0) {
    return minuteLabel
  }

  if (remainingMinutes === 0) {
    return hourLabel
  }

  return `${hourLabel} ${minuteLabel}`
}

export function describeShiftDuration(input: {
  startTime: string
  endTime: string
  isOvernight: boolean
}) {
  const start = parseShiftTime(input.startTime)
  const end = parseShiftTime(input.endTime)
  const durationMinutes = calculateShiftDurationMinutes({
    startTime: start.formatted,
    endTime: end.formatted,
    isOvernight: input.isOvernight,
  })

  return {
    startTime: start.formatted,
    endTime: end.formatted,
    durationMinutes,
    durationLabel: formatShiftDuration(durationMinutes),
  }
}
