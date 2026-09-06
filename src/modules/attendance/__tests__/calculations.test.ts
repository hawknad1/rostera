import { Temporal } from "temporal-polyfill"
import { describe, expect, it } from "vitest"

import {
  AttendanceCalculationError,
  calculateAttendance,
} from "@/modules/attendance/services/calculations"
import { DEFAULT_ATTENDANCE_POLICY } from "@/modules/attendance/types/attendance"

const policy = {
  lateThresholdMinutes: DEFAULT_ATTENDANCE_POLICY.lateThresholdMinutes,
  earlyDepartureThresholdMinutes: DEFAULT_ATTENDANCE_POLICY.earlyDepartureThresholdMinutes,
  overtimeThresholdMinutes: DEFAULT_ATTENDANCE_POLICY.overtimeThresholdMinutes,
  maximumLateClockOutMinutes: DEFAULT_ATTENDANCE_POLICY.maximumLateClockOutMinutes,
}

function instant(value: string) {
  return Temporal.Instant.from(value)
}

describe("attendance calculations", () => {
  it("calculates a normal day with no exceptions", () => {
    const result = calculateAttendance({
      scheduledStart: instant("2026-09-10T08:00:00Z"),
      scheduledEnd: instant("2026-09-10T16:00:00Z"),
      clockIn: instant("2026-09-10T08:00:00Z"),
      clockOut: instant("2026-09-10T16:00:00Z"),
      policy,
    })

    expect(result.scheduledMinutes).toBe(480)
    expect(result.actualMinutes).toBe(480)
    expect(result.lateMinutes).toBe(0)
    expect(result.earlyDepartureMinutes).toBe(0)
    expect(result.overtimeMinutes).toBe(0)
    expect(result.exceptions).toEqual([])
  })

  it("detects late arrival", () => {
    const result = calculateAttendance({
      scheduledStart: instant("2026-09-10T08:00:00Z"),
      scheduledEnd: instant("2026-09-10T16:00:00Z"),
      clockIn: instant("2026-09-10T08:07:00Z"),
      clockOut: null,
      policy,
    })

    expect(result.lateMinutes).toBe(7)
    expect(result.exceptions).toEqual([
      { type: "LATE_ARRIVAL", severity: "WARNING", minutes: 7 },
    ])
  })

  it("detects early departure", () => {
    const result = calculateAttendance({
      scheduledStart: instant("2026-09-10T08:00:00Z"),
      scheduledEnd: instant("2026-09-10T16:00:00Z"),
      clockIn: instant("2026-09-10T08:00:00Z"),
      clockOut: instant("2026-09-10T15:45:00Z"),
      policy,
    })

    expect(result.earlyDepartureMinutes).toBe(15)
    expect(result.exceptions.map((item) => item.type)).toEqual(["EARLY_DEPARTURE"])
  })

  it("detects overtime", () => {
    const result = calculateAttendance({
      scheduledStart: instant("2026-09-10T08:00:00Z"),
      scheduledEnd: instant("2026-09-10T16:00:00Z"),
      clockIn: instant("2026-09-10T08:00:00Z"),
      clockOut: instant("2026-09-10T16:30:00Z"),
      policy,
    })

    expect(result.overtimeMinutes).toBe(30)
    expect(result.exceptions.map((item) => item.type)).toEqual(["OVERTIME"])
  })

  it("handles overnight shifts", () => {
    const result = calculateAttendance({
      scheduledStart: instant("2026-09-10T22:00:00Z"),
      scheduledEnd: instant("2026-09-11T06:00:00Z"),
      clockIn: instant("2026-09-10T22:05:00Z"),
      clockOut: instant("2026-09-11T06:20:00Z"),
      policy,
    })

    expect(result.scheduledMinutes).toBe(480)
    expect(result.lateMinutes).toBe(5)
    expect(result.overtimeMinutes).toBe(20)
    expect(result.exceptions.map((item) => item.type)).toEqual(["LATE_ARRIVAL", "OVERTIME"])
  })

  it("treats exact boundaries as on time", () => {
    const result = calculateAttendance({
      scheduledStart: instant("2026-09-10T08:00:00Z"),
      scheduledEnd: instant("2026-09-10T16:00:00Z"),
      clockIn: instant("2026-09-10T08:00:00Z"),
      clockOut: instant("2026-09-10T16:00:00Z"),
      policy: { ...policy, lateThresholdMinutes: 0 },
    })

    expect(result.lateMinutes).toBe(0)
    expect(result.exceptions).toHaveLength(0)
  })

  it("rejects zero or negative duration", () => {
    expect(() =>
      calculateAttendance({
        scheduledStart: instant("2026-09-10T08:00:00Z"),
        scheduledEnd: instant("2026-09-10T16:00:00Z"),
        clockIn: instant("2026-09-10T08:00:00Z"),
        clockOut: instant("2026-09-10T08:00:00Z"),
        policy,
      }),
    ).toThrow(AttendanceCalculationError)
  })

  it("does not raise exceptions at or below policy thresholds", () => {
    const result = calculateAttendance({
      scheduledStart: instant("2026-09-10T08:00:00Z"),
      scheduledEnd: instant("2026-09-10T16:00:00Z"),
      clockIn: instant("2026-09-10T08:05:00Z"),
      clockOut: instant("2026-09-10T16:05:00Z"),
      policy: {
        ...policy,
        lateThresholdMinutes: 5,
        overtimeThresholdMinutes: 5,
      },
    })

    expect(result.lateMinutes).toBe(5)
    expect(result.overtimeMinutes).toBe(5)
    expect(result.exceptions).toEqual([])
  })

  it("caps overtime by the late clock-out window", () => {
    const result = calculateAttendance({
      scheduledStart: instant("2026-09-10T08:00:00Z"),
      scheduledEnd: instant("2026-09-10T16:00:00Z"),
      clockIn: instant("2026-09-10T08:00:00Z"),
      clockOut: instant("2026-09-11T08:00:00Z"),
      policy: { ...policy, maximumLateClockOutMinutes: 60 },
    })

    expect(result.overtimeMinutes).toBe(60)
  })

  it("marks unscheduled attendance without inventing a schedule", () => {
    const result = calculateAttendance({
      scheduledStart: null,
      scheduledEnd: null,
      clockIn: instant("2026-09-10T08:00:00Z"),
      clockOut: instant("2026-09-10T12:00:00Z"),
      policy,
      unscheduled: true,
    })

    expect(result.scheduledMinutes).toBeNull()
    expect(result.actualMinutes).toBe(240)
    expect(result.lateMinutes).toBe(0)
    expect(result.exceptions.map((item) => item.type)).toEqual(["UNSCHEDULED_ATTENDANCE"])
  })
})
