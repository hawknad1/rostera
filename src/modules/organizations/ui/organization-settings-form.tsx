"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  updateOrganizationAction,
  type OrganizationSettingsState,
} from "@/modules/organizations/actions/organization"
import { COMMON_TIMEZONES } from "@/modules/organizations/labels"
import { inputClassName, labelClassName, selectClassName } from "@/modules/organizations/ui/form-styles"

type OrganizationValues = {
  name: string
  organizationType: string
  phone: string
  email: string
  address: string
  city: string
  region: string
  country: string
  timezone: string
}

export function OrganizationSettingsForm({
  canEdit,
  values,
}: {
  canEdit: boolean
  values: OrganizationValues
}) {
  const [state, action, pending] = useActionState<OrganizationSettingsState, FormData>(
    updateOrganizationAction,
    null,
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div>
        <label className={labelClassName} htmlFor="name">
          Organization name
        </label>
        <input className={inputClassName} defaultValue={values.name} id="name" name="name" required />
      </div>
      <div>
        <label className={labelClassName} htmlFor="organizationType">
          Organization type
        </label>
        <select
          className={selectClassName}
          defaultValue={values.organizationType}
          id="organizationType"
          name="organizationType"
        >
          <option value="HOSPITAL">Hospital</option>
          <option value="CLINIC">Clinic</option>
          <option value="HEALTH_SYSTEM">Health system</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="email">
            Contact email
          </label>
          <input className={inputClassName} defaultValue={values.email} id="email" name="email" type="email" />
        </div>
        <div>
          <label className={labelClassName} htmlFor="phone">
            Contact phone
          </label>
          <input className={inputClassName} defaultValue={values.phone} id="phone" name="phone" />
        </div>
      </div>
      <div>
        <label className={labelClassName} htmlFor="address">
          Address
        </label>
        <input className={inputClassName} defaultValue={values.address} id="address" name="address" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="city">
            City
          </label>
          <input className={inputClassName} defaultValue={values.city} id="city" name="city" />
        </div>
        <div>
          <label className={labelClassName} htmlFor="region">
            Region
          </label>
          <input className={inputClassName} defaultValue={values.region} id="region" name="region" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="country">
            Country
          </label>
          <input className={inputClassName} defaultValue={values.country} id="country" name="country" required />
        </div>
        <div>
          <label className={labelClassName} htmlFor="timezone">
            Timezone
          </label>
          <input
            className={inputClassName}
            defaultValue={values.timezone}
            id="timezone"
            list="timezone-options"
            name="timezone"
            required
          />
          <datalist id="timezone-options">
            {COMMON_TIMEZONES.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </div>
      </div>
      {state?.ok === false ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.ok === true ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
      {canEdit ? (
        <Button className="self-start" disabled={pending} type="submit">
          {pending ? "Saving..." : "Save changes"}
        </Button>
      ) : null}
    </form>
  )
}
