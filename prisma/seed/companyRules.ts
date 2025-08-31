import { PrismaClient } from '../../generated/prisma'
const prisma = new PrismaClient()

export const seedCompanyRules = async () => {
  await prisma.company_rules.createMany({
    data: [
      { id: 1, company_id: '0a3157ce-6591-4357-b663-0e4d333d06a5', rule_id: 1, pontos: 5, active: true, created_at: new Date('2025-08-25T17:24:02.527Z'), updated_at: new Date('2025-08-25T17:24:02.527Z') },
      { id: 2, company_id: '0a3157ce-6591-4357-b663-0e4d333d06a5', rule_id: 2, pontos: 10, active: true, created_at: new Date('2025-08-25T17:24:19.817Z'), updated_at: new Date('2025-08-25T17:24:19.817Z') },
      { id: 3, company_id: '0a3157ce-6591-4357-b663-0e4d333d06a5', rule_id: 3, pontos: 30, active: true, created_at: new Date('2025-08-25T17:24:37.210Z'), updated_at: new Date('2025-08-25T17:24:37.210Z') },
      { id: 4, company_id: '0a3157ce-6591-4357-b663-0e4d333d06a5', rule_id: 4, pontos: -5, active: true, created_at: new Date('2025-08-25T17:24:54.176Z'), updated_at: new Date('2025-08-25T17:24:54.176Z') },
      { id: 5, company_id: '0a3157ce-6591-4357-b663-0e4d333d06a5', rule_id: 5, pontos: -3, active: true, created_at: new Date('2025-08-25T17:25:11.452Z'), updated_at: new Date('2025-08-25T17:25:11.452Z') },
      { id: 6, company_id: '7ff2ece4-741c-45e5-9fbe-2a891d384985', rule_id: 1, pontos: 5, active: true, created_at: new Date('2025-08-26T20:34:51.464Z'), updated_at: new Date('2025-08-26T20:34:51.464Z') },
      { id: 7, company_id: '7ff2ece4-741c-45e5-9fbe-2a891d384985', rule_id: 2, pontos: 10, active: true, created_at: new Date('2025-08-26T20:35:06.329Z'), updated_at: new Date('2025-08-26T20:35:06.329Z') },
      { id: 8, company_id: '7ff2ece4-741c-45e5-9fbe-2a891d384985', rule_id: 3, pontos: 30, active: true, created_at: new Date('2025-08-26T20:35:18.054Z'), updated_at: new Date('2025-08-26T20:35:18.054Z') },
      { id: 9, company_id: '7ff2ece4-741c-45e5-9fbe-2a891d384985', rule_id: 4, pontos: -5, active: true, created_at: new Date('2025-08-26T20:35:30.108Z'), updated_at: new Date('2025-08-26T20:35:30.108Z') },
      { id: 10, company_id: '7ff2ece4-741c-45e5-9fbe-2a891d384985', rule_id: 5, pontos: -3, active: true, created_at: new Date('2025-08-26T20:35:41.269Z'), updated_at: new Date('2025-08-26T20:35:41.269Z') },
    ],
    skipDuplicates: true,
  })
}
