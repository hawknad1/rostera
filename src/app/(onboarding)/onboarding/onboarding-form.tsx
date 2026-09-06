"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  provisionOrganizationAction,
  type ProvisionOrganizationActionState,
} from "@/modules/organizations/actions/provision-organization"

const inputClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const labelClassName = "mb-1.5 block text-sm font-medium text-foreground"

export function OnboardingForm() {
  const [state, action, pending] = useActionState<
    ProvisionOrganizationActionState,
    FormData
  >(provisionOrganizationAction, null)

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your hospital
        </h1>
        <p className="text-sm text-muted-foreground">
          Create your organization to start managing rosters in Rostera.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div>
          <label className={labelClassName} htmlFor="name">
            Hospital name
          </label>
          <input
            className={inputClassName}
            id="name"
            name="name"
            required
            type="text"
            autoComplete="organization"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="phone">
              Phone
            </label>
            <input
              className={inputClassName}
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="email">
              Email
            </label>
            <input
              className={inputClassName}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className={labelClassName} htmlFor="address">
            Address
          </label>
          <input
            className={inputClassName}
            id="address"
            name="address"
            type="text"
            autoComplete="street-address"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="city">
              City
            </label>
            <input
              className={inputClassName}
              id="city"
              name="city"
              type="text"
              autoComplete="address-level2"
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="region">
              Region
            </label>
            <input
              className={inputClassName}
              id="region"
              name="region"
              type="text"
              autoComplete="address-level1"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="country">
              Country
            </label>
            <input
              className={inputClassName}
              defaultValue="Ghana"
              id="country"
              name="country"
              type="text"
              autoComplete="country-name"
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="timezone">
              Timezone
            </label>
            <input
              className={inputClassName}
              defaultValue="Africa/Accra"
              id="timezone"
              name="timezone"
              type="text"
              autoComplete="off"
            />
          </div>
        </div>

        {state?.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}

        <Button className="self-start" disabled={pending} type="submit">
          {pending ? "Creating organization..." : "Create organization"}
        </Button>
      </form>
    </main>
  )
}
