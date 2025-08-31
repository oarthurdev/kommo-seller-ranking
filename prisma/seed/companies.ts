// prisma/seed/companies.ts
import { PrismaClient } from '../../generated/prisma'
const prisma = new PrismaClient()

export const seedCompanies = async () => {
  await prisma.companies.createMany({
    data: [
      {
        id: '0a3157ce-6591-4357-b663-0e4d333d06a5',
        name: 'diCasa Imobiliaria',
        subdomain: 'dicasa',
        created_at: new Date('2025-08-25T17:17:48.844Z'),
      },
      {
        id: '7ff2ece4-741c-45e5-9fbe-2a891d384985',
        name: 'MAZI Imobiliaria',
        subdomain: 'mazi',
        created_at: new Date('2025-08-26T20:10:17.351Z'),
      },
    ],
    skipDuplicates: true,
  })
}
