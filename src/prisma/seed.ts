import { db } from "./db"

const DEMO_SLUG = "rostera-demo-hospital"

const professions = [
  "Doctor",
  "Nurse",
  "Midwife",
  "Pharmacist",
  "Laboratory Scientist",
  "Radiographer",
]

const departments = [
  "Emergency",
  "ICU",
  "Maternity",
  "Paediatrics",
  "OPD",
  "Pharmacy",
  "Laboratory",
  "Radiology",
]

async function main() {
  console.log("Seeding Rostera...")

  let organization = await db.orm.public.Organization.where({ slug: DEMO_SLUG }).first()

  if (!organization) {
    organization = await db.orm.public.Organization.create({
      id: crypto.randomUUID(),
      name: "Rostera Demo Hospital",
      slug: DEMO_SLUG,
      country: "Ghana",
      timezone: "Africa/Accra",
      status: "ACTIVE",
    })
  }

  for (const name of professions) {
    const existing = await db.orm.public.Profession.where({
      organizationId: organization.id,
      name,
    }).first()

    if (!existing) {
      await db.orm.public.Profession.create({
        id: crypto.randomUUID(),
        organizationId: organization.id,
        name,
      })
    }
  }

  for (const name of departments) {
    const existing = await db.orm.public.Department.where({
      organizationId: organization.id,
      name,
    }).first()

    if (!existing) {
      await db.orm.public.Department.create({
        id: crypto.randomUUID(),
        organizationId: organization.id,
        name,
      })
    }
  }

  console.log("Rostera seed completed.")
}

try {
  await main()
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await db.close()
}
