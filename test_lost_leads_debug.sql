
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

-- 4. Análise detalhada de custom_fields_values problemáticos
WITH custom_fields_analysis AS (
    SELECT 
        id as lead_id,
        etapa,
        status_id,
        custom_fields_values,
        LENGTH(custom_fields_values::text) as tamanho_campo,
        CASE 
            WHEN custom_fields_values IS NULL THEN 'NULL'
            WHEN custom_fields_values::text = '' THEN 'VAZIO'
            WHEN custom_fields_values::text = '[]' THEN 'ARRAY_VAZIO'
            WHEN custom_fields_values::text = 'null' THEN 'STRING_NULL'
            WHEN custom_fields_values::text ~ '^[[:space:]]*$' THEN 'APENAS_ESPACOS'
            WHEN custom_fields_values::text ~ '^"?\[.*\]"?$' THEN 'FORMATO_ARRAY_VALIDO'
            WHEN custom_fields_values::text ~ '^"?\[' AND custom_fields_values::text !~ '\]"?$' THEN 'ARRAY_INCOMPLETO'
            ELSE 'FORMATO_INVALIDO'
        END as tipo_conteudo,
        CASE 
            WHEN custom_fields_values IS NOT NULL AND LENGTH(custom_fields_values::text) > 0
            THEN SUBSTRING(custom_fields_values::text, 1, 1)
            ELSE NULL
        END as primeiro_char,
        CASE 
            WHEN custom_fields_values IS NOT NULL AND LENGTH(custom_fields_values::text) > 0
            THEN SUBSTRING(custom_fields_values::text, LENGTH(custom_fields_values::text), 1)
            ELSE NULL
        END as ultimo_char
    FROM leads 
    WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
      AND atualizado_em >= '2025-09-01 00:00:00'
      AND atualizado_em <= '2025-09-30 23:59:59'
)
SELECT 
    'Análise de custom_fields por tipo' as teste,
    tipo_conteudo,
    COUNT(*) as quantidade,
    MIN(tamanho_campo) as tamanho_min,
    MAX(tamanho_campo) as tamanho_max,
    AVG(tamanho_campo) as tamanho_medio
FROM custom_fields_analysis
GROUP BY tipo_conteudo
ORDER BY quantidade DESC;

-- 5. Mostrar exemplos de custom_fields malformados
SELECT 
    'Exemplos de custom_fields malformados' as teste,
    id as lead_id,
    etapa,
    status_id,
    LENGTH(custom_fields_values::text) as tamanho,
    SUBSTRING(custom_fields_values::text, 1, 50) as inicio_conteudo,
    SUBSTRING(custom_fields_values::text, GREATEST(1, LENGTH(custom_fields_values::text) - 49), 50) as fim_conteudo
FROM leads 
WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
  AND atualizado_em >= '2025-09-01 00:00:00'
  AND atualizado_em <= '2025-09-30 23:59:59'
  AND custom_fields_values IS NOT NULL
  AND custom_fields_values::text != ''
  AND custom_fields_values::text != '[]'
  AND custom_fields_values::text != 'null'
  AND (
      custom_fields_values::text !~ '^"?\[.*\]"?$'
      OR LENGTH(custom_fields_values::text) < 3
  )
LIMIT 5;

-- 6. Teste de parsing individual de JSON com tratamento de erro
WITH safe_json_test AS (
    SELECT 
        id as lead_id,
        custom_fields_values,
        CASE 
            WHEN custom_fields_values IS NULL OR custom_fields_values::text = '' OR custom_fields_values::text = '[]' OR custom_fields_values::text = 'null'
            THEN 'VAZIO_OU_NULO'
            WHEN custom_fields_values::text !~ '^"?\[.*\]"?$'
            THEN 'FORMATO_INVALIDO'
            ELSE
                CASE 
                    WHEN custom_fields_values::text ~ '^".*"$'
                    THEN
                        CASE
                            WHEN (TRIM(BOTH '"' FROM custom_fields_values::text))::jsonb IS NOT NULL
                            THEN 'PARSE_SUCESSO_COM_ASPAS'
                            ELSE 'PARSE_ERRO_COM_ASPAS'
                        END
                    ELSE
                        CASE
                            WHEN custom_fields_values::jsonb IS NOT NULL
                            THEN 'PARSE_SUCESSO_DIRETO'
                            ELSE 'PARSE_ERRO_DIRETO'
                        END
                END
        END as status_parse
    FROM leads 
    WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
      AND atualizado_em >= '2025-09-01 00:00:00'
      AND atualizado_em <= '2025-09-30 23:59:59'
      AND custom_fields_values IS NOT NULL
)
SELECT 
    'Status de parsing JSON' as teste,
    status_parse,
    COUNT(*) as quantidade
FROM safe_json_test
GROUP BY status_parse
ORDER BY quantidade DESC;

-- 7. Testar a função RPC com tratamento melhorado
SELECT 
    'Resultado da função RPC melhorada' as teste,
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

-- 8. Verificar se há caracteres especiais ou encoding problems
SELECT 
    'Análise de encoding de custom_fields' as teste,
    id as lead_id,
    LENGTH(custom_fields_values::text) as tamanho_original,
    LENGTH(TRIM(custom_fields_values::text)) as tamanho_sem_espacos,
    SUBSTRING(custom_fields_values::text, 1, 10) as primeiros_chars,
    SUBSTRING(custom_fields_values::text, GREATEST(1, LENGTH(custom_fields_values::text) - 9), 10) as ultimos_chars
FROM leads 
WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
  AND atualizado_em >= '2025-09-01 00:00:00'
  AND atualizado_em <= '2025-09-30 23:59:59'
  AND custom_fields_values IS NOT NULL
  AND custom_fields_values::text != ''
  AND custom_fields_values::text != '[]'
  AND custom_fields_values::text != 'null'
  AND custom_fields_values::text !~ '^"?\[.*\]"?$'
LIMIT 3;

-- 9. Verificar exemplos de custom_fields válidos
SELECT 
    'Exemplos de custom_fields válidos' as teste,
    id as lead_id,
    etapa,
    status_id,
    LENGTH(custom_fields_values::text) as tamanho,
    SUBSTRING(custom_fields_values::text, 1, 100) as preview_conteudo
FROM leads 
WHERE company_id = '0a3157ce-6591-4357-b663-0e4d333d06a5'
  AND atualizado_em >= '2025-09-01 00:00:00'
  AND atualizado_em <= '2025-09-30 23:59:59'
  AND custom_fields_values IS NOT NULL
  AND custom_fields_values::text != ''
  AND custom_fields_values::text != '[]'
  AND custom_fields_values::text != 'null'
  AND custom_fields_values::text ~ '^"?\[.*\]"?$'
LIMIT 5;
