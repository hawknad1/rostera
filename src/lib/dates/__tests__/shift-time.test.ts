import { describe, expect, it } from "vitest"

import {
  calculateShiftDurationMinutes,
  formatShiftDuration,
  parseShiftTime,
  ShiftTimeError,
} from "@/lib/dates/shift-time"

describe("parseShiftTime", () => {
  it("parses HH:mm wall-clock times", () => {
    expect(parseShiftTime("08:00")).toEqual({
      hours: 8,
      minutes: 0,
      totalMinutes: 480,
      formatted: "08:00",
    })
    expect(parseShiftTime("22:00")).toMatchObject({ totalMinutes: 1320, formatted: "22:00" })
    expect(parseShiftTime("7:30")).toMatchObject({ formatted: "07:30", totalMinutes: 450 })
  })

  it("accepts optional seconds and canonicalizes to HH:mm", () => {
    expect(parseShiftTime("06:00:00").formatted).toBe("06:00")
  })

  it("rejects invalid times", () => {
    expect(() => parseShiftTime("24:00")).toThrow(ShiftTimeError)
    expect(() => parseShiftTime("08:60")).toThrow(ShiftTimeError)
    expect(() => parseShiftTime("not-a-time")).toThrow(ShiftTimeError)
    expect(() => parseShiftTime("")).toThrow(ShiftTimeError)
  })
})

describe("calculateShiftDurationMinutes", () => {
  it("calculates a normal day shift", () => {
    expect(
      calculateShiftDurationMinutes({
        startTime: "08:00",
        endTime: "16:00",
        isOvernight: false,
      }),
    ).toBe(8 * 60)
  })

  it("calculates half-hour boundaries", () => {
    expect(
      calculateShiftDurationMinutes({
        startTime: "07:30",
        endTime: "15:30",
        isOvernight: false,
      }),
    ).toBe(8 * 60)
  })

  it("calculates overnight shifts across midnight", () => {
    expect(
      calculateShiftDurationMinutes({
        startTime: "22:00",
        endTime: "06:00",
        isOvernight: true,
      }),
    ).toBe(8 * 60)

    expect(
      calculateShiftDurationMinutes({
        startTime: "20:00",
        endTime: "08:00",
        isOvernight: true,
      }),
    ).toBe(12 * 60)
  })

  it("rejects zero-duration shifts", () => {
    expect(() =>
      calculateShiftDurationMinutes({
        startTime: "08:00",
        endTime: "08:00",
        isOvernight: false,
      }),
    ).toThrow(/same time/)

    expect(() =>
      calculateShiftDurationMinutes({
        startTime: "08:00",
        endTime: "08:00",
        isOvernight: true,
      }),
    ).toThrow(/same time/)
  })

  it("rejects overnight mismatches", () => {
    expect(() =>
      calculateShiftDurationMinutes({
        startTime: "22:00",
        endTime: "06:00",
        isOvernight: false,
      }),
    ).toThrow(/following day/)

    expect(() =>
      calculateShiftDurationMinutes({
        startTime: "08:00",
        endTime: "16:00",
        isOvernight: true,
      }),
    ).toThrow(/end the following day/)
  })

  it("rejects invalid times", () => {
    expect(() =>
      calculateShiftDurationMinutes({
        startTime: "25:00",
        endTime: "16:00",
        isOvernight: false,
      }),
    ).toThrow(ShiftTimeError)
  })
})

describe("formatShiftDuration", () => {
  it("formats whole hours and mixed durations", () => {
    expect(formatShiftDuration(8 * 60)).toBe("8 hours")
    expect(formatShiftDuration(60)).toBe("1 hour")
    expect(formatShiftDuration(7 * 60 + 30)).toBe("7 hours 30 minutes")
    expect(formatShiftDuration(45)).toBe("45 minutes")
  })

  it("rejects non-positive durations", () => {
    expect(() => formatShiftDuration(0)).toThrow(ShiftTimeError)
    expect(() => formatShiftDuration(-8)).toThrow(ShiftTimeError)
  })
})
