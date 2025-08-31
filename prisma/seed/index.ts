// prisma/seed/seed.ts
import { seedCompanies } from './companies'
import { seedKommoConfigs } from './kommoConfig'
import { seedComponentFilters } from './componentFilters'
import { seedRules } from './rules'
import { seedCompanyRules } from './companyRules'

const run = async () => {
  await seedCompanies()
  await seedKommoConfigs()
  await seedComponentFilters()
  await seedRules()
  await seedCompanyRules()
  console.log('🌱 Seed finalizado com sucesso!')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
