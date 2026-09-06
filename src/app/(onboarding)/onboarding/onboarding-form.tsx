"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  provisionOrganizationAction,
  type ProvisionOrganizationActionState,
} from "@/modules/organizations/actions/provision-organization"
import { inputClassName, labelClassName, selectClassName } from "@/modules/organizations/ui/form-styles"

export function OnboardingForm() {
  const [state, action, pending] = useActionState<
    ProvisionOrganizationActionState,
    FormData
  >(provisionOrganizationAction, null)

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create your organization</h1>
        <p className="text-sm text-muted-foreground">
          Create the tenant and become its administrator. Additional settings can be configured later.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div>
          <label className={labelClassName} htmlFor="name">
            Organization name
          </label>
          <input
            autoComplete="organization"
            className={inputClassName}
            id="name"
            name="name"
            required
            type="text"
          />
        </div>

        <div>
          <label className={labelClassName} htmlFor="organizationType">
            Organization type
          </label>
          <select className={selectClassName} defaultValue="HOSPITAL" id="organizationType" name="organizationType">
            <option value="HOSPITAL">Hospital</option>
            <option value="CLINIC">Clinic</option>
            <option value="HEALTH_SYSTEM">Health system</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="country">
              Country
            </label>
            <input
              autoComplete="country-name"
              className={inputClassName}
              defaultValue="Ghana"
              id="country"
              name="country"
              type="text"
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="timezone">
              Timezone
            </label>
            <input
              autoComplete="off"
              className={inputClassName}
              defaultValue="Africa/Accra"
              id="timezone"
              name="timezone"
              type="text"
            />
          </div>
        </div>

        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <Button className="self-start" disabled={pending} type="submit">
          {pending ? "Creating organization..." : "Create organization"}
        </Button>
      </form>
    </main>
  )
}
