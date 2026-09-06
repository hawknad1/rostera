export const rosterStatusLabels = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  PUBLISHED: "Published",
  AMENDED: "Amended",
} as const

export type RosterStatus = keyof typeof rosterStatusLabels
