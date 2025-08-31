import { PrismaClient } from '../../generated/prisma'
const prisma = new PrismaClient()

export const seedComponentFilters = async () => {
  await prisma.component_filters.createMany({
    data: [
      { id: 1, company_id: '0a3157ce-6591-4357-b663-0e4d333d06a5', component_name: 'ranking_metrics', filter_type: 'month', created_at: new Date('2025-08-25T18:35:56.055Z'), updated_at: new Date('2025-08-25T18:56:57.710Z'), month: 8, year: 2025 },
      { id: 2, company_id: '0a3157ce-6591-4357-b663-0e4d333d06a5', component_name: 'broker_performance_metrics', filter_type: 'month', created_at: new Date('2025-08-25T18:36:21.420Z'), updated_at: new Date('2025-08-25T18:56:58.385Z'), month: 8, year: 2025 },
      { id: 3, company_id: '0a3157ce-6591-4357-b663-0e4d333d06a5', component_name: 'broker_heatmap', filter_type: '7_days', created_at: new Date('2025-08-25T18:36:38.334Z'), updated_at: new Date('2025-08-26T19:48:00.127Z'), month: 8, year: 2025 },
      { id: 4, company_id: '0a3157ce-6591-4357-b663-0e4d333d06a5', component_name: 'sales_funnel', filter_type: 'month', created_at: new Date('2025-08-25T18:36:58.991Z'), updated_at: new Date('2025-08-25T18:56:59.740Z'), month: 8, year: 2025 },
      { id: 5, company_id: '0a3157ce-6591-4357-b663-0e4d333d06a5', component_name: 'lost_leads_funnel', filter_type: 'last_month', created_at: new Date('2025-08-25T18:37:14.900Z'), updated_at: new Date('2025-08-26T19:47:41.640Z'), month: 8, year: 2025 },
      { id: 6, company_id: '7ff2ece4-741c-45e5-9fbe-2a891d384985', component_name: 'ranking_metrics', filter_type: 'month', created_at: new Date('2025-08-26T20:19:04.623Z'), updated_at: new Date('2025-08-26T20:19:28.457Z'), month: 8, year: 2025 },
      { id: 7, company_id: '7ff2ece4-741c-45e5-9fbe-2a891d384985', component_name: 'broker_performance_metrics', filter_type: 'month', created_at: new Date('2025-08-26T20:19:05.283Z'), updated_at: new Date('2025-08-26T20:19:29.155Z'), month: 8, year: 2025 },
      { id: 8, company_id: '7ff2ece4-741c-45e5-9fbe-2a891d384985', component_name: 'broker_heatmap', filter_type: 'month', created_at: new Date('2025-08-26T20:19:05.941Z'), updated_at: new Date('2025-08-26T20:19:30.019Z'), month: 8, year: 2025 },
      { id: 9, company_id: '7ff2ece4-741c-45e5-9fbe-2a891d384985', component_name: 'sales_funnel', filter_type: 'month', created_at: new Date('2025-08-26T20:19:06.723Z'), updated_at: new Date('2025-08-26T20:19:30.708Z'), month: 8, year: 2025 },
      { id: 10, company_id: '7ff2ece4-741c-45e5-9fbe-2a891d384985', component_name: 'lost_leads_funnel', filter_type: 'month', created_at: new Date('2025-08-26T20:19:07.463Z'), updated_at: new Date('2025-08-26T20:19:31.357Z'), month: 8, year: 2025 },
    ],
    skipDuplicates: true,
  })
}
