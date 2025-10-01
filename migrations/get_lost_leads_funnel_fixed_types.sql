
-- Função corrigida get_lost_leads_funnel com tipos corretos
-- Corrige o erro 42804 ajustando o tipo de retorno para character varying
-- Corrige a lógica para capturar todos os leads perdidos, não apenas o último

CREATE OR REPLACE FUNCTION get_lost_leads_funnel(
    p_company_id UUID,
    p_start TIMESTAMP,
    p_end TIMESTAMP,
    p_stage_name TEXT,
    p_broker_id BIGINT DEFAULT NULL,
    p_pipeline_ids BIGINT[] DEFAULT NULL
) 
RETURNS TABLE(
    etapa_anterior CHARACTER VARYING,  -- Mudado de TEXT para CHARACTER VARYING
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
            l.criado_em
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
    ),
    -- Buscar todas as atividades relevantes para os leads perdidos
    atividades_leads_perdidos AS (
        SELECT 
            a.lead_id,
            a.status_anterior,
            a.status_novo,
            a.criado_em,
            sl.stage_name,
            lp.valor,
            -- Ranking para identificar a última atividade antes da perda
            ROW_NUMBER() OVER (
                PARTITION BY a.lead_id 
                ORDER BY a.criado_em DESC
            ) as rn_desc
        FROM leads_perdidos lp
        JOIN activities a ON a.lead_id = lp.id AND a.company_id = p_company_id
        LEFT JOIN stages_list sl ON sl.stage_id = a.status_anterior AND sl.company_id = p_company_id
        WHERE a.criado_em <= lp.atualizado_em
    ),
    etapas_anteriores AS (
        SELECT 
            lp.id as lead_id,
            lp.valor,
            COALESCE(
                -- Buscar etapa anterior via atividades que mudaram para status perdido (143)
                (SELECT alp.stage_name
                 FROM atividades_leads_perdidos alp
                 WHERE alp.lead_id = lp.id 
                   AND alp.status_novo = 143
                   AND alp.stage_name IS NOT NULL
                 ORDER BY alp.criado_em DESC 
                 LIMIT 1),
                -- Fallback: última etapa antes da atual (mais confiável)
                (SELECT alp.stage_name
                 FROM atividades_leads_perdidos alp
                 WHERE alp.lead_id = lp.id 
                   AND alp.rn_desc = 1
                   AND alp.stage_name IS NOT NULL
                   AND alp.stage_name != p_stage_name
                 LIMIT 1),
                -- Fallback adicional: buscar qualquer etapa anterior válida
                (SELECT sl.stage_name
                 FROM activities a 
                 JOIN stages_list sl ON sl.stage_id = a.status_novo AND sl.company_id = p_company_id
                 WHERE a.lead_id = lp.id 
                   AND a.company_id = p_company_id
                   AND a.criado_em < lp.atualizado_em
                   AND sl.stage_name IS NOT NULL
                   AND sl.stage_name != p_stage_name
                 ORDER BY a.criado_em DESC 
                 LIMIT 1)
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
      AND ea.etapa_anterior != p_stage_name  -- Evitar etapas iguais à etapa de perda
    GROUP BY ea.etapa_anterior
    ORDER BY total DESC;
END;
$$;
