import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createFinalFunction() {
  try {
    console.log('Criando função final corrigida...');
    
    // Primeiro, vamos verificar o schema da tabela stages_list
    const { data: stagesCheck, error: stagesError } = await supabase
      .from('stages_list')
      .select('*')
      .limit(3);
      
    if (stagesError) {
      console.log('Erro ao acessar stages_list:', stagesError);
    } else {
      console.log('Estrutura de stages_list:', stagesCheck?.[0] || 'Nenhum registro');
    }

    // Como a função RPC não está sendo aplicada via Supabase, vou tentar uma abordagem direta
    // usando as queries que a função deveria fazer manualmente
    
    console.log('\\n=== EXECUÇÃO MANUAL DA LÓGICA DA FUNÇÃO ===');
    
    const companyId = '0a3157ce-6591-4357-b663-0e4d333d06a5';
    const brokerId = 12602696;
    const pipelineIds = [8865067, 8865115];
    const startDate = '2025-09-01 00:00:00';
    const endDate = '2025-09-22 15:00:00';
    
    // PASSO 1: Buscar leads filtrados
    console.log('PASSO 1: Buscando leads filtrados...');
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('id, valor, pipeline_id, responsavel_id, etapa, status_id, atualizado_em')
      .eq('company_id', companyId)
      .eq('responsavel_id', brokerId)
      .in('pipeline_id', pipelineIds)
      .gte('atualizado_em', startDate)
      .lte('atualizado_em', endDate);
      
    if (leadsError) {
      console.error('Erro ao buscar leads:', leadsError);
      return;
    }
    
    console.log(`✅ Encontrados ${leadsData.length} leads no total`);
    
    // PASSO 2: Filtrar leads perdidos (status_id = 143)
    const leadsPerdidos = leadsData.filter(lead => 
      lead.status_id === 143 || 
      lead.etapa === 'Perdidos' || 
      (lead.etapa && lead.etapa.toLowerCase().includes('perdido')) ||
      (lead.etapa && lead.etapa.toLowerCase().includes('lost'))
    );
    
    console.log(`✅ Encontrados ${leadsPerdidos.length} leads perdidos`);
    console.log('Leads perdidos:', leadsPerdidos.map(l => ({ id: l.id, etapa: l.etapa, status_id: l.status_id })));
    
    if (leadsPerdidos.length === 0) {
      console.log('❌ Nenhum lead perdido encontrado! Retornando resultado vazio.');
      console.log('\\n📊 RESULTADO FINAL: []');
      return;
    }
    
    // PASSO 3: Para cada lead perdido, encontrar a etapa anterior
    console.log('\\nPASSO 3: Buscando etapas anteriores...');
    const etapasAnteriores = [];
    
    for (const lead of leadsPerdidos) {
      console.log(`\\nAnalisando lead ${lead.id}...`);
      
      // Buscar na tabela activities a mudança de status que levou ao status perdido (143)
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('status_anterior, status_novo, valor_anterior, valor_novo, criado_em')
        .eq('lead_id', lead.id)
        .eq('company_id', companyId)
        .eq('status_novo', 143) // Status perdido
        .order('criado_em', { ascending: false })
        .limit(1);
        
      if (activitiesError) {
        console.log(`Erro ao buscar activities para lead ${lead.id}:`, activitiesError);
        continue;
      }
      
      if (activities && activities.length > 0) {
        const activity = activities[0];
        console.log(`  - Atividade encontrada: status ${activity.status_anterior} → ${activity.status_novo}`);
        
        // Buscar o nome da etapa anterior na stages_list
        const { data: stageData, error: stageError } = await supabase
          .from('stages_list')
          .select('stage_name')
          .eq('stage_id', activity.status_anterior)
          .eq('company_id', companyId)
          .single();
          
        if (stageError) {
          console.log(`    Erro ao buscar stage_name para status ${activity.status_anterior}:`, stageError);
        } else if (stageData) {
          console.log(`    Etapa anterior: ${stageData.stage_name}`);
          etapasAnteriores.push({
            lead_id: lead.id,
            valor: lead.valor,
            etapa_anterior: stageData.stage_name
          });
        }
      } else {
        console.log(`  - Nenhuma atividade de mudança para status perdido encontrada`);
        
        // Fallback: buscar qualquer atividade anterior deste lead
        const { data: anyActivities, error: anyError } = await supabase
          .from('activities')
          .select('status_anterior, status_novo, criado_em')
          .eq('lead_id', lead.id)
          .eq('company_id', companyId)
          .lt('criado_em', lead.atualizado_em)
          .order('criado_em', { ascending: false })
          .limit(1);
          
        if (anyActivities && anyActivities.length > 0) {
          const anyActivity = anyActivities[0];
          
          // Buscar o nome da etapa
          const { data: anyStageData, error: anyStageError } = await supabase
            .from('stages_list')
            .select('stage_name')
            .eq('stage_id', anyActivity.status_novo)
            .eq('company_id', companyId)
            .single();
            
          if (anyStageData) {
            console.log(`    Etapa anterior (fallback): ${anyStageData.stage_name}`);
            etapasAnteriores.push({
              lead_id: lead.id,
              valor: lead.valor,
              etapa_anterior: anyStageData.stage_name
            });
          }
        }
      }
    }
    
    console.log(`\\n✅ Etapas anteriores encontradas: ${etapasAnteriores.length}`);
    
    // PASSO 4: Agrupar e contar por etapa anterior
    console.log('\\nPASSO 4: Agrupando resultados...');
    const grupos = {};
    
    etapasAnteriores.forEach(item => {
      if (!item.etapa_anterior) return;
      
      if (!grupos[item.etapa_anterior]) {
        grupos[item.etapa_anterior] = {
          etapa_anterior: item.etapa_anterior,
          total: 0,
          total_value: 0
        };
      }
      
      grupos[item.etapa_anterior].total++;
      
      // Somar valor se existir e for numérico
      if (item.valor) {
        const valor = parseFloat(item.valor.toString().replace(/[^0-9.-]/g, ''));
        if (!isNaN(valor)) {
          grupos[item.etapa_anterior].total_value += valor;
        }
      }
    });
    
    // Converter para array e ordenar por total
    const resultado = Object.values(grupos).sort((a, b) => b.total - a.total);
    
    console.log('\\n📊 RESULTADO FINAL:');
    if (resultado.length === 0) {
      console.log('[]');
    } else {
      console.log(JSON.stringify(resultado, null, 2));
      
      console.log('\\n📋 RESUMO:');
      resultado.forEach(row => {
        console.log(`  - ${row.etapa_anterior}: ${row.total} leads, valor total: R$ ${row.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      });
    }
    
    // Agora vou criar uma função SQL simplificada que funcione
    console.log('\\n=== CRIANDO FUNÇÃO SQL FUNCIONAL ===');
    
    const sqlFunction = `
-- Função final corrigida para get_lost_leads_funnel
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
        WHERE lf.status_id = 143  -- Status perdido
           OR lf.etapa = p_stage_name
           OR lf.etapa ILIKE '%perdido%'
           OR lf.etapa ILIKE '%lost%'
    ),
    etapas_anteriores AS (
        SELECT 
            lp.id as lead_id,
            lp.valor,
            COALESCE(
                -- Buscar etapa anterior via atividades
                (SELECT sl.stage_name
                 FROM activities a 
                 JOIN stages_list sl ON sl.stage_id = a.status_anterior AND sl.company_id = p_company_id
                 WHERE a.lead_id = lp.id 
                   AND a.company_id = p_company_id
                   AND a.status_novo = 143
                 ORDER BY a.criado_em DESC 
                 LIMIT 1),
                -- Fallback: última etapa antes da atual
                (SELECT sl.stage_name
                 FROM activities a 
                 JOIN stages_list sl ON sl.stage_id = a.status_novo AND sl.company_id = p_company_id
                 WHERE a.lead_id = lp.id 
                   AND a.company_id = p_company_id
                   AND a.criado_em < lp.atualizado_em
                 ORDER BY a.criado_em DESC 
                 LIMIT 1)
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
    GROUP BY ea.etapa_anterior
    ORDER BY total DESC;
END;
$$;`;

    console.log('Função SQL criada. Para aplicá-la, execute no editor SQL do seu banco de dados:');
    console.log('\\n' + '='.repeat(80));
    console.log(sqlFunction);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

createFinalFunction();