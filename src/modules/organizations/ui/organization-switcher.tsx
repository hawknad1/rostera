import { switchOrganizationFormAction } from "@/modules/organizations/actions/switch-organization"
import { selectClassName } from "@/modules/organizations/ui/form-styles"
import type { CurrentMembership } from "@/lib/auth/get-current-membership"

export function OrganizationSwitcher({
  membership,
  organizations,
}: {
  membership: CurrentMembership
  organizations: CurrentMembership[]
}) {
  if (organizations.length < 2) {
    return null
  }

  return (
    <form action={switchOrganizationFormAction} className="flex items-center gap-2">
      <label className="sr-only" htmlFor="organizationId">
        Organization
      </label>
      <select
        className={`${selectClassName} w-auto min-w-40 max-w-56`}
        defaultValue={membership.organizationId}
        id="organizationId"
        name="organizationId"
      >
        {organizations.map((item) => (
          <option key={item.organizationId} value={item.organizationId}>
            {String(item.organization.name)}
          </option>
        ))}
      </select>
      <button
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        type="submit"
      >
        Switch
      </button>
    </form>
  )
}
