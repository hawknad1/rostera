"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { inputClassName, labelClassName } from "@/modules/departments/ui/form-styles"

type DepartmentListItem = {
  id: string
  name: string
  description: string | null
}

export function DepartmentList({
  departments,
  canEdit,
}: {
  departments: DepartmentListItem[]
  canEdit: boolean
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return departments
    }

    return departments.filter((department) =>
      department.name.toLowerCase().includes(normalized),
    )
  }, [departments, query])

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-sm">
        <label className={labelClassName} htmlFor="department-search">
          Search
        </label>
        <input
          className={inputClassName}
          id="department-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by name"
          type="search"
          value={query}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No departments match this search.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {filtered.map((department) => (
            <li className="flex items-baseline justify-between gap-4 py-3" key={department.id}>
              <div className="min-w-0">
                <p className="font-medium">{department.name}</p>
                {department.description ? (
                  <p className="text-sm text-muted-foreground">{department.description}</p>
                ) : null}
              </div>
              <Link
                className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
                href={`/departments/${department.id}`}
              >
                {canEdit ? "Edit" : "View"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
