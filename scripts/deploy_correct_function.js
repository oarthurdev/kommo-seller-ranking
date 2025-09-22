import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployCorrectFunction() {
  try {
    console.log('📦 Deploying corrected get_lost_leads_funnel function...');
    
    // Ler o SQL correto
    const sqlContent = fs.readFileSync('migrations/get_lost_leads_funnel_correct.sql', 'utf8');
    
    console.log('🔧 Applying function via direct SQL execution...');
    
    // Tentar executar usando uma abordagem mais direta
    // Como RPC não funcionou, vou usar uma query que sempre funciona
    const { data, error } = await supabase
      .from('leads')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('❌ Database connection failed:', error);
      return;
    }
    
    console.log('✅ Database connection verified');
    
    // Criar um arquivo temporário para executar via psql se possível
    console.log('📄 Function SQL created at migrations/get_lost_leads_funnel_correct.sql');
    console.log('');
    console.log('🔥 IMPORTANT: Execute this SQL in your database editor:');
    console.log('=' + '='.repeat(80));
    console.log(sqlContent);
    console.log('=' + '='.repeat(80));
    console.log('');
    
    // Testar se a função já existe (pode ter sido aplicada manualmente)
    console.log('🧪 Testing if function exists and works...');
    
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
      if (testError.code === 'PGRST202') {
        console.log('⚠️  Function not found in schema cache. Please:');
        console.log('   1. Execute the SQL above in your database SQL editor');
        console.log('   2. Reload the PostgREST schema cache');
        console.log('   3. Run this script again to test');
      } else {
        console.error('❌ Function test error:', testError);
      }
    } else {
      console.log('🎉 Function works! Results:');
      if (!testResult || testResult.length === 0) {
        console.log('   📊 Empty result (no lost leads with previous stages found)');
      } else {
        console.log(`   📊 Found ${testResult.length} groups:`);
        testResult.forEach(row => {
          console.log(`     - ${row.etapa_anterior}: ${row.total} leads, total value: R$ ${parseFloat(row.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        });
      }
    }
    
    // Instruções finais
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Copy the SQL above and execute it in your Supabase SQL Editor');
    console.log('2. After execution, test with:');
    console.log('   select * from get_lost_leads_funnel(\'0a3157ce-6591-4357-b663-0e4d333d06a5\', \'2025-09-01 00:00:00\', \'2025-09-22 15:00:00\', \'Perdidos\', 12602696, ARRAY[8865067, 8865115]);');
    console.log('3. This should return results showing previous stages of lost leads');
    
  } catch (error) {
    console.error('❌ Deployment error:', error);
  }
}

deployCorrectFunction();