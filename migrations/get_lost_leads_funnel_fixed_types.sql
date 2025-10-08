
-- Função corrigida get_lost_leads_funnel para identificar corretamente a etapa anterior
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
            l.criado_em
        FROM leads l
        WHERE l.company_id = p_company_id
          AND l.atualizado_em >= p_start
          AND l.atualizado_em <= p_end
          AND (p_broker_id IS NULL OR l.responsavel_id = p_broker_id)
          AND (p_pipeline_ids IS NULL OR l.pipeline_id = ANY(p_pipeline_ids))
    ),
    -- Identificar leads perdidos
    leads_perdidos AS (
        SELECT lf.*
        FROM leads_filtrados lf
        WHERE lf.status_id = 143
           OR lf.etapa ILIKE '%perdido%'
           OR lf.etapa ILIKE '%lost%'
           OR lf.etapa ILIKE 'perdidos'
    ),
    -- Buscar atividades de mudança de etapa para cada lead perdido
    ultima_etapa_valida AS (
        SELECT DISTINCT ON (lp.id)
            lp.id as lead_id,
            lp.valor,
            COALESCE(
                -- Buscar stage_name da tabela stages_list usando status_anterior da atividade
                (
                SELECT sl.stage_name
                FROM activities a
                JOIN LATERAL (
                    SELECT a.status_anterior::BIGINT AS status_anterior_bigint
                    WHERE a.status_anterior IS NOT NULL
                      AND a.status_anterior::TEXT != ''
                      AND a.status_anterior::TEXT ~ '^\d+$'
                ) safe_cast ON TRUE
                INNER JOIN stages_list sl 
                    ON sl.stage_id = safe_cast.status_anterior_bigint
                WHERE a.lead_id = lp.id
                  AND a.company_id = p_company_id
                  AND a.tipo = 'lead'
                  AND a.status_novo = 143
                  AND sl.company_id = p_company_id
                  AND sl.stage_name NOT ILIKE '%perdido%'
                  AND sl.stage_name NOT ILIKE '%lost%'
                ORDER BY a.criado_em DESC
                LIMIT 1
                ),
                -- Fallback para a etapa atual se não for perdido
                CASE 
                    WHEN lp.etapa NOT ILIKE '%perdido%' 
                         AND lp.etapa NOT ILIKE '%lost%'
                    THEN lp.etapa
                    ELSE NULL
                END
            ) as etapa_anterior
        FROM leads_perdidos lp
        ORDER BY lp.id
    ),
    -- Validar etapas contra stages_list
    etapas_validadas AS (
        SELECT 
            uev.lead_id,
            uev.valor,
            COALESCE(
                -- Tentar encontrar correspondência exata
                (SELECT sl.stage_name 
                 FROM stages_list sl 
                 WHERE sl.company_id = p_company_id 
                   AND sl.stage_name = uev.etapa_anterior
                 LIMIT 1),
                -- Tentar encontrar correspondência parcial (case insensitive)
                (SELECT sl.stage_name 
                 FROM stages_list sl 
                 WHERE sl.company_id = p_company_id 
                   AND LOWER(sl.stage_name) = LOWER(uev.etapa_anterior)
                 LIMIT 1),
                -- Se não encontrar, usar a etapa original
                uev.etapa_anterior
            )::TEXT as etapa_anterior
        FROM ultima_etapa_valida uev
        WHERE uev.etapa_anterior IS NOT NULL
    )
    SELECT 
        ev.etapa_anterior::TEXT,
        COUNT(DISTINCT ev.lead_id)::INTEGER as total,
        COALESCE(SUM(
            CASE 
                WHEN ev.valor IS NULL THEN 0
                WHEN ev.valor::text ~ '^[0-9]+\.?[0-9]*$' THEN ev.valor::NUMERIC
                ELSE 0
            END
        ), 0)::NUMERIC as total_value
    FROM etapas_validadas ev
    WHERE ev.etapa_anterior IS NOT NULL 
      AND ev.etapa_anterior != ''
      AND ev.etapa_anterior NOT ILIKE '%perdido%'
      AND ev.etapa_anterior NOT ILIKE '%lost%'
    GROUP BY ev.etapa_anterior::TEXT
    HAVING COUNT(DISTINCT ev.lead_id) > 0
    ORDER BY total DESC;

END;
$$;
