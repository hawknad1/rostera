const MAX_SLUG_LENGTH = 80

export function toOrganizationSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "")

  return slug.length > 0 ? slug : "organization"
}

export function organizationSlugCandidate(baseSlug: string, attempt: number): string {
  if (attempt <= 1) {
    return baseSlug
  }

  return `${baseSlug}-${attempt}`
}
