
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
  AND custom_fields_values != ''
  AND custom_fields_values != 'null';

-- 7. Amostra de custom_fields_values com análise de conteúdo
SELECT 
    'Amostra de custom_fields' as teste,
    id as lead_id,
    etapa,
    status_id,
    LENGTH(custom_fields_values) as tamanho,
    CASE 
        WHEN custom_fields_values IS NULL THEN 'NULL'
        WHEN custom_fields_values = '' THEN 'VAZIO'
        WHEN custom_fields_values = '[]' THEN 'ARRAY_VAZIO'
        WHEN custom_fields_values = 'null' THEN 'STRING_NULL'
        WHEN custom_fields_values ~ '^[[:space:]]*$' THEN 'APENAS_ESPACOS'
        WHEN custom_fields_values ~ '^[[:space:]]*\[' THEN 'FORMATO_ARRAY'
        ELSE 'OUTRO_FORMATO'
    END as tipo_conteudo,
    LEFT(custom_fields_values, 100) as custom_fields_sample
FROM leads 
WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
  AND atualizado_em >= '2025-09-01 00:00:00'
  AND atualizado_em <= '2025-09-30 23:59:59'
  AND custom_fields_values IS NOT NULL
ORDER BY 
    CASE 
        WHEN custom_fields_values ~ '^[[:space:]]*\[' THEN 1
        ELSE 2
    END,
    LENGTH(custom_fields_values) DESC
LIMIT 5;

-- 8. Verificar se há leads perdidos por custom_fields (com validação segura)
WITH safe_json_leads AS (
    SELECT 
        l.id,
        l.custom_fields_values,
        CASE 
            WHEN l.custom_fields_values IS NOT NULL 
                 AND l.custom_fields_values != '' 
                 AND l.custom_fields_values != '[]'
                 AND l.custom_fields_values != 'null'
                 AND l.custom_fields_values !~ '^[[:space:]]*$'
                 AND l.custom_fields_values ~ '^[[:space:]]*\[.*\][[:space:]]*$'
            THEN
                -- Tentar fazer parse seguro
                CASE 
                    WHEN l.custom_fields_values::text ~ '^[[:space:]]*\[.*\][[:space:]]*$'
                    THEN 
                        CASE 
                            WHEN (l.custom_fields_values::jsonb) IS NOT NULL 
                            THEN l.custom_fields_values::jsonb
                            ELSE '[]'::jsonb
                        END
                    ELSE '[]'::jsonb
                END
            ELSE '[]'::jsonb
        END as parsed_json
    FROM leads l
    WHERE l.company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
      AND l.atualizado_em >= '2025-09-01 00:00:00'
      AND l.atualizado_em <= '2025-09-30 23:59:59'
      AND l.custom_fields_values IS NOT NULL 
      AND l.custom_fields_values != '[]' 
      AND l.custom_fields_values != ''
      AND l.custom_fields_values != 'null'
)
SELECT 
    'Leads perdidos por custom_fields' as teste,
    COUNT(*) as resultado
FROM safe_json_leads sjl
WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(sjl.parsed_json) AS cf
    WHERE cf->>'field_name' = 'Perdidos'
      AND cf->'values'->0->>'value' = 'true'
);

-- 9. Testar parsing individual de custom_fields com tratamento de erro
WITH safe_custom_fields AS (
    SELECT 
        l.id as lead_id,
        l.etapa,
        l.status_id,
        l.custom_fields_values,
        CASE 
            WHEN l.custom_fields_values IS NULL THEN 'NULL'
            WHEN l.custom_fields_values = '' THEN 'VAZIO'
            WHEN l.custom_fields_values = '[]' THEN 'ARRAY_VAZIO'
            WHEN l.custom_fields_values = 'null' THEN 'STRING_NULL'
            WHEN l.custom_fields_values !~ '^[[:space:]]*\[.*\][[:space:]]*$' THEN 'FORMATO_INVALIDO'
            ELSE 'FORMATO_VALIDO'
        END as status_parsing
    FROM leads l
    WHERE l.company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
      AND l.atualizado_em >= '2025-09-01 00:00:00'
      AND l.atualizado_em <= '2025-09-30 23:59:59'
      AND l.custom_fields_values IS NOT NULL
)
SELECT 
    'Status de parsing dos custom_fields' as teste,
    status_parsing,
    COUNT(*) as quantidade
FROM safe_custom_fields
GROUP BY status_parsing
ORDER BY quantidade DESC;

-- 10. Testar a função RPC com debug
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

-- 11. Análise detalhada de leads com custom_fields malformados
SELECT 
    'Análise de leads com JSON malformado' as teste,
    id as lead_id,
    etapa,
    status_id,
    LENGTH(custom_fields_values) as tamanho_campo,
    SUBSTRING(custom_fields_values, 1, 1) as primeiro_char,
    SUBSTRING(custom_fields_values, LENGTH(custom_fields_values), 1) as ultimo_char,
    custom_fields_values as conteudo_completo
FROM leads 
WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
  AND atualizado_em >= '2025-09-01 00:00:00'
  AND atualizado_em <= '2025-09-30 23:59:59'
  AND custom_fields_values IS NOT NULL
  AND custom_fields_values != ''
  AND custom_fields_values != '[]'
  AND custom_fields_values != 'null'
  AND (
      custom_fields_values !~ '^[[:space:]]*\[.*\][[:space:]]*$'
      OR LENGTH(custom_fields_values) < 3
  )
LIMIT 5;
