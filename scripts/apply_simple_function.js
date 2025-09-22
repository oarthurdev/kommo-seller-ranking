import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSimpleFunction() {
  try {
    console.log('Criando função simplificada...');
    
    // Primeiro, vamos verificar a estrutura da tabela activities
    const { data: activitiesCheck, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .limit(1);
      
    if (activitiesError) {
      console.log('Tabela activities não encontrada ou erro:', activitiesError);
    } else {
      console.log('Estrutura de activities (primeiro registro):', activitiesCheck?.[0] || 'Nenhum registro');
    }

    // Função simplificada que funciona com a estrutura atual
    const simpleFunctionSql = `
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
            l.atualizado_em
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
        WHERE lf.etapa = p_stage_name
           OR lf.etapa ILIKE '%perdido%'
           OR lf.etapa ILIKE '%lost%'
           OR lf.status_id = 143
    ),
    etapas_com_atividades AS (
        SELECT 
            lp.id as lead_id,
            lp.valor,
            lp.etapa as etapa_atual,
            -- Buscar a última atividade que mudou a etapa antes de ficar perdido
            (SELECT a.description
             FROM activities a 
             WHERE a.lead_id = lp.id 
               AND a.company_id = p_company_id
               AND a.created_at < lp.atualizado_em
               AND (a.description ILIKE '%etapa%' OR a.field_name ILIKE '%etapa%' OR a.field_name ILIKE '%stage%')
             ORDER BY a.created_at DESC 
             LIMIT 1) as atividade_anterior,
            -- Se não tiver atividade, tentar buscar por outros leads similares como referência
            COALESCE(
                (SELECT l2.etapa 
                 FROM leads l2 
                 WHERE l2.company_id = p_company_id
                   AND l2.pipeline_id = lp.pipeline_id
                   AND l2.id != lp.id
                   AND l2.atualizado_em < lp.atualizado_em
                   AND l2.etapa != p_stage_name
                   AND l2.etapa NOT ILIKE '%perdido%'
                   AND l2.etapa NOT ILIKE '%lost%'
                 ORDER BY l2.atualizado_em DESC
                 LIMIT 1),
                'Primeira Etapa'
            ) as etapa_referencia
        FROM leads_perdidos lp
    ),
    etapas_anteriores AS (
        SELECT 
            eca.lead_id,
            eca.valor,
            CASE 
                WHEN eca.atividade_anterior IS NOT NULL THEN 
                    -- Extrair nome da etapa da descrição da atividade
                    CASE 
                        WHEN eca.atividade_anterior ILIKE '%para %' THEN 
                            regexp_replace(split_part(eca.atividade_anterior, ' para ', 1), '.*de ', '')
                        WHEN eca.atividade_anterior ILIKE '%stage%' THEN 
                            regexp_replace(eca.atividade_anterior, '.*stage[^a-zA-Z]*([a-zA-Z ]+).*', '\\1')
                        ELSE eca.etapa_referencia
                    END
                ELSE eca.etapa_referencia
            END as etapa_anterior
        FROM etapas_com_atividades eca
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
      AND ea.etapa_anterior != p_stage_name
    GROUP BY ea.etapa_anterior
    ORDER BY total DESC;
END;
$$;`;

    console.log('Aplicando função simplificada...');
    
    // Testar a função diretamente
    console.log('\\nTestando função com parâmetros fornecidos...');
    const { data: testResult, error: testError } = await supabase
      .rpc('get_lost_leads_funnel', {
        p_company_id: '0a3157ce-6591-4357-b663-0e4d333d06a5',
        p_start: '2025-09-01 00:00:00',
        p_end: '2025-09-22 15:00:00',
        p_stage_name: 'Perdidos',
        p_broker_id: 12602696,
        p_pipeline_ids: [8865067, 8865115]
      });
      
    if (testError) {
      console.error('Erro ao testar função:', testError);
      
      // Investigar mais profundamente os dados
      console.log('\\nInvestigando dados disponíveis...');
      
      // Verificar leads perdidos
      const { data: lostLeads, error: lostError } = await supabase
        .from('leads')
        .select('id, etapa, status_id, valor, atualizado_em')
        .eq('company_id', '0a3157ce-6591-4357-b663-0e4d333d06a5')
        .eq('responsavel_id', 12602696)
        .in('pipeline_id', [8865067, 8865115])
        .gte('atualizado_em', '2025-09-01 00:00:00')
        .lte('atualizado_em', '2025-09-22 15:00:00')
        .limit(20);
        
      if (lostError) {
        console.error('Erro ao buscar leads:', lostError);
      } else {
        console.log('Total de leads no período:', lostLeads?.length || 0);
        if (lostLeads && lostLeads.length > 0) {
          console.log('Etapas encontradas:', [...new Set(lostLeads.map(l => l.etapa))]);
          console.log('Status IDs encontrados:', [...new Set(lostLeads.map(l => l.status_id))]);
          
          // Verificar especificamente leads com etapa "Perdidos"
          const perdidos = lostLeads.filter(l => l.etapa === 'Perdidos' || l.etapa?.toLowerCase().includes('perdido'));
          console.log('Leads com etapa perdidos:', perdidos.length);
          console.log('Exemplos de leads perdidos:', perdidos.slice(0, 3));
        }
      }
      
    } else {
      console.log('✅ Resultado do teste:', testResult);
      if (!testResult || testResult.length === 0) {
        console.log('⚠️  Função retornou vazio, mas sem erro.');
      } else {
        console.log(`📊 Encontrados ${testResult.length} grupos de etapas anteriores:`);
        testResult.forEach(row => {
          console.log(`  - ${row.etapa_anterior}: ${row.total} leads, valor total: ${row.total_value}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

createSimpleFunction();