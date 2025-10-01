
-- Script de teste para debugar a função get_lost_leads_funnel
-- Company ID: 0a3157ce-6591-4357-b663-0e4d333d06a5
-- Período: Setembro de 2025 completo

-- 1. Verificar se existem leads da empresa no período
SELECT 
    'Total de leads da empresa no período' as teste,
    COUNT(*) as resultado
FROM leads 
WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
  AND atualizado_em >= '2025-09-01 00:00:00'
  AND atualizado_em <= '2025-09-30 23:59:59';

-- 2. Verificar leads perdidos (status_id = 143)
SELECT 
    'Leads com status perdido (143)' as teste,
    COUNT(*) as resultado
FROM leads 
WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
  AND atualizado_em >= '2025-09-01 00:00:00'
  AND atualizado_em <= '2025-09-30 23:59:59'
  AND status_id = 143;

-- 3. Verificar etapas disponíveis da empresa
SELECT 
    'Etapas da empresa' as teste,
    stage_name,
    stage_id,
    pipeline_id
FROM stages_list 
WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
  AND stage_name IS NOT NULL
  AND stage_name != ''
ORDER BY pipeline_id, stage_id;

-- 4. Verificar qual é o nome da etapa "Perdidos"
SELECT 
    'Etapa com nome Perdidos' as teste,
    stage_name,
    stage_id
FROM stages_list 
WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
  AND (stage_name = 'Perdidos' OR stage_name ILIKE '%perdido%');

-- 5. Verificar pipelines configurados
SELECT 
    'Configuração de pipelines' as teste,
    pipeline_id
FROM kommo_config 
WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5';

-- 6. Verificar leads com custom_fields_values preenchidos
SELECT 
    'Leads com custom_fields no período' as teste,
    COUNT(*) as resultado
FROM leads 
WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
  AND atualizado_em >= '2025-09-01 00:00:00'
  AND atualizado_em <= '2025-09-30 23:59:59'
  AND custom_fields_values IS NOT NULL
  AND custom_fields_values != '[]'
  AND custom_fields_values != '';

-- 7. Amostra de custom_fields_values
SELECT 
    'Amostra de custom_fields' as teste,
    id as lead_id,
    etapa,
    status_id,
    LEFT(custom_fields_values::text, 200) as custom_fields_sample
FROM leads 
WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
  AND atualizado_em >= '2025-09-01 00:00:00'
  AND atualizado_em <= '2025-09-30 23:59:59'
  AND custom_fields_values IS NOT NULL
  AND custom_fields_values != '[]'
  AND custom_fields_values != ''
LIMIT 3;

-- 8. Testar a função RPC com debug
SELECT 
    'Resultado da função RPC' as teste,
    etapa_anterior,
    total,
    total_value
FROM get_lost_leads_funnel(
    '0a3157ce-6591-4357-b663-0e4d333d06a5'::uuid,
    '2025-09-01 00:00:00'::timestamp,
    '2025-09-30 23:59:59'::timestamp,
    'Perdidos',
    NULL,
    ARRAY[8865067, 8865115]::bigint[]
);

-- 9. Verificar se há leads perdidos por custom_fields
SELECT 
    'Leads perdidos por custom_fields' as teste,
    COUNT(*) as resultado
FROM leads l
WHERE l.company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
  AND l.atualizado_em >= '2025-09-01 00:00:00'
  AND l.atualizado_em <= '2025-09-30 23:59:59'
  AND l.custom_fields_values IS NOT NULL 
  AND l.custom_fields_values != '[]' 
  AND l.custom_fields_values != ''
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(l.custom_fields_values::jsonb) AS cf
      WHERE cf->>'field_name' = 'Perdidos'
        AND cf->'values'->0->>'value' = 'true'
  );

-- 10. Testar parsing de um custom_field específico
SELECT 
    'Teste de parsing custom_fields' as teste,
    id as lead_id,
    jsonb_array_elements(custom_fields_values::jsonb)->>'field_name' as field_name,
    jsonb_array_elements(custom_fields_values::jsonb)->'values'->0->>'value' as field_value
FROM leads l
WHERE l.company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
  AND l.custom_fields_values IS NOT NULL 
  AND l.custom_fields_values != '[]' 
  AND l.custom_fields_values != ''
LIMIT 10;
