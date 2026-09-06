import type {
  CoverageCell,
  CoverageStatus,
} from "@/modules/scheduling/engine/calculateCoverage"

export type {
  CoverageAssignment,
  CoverageCell,
  CoverageRequirement,
  CoverageStatus,
} from "@/modules/scheduling/engine/calculateCoverage"
export { calculateCoverage } from "@/modules/scheduling/engine/calculateCoverage"

export function summarizeCoverage(cells: CoverageCell[], assignmentCount: number) {
  if (assignmentCount === 0) {
    return "No assignments"
  }

  if (cells.some((cell) => cell.status === "understaffed")) {
    return "Understaffed"
  }

  if (cells.some((cell) => cell.status === "overstaffed")) {
    return "Overstaffed"
  }

  return "Covered"
}

export function coverageStatusLabel(status: CoverageStatus) {
  if (status === "understaffed") {
    return "Understaffed"
  }

  if (status === "overstaffed") {
    return "Overstaffed"
  }

  return "Covered"
}
