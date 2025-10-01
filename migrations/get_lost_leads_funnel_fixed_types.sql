
-- Função corrigida get_lost_leads_funnel com tratamento robusto de JSON
-- A coluna é uma string que contém um array de objetos com field_name e values

CREATE OR REPLACE FUNCTION get_lost_leads_funnel(
    p_company_id UUID,
    p_start TIMESTAMP,
    p_end TIMESTAMP,
    p_stage_name TEXT,
    p_broker_id BIGINT DEFAULT NULL,
    p_pipeline_ids BIGINT[] DEFAULT NULL
) 
RETURNS TABLE(
    etapa_anterior TEXT,
    total INTEGER,
    total_value NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
    leads_filtrados_count INTEGER;
    leads_perdidos_count INTEGER;
    etapas_company_count INTEGER;
    etapas_anteriores_count INTEGER;
    debug_info TEXT;
    malformed_json_count INTEGER;
    valid_json_count INTEGER;
BEGIN
    -- Debug: Log dos parâmetros recebidos
    RAISE NOTICE 'DEBUG: Parâmetros recebidos - company_id: %, start: %, end: %, stage_name: %, broker_id: %, pipeline_ids: %', 
        p_company_id, p_start, p_end, p_stage_name, p_broker_id, p_pipeline_ids;

    RETURN QUERY
    WITH leads_filtrados AS (
        SELECT 
            l.id, 
            l.valor, 
            l.pipeline_id, 
            l.responsavel_id,
            l.etapa,
            l.status_id,
            l.atualizado_em,
            l.criado_em,
            l.custom_fields_values
        FROM leads l
        WHERE l.company_id = p_company_id
          AND l.atualizado_em >= p_start
          AND l.atualizado_em <= p_end
          AND (p_broker_id IS NULL OR l.responsavel_id = p_broker_id)
          AND (p_pipeline_ids IS NULL OR l.pipeline_id = ANY(p_pipeline_ids))
    ),
    debug_leads_filtrados AS (
        SELECT *, (SELECT COUNT(*) FROM leads_filtrados) as total_filtrados
        FROM leads_filtrados
    ),
    -- CTE para validar e converter string para JSONB
    leads_with_clean_json AS (
        SELECT 
            lf.*,
            CASE 
                WHEN lf.custom_fields_values IS NULL 
                     OR lf.custom_fields_values::text = ''
                     OR lf.custom_fields_values::text = '[]'
                     OR lf.custom_fields_values::text = 'null'
                     OR LENGTH(lf.custom_fields_values::text) < 3
                THEN '[]'::jsonb
                ELSE
                    -- Parsing seguro com tratamento de exceções
                    (
                        SELECT 
                            CASE 
                                WHEN safe_json IS NOT NULL THEN safe_json
                                ELSE '[]'::jsonb
                            END
                        FROM (
                            SELECT 
                                CASE
                                    WHEN lf.custom_fields_values::text ~ '^"?\[.*\]"?$'
                                    THEN
                                        -- Tentar parsing direto primeiro
                                        CASE
                                            WHEN lf.custom_fields_values::text !~ '[\x00-\x1F\x7F]' -- sem caracteres de controle
                                                 AND lf.custom_fields_values::text !~ '''[^'']*[^'']$' -- sem aspas simples malformadas
                                            THEN
                                                CASE
                                                    WHEN lf.custom_fields_values::text ~ '^".*"$'
                                                    THEN 
                                                        -- String com aspas duplas externas
                                                        (TRIM(BOTH '"' FROM lf.custom_fields_values::text))::jsonb
                                                    ELSE
                                                        -- String sem aspas externas
                                                        lf.custom_fields_values::jsonb
                                                END
                                            ELSE NULL
                                        END
                                    ELSE NULL
                                END as safe_json
                        ) parsed
                    )
            END as parsed_custom_fields
        FROM debug_leads_filtrados lf
    ),
    leads_perdidos AS (
        SELECT lf.*
        FROM leads_with_clean_json lf
        WHERE lf.status_id = 143  -- Status perdido
           OR lf.etapa = p_stage_name
           OR lf.etapa ILIKE '%perdido%'
           OR lf.etapa ILIKE '%lost%'
           OR (
               -- Verificação nos custom fields parseados
               jsonb_array_length(lf.parsed_custom_fields) > 0
               AND EXISTS (
                   SELECT 1
                   FROM jsonb_array_elements(lf.parsed_custom_fields) AS cf
                   WHERE cf->>'field_name' = 'Perdidos'
                     AND cf->'values'->0->>'value' = 'true'
               )
           )
    ),
    debug_leads_perdidos AS (
        SELECT *, (SELECT COUNT(*) FROM leads_perdidos) as total_perdidos
        FROM leads_perdidos
    ),
    -- Buscar etapas dinamicamente da tabela stages_list
    etapas_company AS (
        SELECT 
            stage_name,
            stage_id,
            ROW_NUMBER() OVER (ORDER BY stage_id) as ordem
        FROM stages_list 
        WHERE company_id = p_company_id
          AND stage_name IS NOT NULL
          AND stage_name != ''
          AND stage_name != p_stage_name
          AND stage_name != 'Perdidos'
          AND stage_name NOT ILIKE '%perdido%'
          AND stage_name NOT ILIKE '%lost%'
    ),
    debug_etapas_company AS (
        SELECT *, (SELECT COUNT(*) FROM etapas_company) as total_etapas
        FROM etapas_company
    ),
    etapas_anteriores AS (
        SELECT 
            lp.id as lead_id,
            lp.valor,
            lp.parsed_custom_fields,
            lp.etapa as etapa_atual,
            CASE 
                WHEN jsonb_array_length(lp.parsed_custom_fields) > 0
                THEN
                    -- Encontrar a última etapa marcada como true (maior ordem)
                    (
                        SELECT ec.stage_name
                        FROM debug_etapas_company ec
                        WHERE EXISTS (
                            SELECT 1
                            FROM jsonb_array_elements(lp.parsed_custom_fields) AS cf
                            WHERE cf->>'field_name' = ec.stage_name
                              AND cf->>'field_type' = 'checkbox'
                              AND cf->'values'->0->>'value' = 'true'
                        )
                        ORDER BY ec.ordem DESC
                        LIMIT 1
                    )
                ELSE
                    -- Fallback: usar etapa atual do lead se válida
                    CASE 
                        WHEN lp.etapa IS NOT NULL 
                             AND lp.etapa != p_stage_name 
                             AND lp.etapa != 'Perdidos'
                             AND lp.etapa NOT ILIKE '%perdido%'
                             AND lp.etapa NOT ILIKE '%lost%'
                             AND EXISTS (
                                 SELECT 1 FROM debug_etapas_company ec 
                                 WHERE ec.stage_name = lp.etapa
                             )
                        THEN lp.etapa
                        ELSE NULL
                    END
            END as etapa_anterior
        FROM debug_leads_perdidos lp
    ),
    debug_etapas_anteriores AS (
        SELECT *, (SELECT COUNT(*) FROM etapas_anteriores) as total_etapas_anteriores
        FROM etapas_anteriores
    )
    SELECT 
        ea.etapa_anterior,
        COUNT(DISTINCT ea.lead_id)::INTEGER as total,
        COALESCE(SUM(
            CASE 
                WHEN ea.valor IS NULL THEN 0
                WHEN ea.valor::text ~ '^[0-9]+\.?[0-9]*$' THEN ea.valor::NUMERIC
                ELSE 0
            END
        ), 0) as total_value
    FROM debug_etapas_anteriores ea
    WHERE ea.etapa_anterior IS NOT NULL 
      AND ea.etapa_anterior != ''
      AND ea.etapa_anterior != p_stage_name
      AND ea.etapa_anterior != 'Perdidos'
    GROUP BY ea.etapa_anterior
    ORDER BY total DESC;

    -- Debug: Contar registros em cada etapa
    SELECT COUNT(*) INTO leads_filtrados_count FROM leads l 
    WHERE l.company_id = p_company_id 
      AND l.atualizado_em >= p_start 
      AND l.atualizado_em <= p_end 
      AND (p_broker_id IS NULL OR l.responsavel_id = p_broker_id)
      AND (p_pipeline_ids IS NULL OR l.pipeline_id = ANY(p_pipeline_ids));

    SELECT COUNT(*) INTO etapas_company_count FROM stages_list 
    WHERE company_id = p_company_id 
      AND stage_name IS NOT NULL 
      AND stage_name != '' 
      AND stage_name != p_stage_name;

    -- Debug: Contar JSONs malformados vs válidos
    SELECT COUNT(*) INTO malformed_json_count FROM leads l
    WHERE l.company_id = p_company_id 
      AND l.atualizado_em >= p_start 
      AND l.atualizado_em <= p_end 
      AND l.custom_fields_values IS NOT NULL
      AND l.custom_fields_values::text != ''
      AND l.custom_fields_values::text != '[]'
      AND l.custom_fields_values::text != 'null'
      AND LENGTH(l.custom_fields_values::text) >= 3
      AND l.custom_fields_values::text !~ '^"?\[.*\]"?$';

    SELECT COUNT(*) INTO valid_json_count FROM leads l
    WHERE l.company_id = p_company_id 
      AND l.atualizado_em >= p_start 
      AND l.atualizado_em <= p_end 
      AND l.custom_fields_values IS NOT NULL
      AND l.custom_fields_values::text != ''
      AND l.custom_fields_values::text != '[]'
      AND l.custom_fields_values::text != 'null'
      AND LENGTH(l.custom_fields_values::text) >= 3
      AND l.custom_fields_values::text ~ '^"?\[.*\]"?$';

    RAISE NOTICE 'DEBUG: Leads filtrados: %, Etapas da empresa: %, JSONs malformados: %, JSONs válidos: %', 
        leads_filtrados_count, etapas_company_count, malformed_json_count, valid_json_count;

    -- Debug: Mostrar algumas etapas da empresa
    FOR debug_info IN 
        SELECT 'Etapa: ' || stage_name || ' (ID: ' || stage_id || ')' 
        FROM stages_list 
        WHERE company_id = p_company_id 
          AND stage_name IS NOT NULL 
          AND stage_name != '' 
        LIMIT 10
    LOOP
        RAISE NOTICE 'DEBUG: %', debug_info;
    END LOOP;

    -- Debug: Mostrar alguns leads perdidos com custom_fields
    FOR debug_info IN 
        SELECT 'Lead ID: ' || l.id || ', Etapa: ' || COALESCE(l.etapa, 'NULL') || 
               ', Status: ' || l.status_id || ', Custom fields presente: ' || 
               CASE WHEN l.custom_fields_values IS NOT NULL AND l.custom_fields_values::text != '' THEN 'SIM' ELSE 'NÃO' END ||
               ', Tamanho: ' || COALESCE(LENGTH(l.custom_fields_values::text), 0) ||
               ', Primeiro char: ' || COALESCE(SUBSTRING(l.custom_fields_values::text, 1, 1), 'NULL') ||
               ', Último char: ' || COALESCE(SUBSTRING(l.custom_fields_values::text, LENGTH(l.custom_fields_values::text), 1), 'NULL')
        FROM leads l 
        WHERE l.company_id = p_company_id 
          AND l.atualizado_em >= p_start 
          AND l.atualizado_em <= p_end 
          AND (l.status_id = 143 OR l.etapa ILIKE '%perdido%')
        LIMIT 5
    LOOP
        RAISE NOTICE 'DEBUG: %', debug_info;
    END LOOP;

    -- Debug: Mostrar exemplos de custom_fields malformados
    FOR debug_info IN 
        SELECT 'Lead malformado ID: ' || l.id || ', Conteúdo: ' || COALESCE(LEFT(l.custom_fields_values::text, 100), 'NULL')
        FROM leads l 
        WHERE l.company_id = p_company_id 
          AND l.atualizado_em >= p_start 
          AND l.atualizado_em <= p_end 
          AND l.custom_fields_values IS NOT NULL
          AND l.custom_fields_values::text != ''
          AND l.custom_fields_values::text != '[]'
          AND l.custom_fields_values::text != 'null'
          AND LENGTH(l.custom_fields_values::text) >= 3
          AND l.custom_fields_values::text !~ '^"?\[.*\]"?$'
        LIMIT 3
    LOOP
        RAISE NOTICE 'DEBUG: %', debug_info;
    END LOOP;

END;
$$;
