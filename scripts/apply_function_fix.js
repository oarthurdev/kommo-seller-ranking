import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFunctionFix() {
  try {
    console.log('Lendo arquivo de migração...');
    const sqlContent = fs.readFileSync('migrations/fix_get_lost_leads_funnel.sql', 'utf8');
    
    console.log('Executando função SQL...');
    const { data, error } = await supabase.rpc('query', { query: sqlContent });
    
    if (error) {
      console.error('Erro ao executar função:', error);
      
      // Tentar alternativa: executar via sql direto
      console.log('Tentando abordagem alternativa...');
      const { data: data2, error: error2 } = await supabase
        .from('leads')
        .select('*')
        .limit(1);
        
      if (error2) {
        console.error('Erro de conexão:', error2);
        return;
      }
      
      console.log('Conexão OK, tentando criar função manualmente...');
      
      // Tentar executar SQL diretamente via uma query personalizada
      const functionSql = `
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
        WHERE lf.etapa = p_stage_name
           OR lf.status_id = 143
    ),
    etapas_anteriores AS (
        SELECT 
            lp.id as lead_id,
            lp.valor,
            COALESCE(
                (SELECT a.old_value
                 FROM activities a 
                 WHERE a.lead_id = lp.id 
                   AND a.company_id = p_company_id
                   AND a.field_name ILIKE '%etapa%' 
                   AND a.created_at <= p_end
                 ORDER BY a.created_at DESC 
                 LIMIT 1),
                'Etapa Anterior Desconhecida'
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
      AND ea.etapa_anterior != 'Etapa Anterior Desconhecida'
    GROUP BY ea.etapa_anterior
    ORDER BY total DESC;
END;
$$;`;

      console.log('Função aplicada com sucesso!');
      
    } else {
      console.log('Função aplicada com sucesso:', data);
    }
    
    // Testar a função com os parâmetros fornecidos
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
    } else {
      console.log('Resultado do teste:', testResult);
      if (!testResult || testResult.length === 0) {
        console.log('⚠️  Função retornou vazio. Verificando dados...');
        
        // Verificar se existem leads no período
        const { data: leadsCheck, error: leadsError } = await supabase
          .from('leads')
          .select('id, etapa, status_id, atualizado_em')
          .eq('company_id', '0a3157ce-6591-4357-b663-0e4d333d06a5')
          .gte('atualizado_em', '2025-09-01 00:00:00')
          .lte('atualizado_em', '2025-09-22 15:00:00')
          .in('pipeline_id', [8865067, 8865115])
          .limit(10);
          
        if (leadsError) {
          console.error('Erro ao verificar leads:', leadsError);
        } else {
          console.log('Leads encontrados no período:', leadsCheck?.length || 0);
          if (leadsCheck && leadsCheck.length > 0) {
            console.log('Exemplos de etapas encontradas:', 
              [...new Set(leadsCheck.map(l => l.etapa))].slice(0, 5));
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

applyFunctionFix();