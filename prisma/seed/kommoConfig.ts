// prisma/seed/kommoConfig.ts
import { PrismaClient } from '../../generated/prisma'
const prisma = new PrismaClient()

export const seedKommoConfigs = async () => {
  await prisma.kommo_config.createMany({
    data: [
      {
        id: 1,
        api_url: 'https://dicasaindaial.kommo.com/api/v4',
        access_token: process.env.KOMMO_ACCESS_TOKEN_DICASA,
        sync_interval: 30,
        last_sync: new Date('2025-08-31T14:34:37.770Z'),
        next_sync: new Date('2025-08-31T15:04:37.770Z'),
        created_at: new Date('2025-08-25T17:19:16.174Z'),
        active: true,
        company_id: '0a3157ce-6591-4357-b663-0e4d333d06a5',
        pipeline_id: [8865067, 8865115],
      },
      {
        id: 2,
        api_url: 'https://contatomaziimobiliariacombr.kommo.com/api/v4',
        access_token: process.env.KOMMO_ACCESS_TOKEN_MAZI,
        sync_interval: 30,
        last_sync: new Date('2025-08-31T14:34:16.607Z'),
        next_sync: new Date('2025-08-31T15:04:16.607Z'),
        created_at: new Date('2025-08-26T20:12:04.879Z'),
        active: true,
        company_id: '7ff2ece4-741c-45e5-9fbe-2a891d384985',
        pipeline_id: [8846055],
      },
    ],
    skipDuplicates: true,
  })
}
