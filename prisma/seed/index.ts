import { seedComponentFilters } from './componentFilters'
import { seedRules } from './rules'
import { seedCompanyRules } from './companyRules'

const run = async () => {
  await seedComponentFilters()
  await seedRules()
  await seedCompanyRules()
  console.log('🌱 Seed finalizado com sucesso!')
}

run().catch((e) => {
  console.error(e)
})