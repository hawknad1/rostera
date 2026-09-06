"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  createCustomRoleAction,
  updateCustomRoleAction,
  type RoleActionState,
} from "@/modules/organizations/actions/roles"
import { PERMISSION_GROUPS } from "@/modules/organizations/labels"
import { inputClassName, labelClassName } from "@/modules/organizations/ui/form-styles"

export function RoleForm({
  catalog,
  selectedKeys,
  role,
}: {
  catalog: readonly string[]
  selectedKeys: readonly string[]
  role?: { id: string; name: string; description: string | null }
}) {
  const action = role ? updateCustomRoleAction : createCustomRoleAction
  const [state, formAction, pending] = useActionState<RoleActionState, FormData>(action, null)
  const selected = new Set(selectedKeys)

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-6">
      {role ? <input name="roleId" type="hidden" value={role.id} /> : null}
      <div>
        <label className={labelClassName} htmlFor="name">
          Role name
        </label>
        <input className={inputClassName} defaultValue={role?.name ?? ""} id="name" name="name" required />
      </div>
      <div>
        <label className={labelClassName} htmlFor="description">
          Description
        </label>
        <input
          className={inputClassName}
          defaultValue={role?.description ?? ""}
          id="description"
          name="description"
        />
      </div>
      <fieldset className="flex flex-col gap-6">
        <legend className="text-lg font-medium">Permissions</legend>
        {PERMISSION_GROUPS.map((group) => {
          const keys = catalog.filter((key) => group.prefixes.some((prefix) => key.startsWith(prefix)))
          if (keys.length === 0) {
            return null
          }

          return (
            <div className="flex flex-col gap-2" key={group.id}>
              <h3 className="text-sm font-medium">{group.label}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {keys.map((key) => (
                  <label className="flex items-center gap-2 text-sm" key={key}>
                    <input
                      defaultChecked={selected.has(key)}
                      name="permissionKeys"
                      type="checkbox"
                      value={key}
                    />
                    {key}
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </fieldset>
      {state?.ok === false ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.ok === true ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Saving..." : role ? "Save role" : "Create role"}
      </Button>
    </form>
  )
}
