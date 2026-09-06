"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import type { ProfessionActionState } from "@/modules/professions/actions/create-profession"
import { updateProfessionAction } from "@/modules/professions/actions/update-profession"
import { deactivateProfessionAction } from "@/modules/professions/actions/deactivate-profession"
import { inputClassName, labelClassName } from "@/modules/professions/ui/form-styles"

type OrganizationProfession = {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

function EditOrganizationProfessionForm({
  profession,
}: {
  profession: OrganizationProfession
}) {
  const [state, action, pending] = useActionState<ProfessionActionState, FormData>(
    updateProfessionAction,
    null,
  )

  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="id" type="hidden" value={profession.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor={`profession-name-${profession.id}`}>
            Name
          </label>
          <input
            className={inputClassName}
            defaultValue={profession.name}
            id={`profession-name-${profession.id}`}
            name="name"
            required
            type="text"
          />
        </div>
        <div>
          <label
            className={labelClassName}
            htmlFor={`profession-description-${profession.id}`}
          >
            Description
          </label>
          <input
            className={inputClassName}
            defaultValue={profession.description ?? ""}
            id={`profession-description-${profession.id}`}
            name="description"
            type="text"
          />
        </div>
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  )
}

function DeactivateOrganizationProfessionForm({ professionId }: { professionId: string }) {
  const [state, action, pending] = useActionState<ProfessionActionState, FormData>(
    deactivateProfessionAction,
    null,
  )

  return (
    <form action={action}>
      <input name="id" type="hidden" value={professionId} />
      {state?.error ? <p className="mb-2 text-sm text-destructive">{state.error}</p> : null}
      <Button disabled={pending} type="submit" variant="outline">
        {pending ? "Deactivating..." : "Deactivate"}
      </Button>
    </form>
  )
}

export function OrganizationProfessionList({
  professions,
  canEdit,
}: {
  professions: OrganizationProfession[]
  canEdit: boolean
}) {
  if (professions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hospital-specific professions have been created yet.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-6">
      {professions.map((profession) => (
        <li className="border-t border-border pt-4" key={profession.id}>
          <div className="mb-3 flex flex-wrap items-baseline gap-2">
            <p className="font-medium">{profession.name}</p>
            <span className="text-xs text-muted-foreground">
              {profession.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          {profession.description ? (
            <p className="mb-3 text-sm text-muted-foreground">{profession.description}</p>
          ) : null}
          {canEdit ? (
            <div className="flex flex-col gap-3">
              <EditOrganizationProfessionForm profession={profession} />
              {profession.isActive ? (
                <DeactivateOrganizationProfessionForm professionId={profession.id} />
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
