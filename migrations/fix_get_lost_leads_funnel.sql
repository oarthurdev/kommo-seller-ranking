-- Correção da função get_lost_leads_funnel
-- Esta função busca leads perdidos e identifica suas etapas anteriores baseado no histórico de atividades

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
            l.status_id
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
        WHERE lf.etapa ILIKE '%perdido%' 
           OR lf.etapa ILIKE '%lost%'
           OR lf.etapa = p_stage_name
           OR lf.status_id = 143  -- ID do status perdido baseado no código
    ),
    etapas_anteriores AS (
        SELECT 
            lp.id as lead_id,
            lp.valor,
            COALESCE(
                -- Tentar buscar na tabela activities a última atividade de mudança de etapa
                (SELECT a.old_value
                 FROM activities a 
                 WHERE a.lead_id = lp.id 
                   AND a.company_id = p_company_id
                   AND a.field_name ILIKE '%etapa%' 
                   AND a.created_at <= p_end
                   AND a.new_value ILIKE '%perdido%'
                 ORDER BY a.created_at DESC 
                 LIMIT 1),
                -- Se não encontrar, tentar buscar baseado no custom_fields_values
                (SELECT prev_stage.stage_name
                 FROM leads l2
                 CROSS JOIN jsonb_array_elements(l2.custom_fields_values) WITH ORDINALITY AS current_stage(value, position)
                 LEFT JOIN jsonb_array_elements(l2.custom_fields_values) WITH ORDINALITY AS prev_stage_json(value, position) 
                   ON prev_stage_json.position = current_stage.position - 1
                 LEFT JOIN stages_list prev_stage ON prev_stage.stage_id = (prev_stage_json.value->>'stage_id')::bigint
                 WHERE l2.id = lp.id
                   AND l2.company_id = p_company_id
                   AND current_stage.value->>'field_name' ILIKE '%perdido%'
                   AND prev_stage.stage_name IS NOT NULL
                 LIMIT 1),
                -- Fallback: usar uma etapa padrão se não encontrar nada
                'Etapa Desconhecida'
            ) as etapa_anterior
        FROM leads_perdidos lp
    )
    SELECT 
        ea.etapa_anterior,
        COUNT(*)::INTEGER as total,
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
      AND ea.etapa_anterior != 'Etapa Desconhecida'
    GROUP BY ea.etapa_anterior
    ORDER BY total DESC;
END;
$$;