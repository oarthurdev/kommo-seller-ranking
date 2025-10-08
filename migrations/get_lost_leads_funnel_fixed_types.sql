-- Função corrigida get_lost_leads_funnel com identificação melhorada de leads perdidos
-- A coluna custom_fields_values contém um array JSON com informações das etapas

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
BEGIN
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
    -- Identificar leads perdidos de forma mais flexível
    leads_perdidos AS (
        SELECT lf.*
        FROM leads_filtrados lf
        WHERE lf.status_id = 143  -- Status perdido
           OR lf.etapa ILIKE '%perdido%'
           OR lf.etapa ILIKE '%lost%'
           OR lf.etapa ILIKE 'perdidos'
    ),
    -- Buscar etapas válidas da empresa (excluindo perdidos)
    etapas_company AS (
        SELECT 
            stage_name,
            stage_id,
            ROW_NUMBER() OVER (ORDER BY stage_id) as ordem
        FROM stages_list 
        WHERE company_id = p_company_id
          AND stage_name IS NOT NULL
          AND stage_name != ''
          AND stage_name NOT ILIKE '%perdido%'
          AND stage_name NOT ILIKE '%lost%'
    ),
    -- Encontrar etapa anterior para cada lead perdido
    etapas_anteriores AS (
        SELECT 
            lp.id as lead_id,
            lp.valor,
            lp.etapa as etapa_atual,
            COALESCE(
                -- Tentar extrair da última etapa marcada no custom_fields
                (
                    SELECT ec.stage_name
                    FROM etapas_company ec
                    WHERE lp.custom_fields_values IS NOT NULL
                      AND lp.custom_fields_values::text != ''
                      AND lp.custom_fields_values::text != '[]'
                      AND lp.custom_fields_values::text != 'null'
                      AND EXISTS (
                          SELECT 1
                          FROM jsonb_array_elements(
                              CASE 
                                  WHEN lp.custom_fields_values::text ~ '^".*"$'
                                  THEN (TRIM(BOTH '"' FROM lp.custom_fields_values::text))::jsonb
                                  ELSE lp.custom_fields_values::jsonb
                              END
                          ) AS cf
                          WHERE cf->>'field_name' = ec.stage_name
                            AND cf->>'field_type' = 'checkbox'
                            AND cf->'values'->0->>'value' = 'true'
                      )
                    ORDER BY ec.ordem DESC
                    LIMIT 1
                ),
                -- Fallback: buscar a última etapa válida que o lead teve antes de perder
                (
                    SELECT l2.etapa
                    FROM leads l2
                    WHERE l2.id = lp.id
                      AND l2.company_id = p_company_id
                      AND l2.etapa IS NOT NULL
                      AND l2.etapa NOT ILIKE '%perdido%'
                      AND l2.etapa NOT ILIKE '%lost%'
                      AND EXISTS (
                          SELECT 1 FROM etapas_company ec 
                          WHERE ec.stage_name = l2.etapa
                      )
                    ORDER BY l2.atualizado_em DESC
                    LIMIT 1
                ),
                -- Último fallback: usar a primeira etapa válida do pipeline
                (
                    SELECT ec.stage_name
                    FROM etapas_company ec
                    WHERE ec.ordem = 1
                    LIMIT 1
                )
            ) as etapa_anterior
        FROM leads_perdidos lp
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
    FROM etapas_anteriores ea
    WHERE ea.etapa_anterior IS NOT NULL 
      AND ea.etapa_anterior != ''
    GROUP BY ea.etapa_anterior
    HAVING COUNT(DISTINCT ea.lead_id) > 0
    ORDER BY total DESC;

END;
$$;