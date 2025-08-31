import { PrismaClient } from '../../generated/prisma'
const prisma = new PrismaClient()

export const seedRules = async () => {
  await prisma.rules.createMany({
    data: [
      {
        id: 1,
        nome: 'Leads visitados',
        pontos: 5,
        coluna_nome: 'leads_visitados',
        created_at: new Date('2025-08-25T17:21:23.253Z'),
        updated_at: new Date('2025-08-25T17:21:23.253Z'),
        descricao: 'Leads visitados pelo corretor',
      },
      {
        id: 2,
        nome: 'Propostas enviadas',
        pontos: 10,
        coluna_nome: 'propostas_enviadas',
        created_at: new Date('2025-08-25T17:21:53.380Z'),
        updated_at: new Date('2025-08-25T17:21:53.380Z'),
        descricao: 'Propostas enviadas ao cliente pelo corretor',
      },
      {
        id: 3,
        nome: 'Vendas realizadas',
        pontos: 30,
        coluna_nome: 'vendas_realizadas',
        created_at: new Date('2025-08-25T17:22:29.948Z'),
        updated_at: new Date('2025-08-25T17:22:29.948Z'),
        descricao: 'Vendas realizadas pelo corretor.',
      },
      {
        id: 4,
        nome: 'Leads perdidos',
        pontos: -5,
        coluna_nome: 'leads_perdidos',
        created_at: new Date('2025-08-25T17:22:53.812Z'),
        updated_at: new Date('2025-08-25T17:22:53.812Z'),
        descricao: 'Leads perdidos por inatividade',
      },
      {
        id: 5,
        nome: 'Leads descartados',
        pontos: -3,
        coluna_nome: 'leads_descartados',
        created_at: new Date('2025-08-25T17:23:38.818Z'),
        updated_at: new Date('2025-08-25T17:23:38.818Z'),
        descricao: 'Leads descartados do corretor',
      },
    ],
    skipDuplicates: true,
  })
}
