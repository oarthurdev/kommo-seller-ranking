
-- Função corrigida get_lost_leads_funnel usando stages_list dinâmicamente
-- Determina a etapa anterior baseada na hierarquia dos custom fields

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
    leads_perdidos AS (
        SELECT lf.*
        FROM leads_filtrados lf
        WHERE lf.status_id = 143  -- Status perdido
           OR lf.etapa = p_stage_name
           OR lf.etapa ILIKE '%perdido%'
           OR lf.etapa ILIKE '%lost%'
           OR (lf.custom_fields_values IS NOT NULL 
               AND lf.custom_fields_values != '{}' 
               AND lf.custom_fields_values::jsonb ? 'Perdidos' 
               AND lf.custom_fields_values::jsonb->>'Perdidos' = 'true')
    ),
    -- Buscar etapas dinamicamente da tabela stages_list
    etapas_company AS (
        SELECT 
            stage_name,
            stage_id,
            -- Criar uma ordem baseada no stage_id (assumindo que IDs menores = etapas anteriores)
            ROW_NUMBER() OVER (ORDER BY stage_id) as ordem
        FROM stages_list 
        WHERE company_id = p_company_id
          AND stage_name IS NOT NULL
          AND stage_name != ''
          AND stage_name != p_stage_name  -- Excluir a própria etapa "Perdidos"
          AND stage_name NOT ILIKE '%perdido%'
          AND stage_name NOT ILIKE '%lost%'
    ),
    etapas_anteriores AS (
        SELECT 
            lp.id as lead_id,
            lp.valor,
            CASE 
                WHEN lp.custom_fields_values IS NOT NULL 
                     AND lp.custom_fields_values != '{}' 
                     AND lp.custom_fields_values::jsonb ? 'Perdidos'
                     AND lp.custom_fields_values::jsonb->>'Perdidos' = 'true'
                THEN
                    -- Encontrar a última etapa marcada como true (maior ordem)
                    -- Buscar nos custom fields quais etapas estão marcadas como true
                    (
                        SELECT ec.stage_name
                        FROM etapas_company ec
                        WHERE lp.custom_fields_values::jsonb ? ec.stage_name
                          AND lp.custom_fields_values::jsonb->>ec.stage_name = 'true'
                        ORDER BY ec.ordem DESC
                        LIMIT 1
                    )
                WHEN lp.custom_fields_values IS NOT NULL 
                     AND lp.custom_fields_values != '{}'
                THEN
                    -- Se não tem "Perdidos" = true, mas tem custom fields,
                    -- buscar a última etapa true encontrada
                    (
                        SELECT ec.stage_name
                        FROM etapas_company ec
                        WHERE lp.custom_fields_values::jsonb ? ec.stage_name
                          AND lp.custom_fields_values::jsonb->>ec.stage_name = 'true'
                        ORDER BY ec.ordem DESC
                        LIMIT 1
                    )
                ELSE
                    -- Fallback: usar etapa atual do lead se válida
                    CASE 
                        WHEN lp.etapa IS NOT NULL 
                             AND lp.etapa != p_stage_name 
                             AND lp.etapa NOT ILIKE '%perdido%'
                             AND lp.etapa NOT ILIKE '%lost%'
                             AND EXISTS (
                                 SELECT 1 FROM etapas_company ec 
                                 WHERE ec.stage_name = lp.etapa
                             )
                        THEN lp.etapa
                        ELSE NULL
                    END
            END as etapa_anterior
        FROM leads_perdidos lp
    )
    SELECT 
        ea.etapa_anterior::TEXT,
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
      AND ea.etapa_anterior != p_stage_name
      AND ea.etapa_anterior != 'Perdidos'
    GROUP BY ea.etapa_anterior
    ORDER BY total DESC;
END;
$$;
