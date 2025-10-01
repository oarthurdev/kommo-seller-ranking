
const { createClient } = require('@supabase/supabase-js');

// Configure suas credenciais do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testLostLeadsDebug() {
    const companyId = '0a3157ce-6591-4357-b663-0e4d333d06a5';
    const startDate = '2025-09-01 00:00:00';
    const endDate = '2025-09-30 23:59:59';
    
    console.log('🔍 Iniciando debug da função get_lost_leads_funnel...');
    console.log(`Company ID: ${companyId}`);
    console.log(`Período: ${startDate} até ${endDate}`);
    console.log('=' .repeat(60));

    try {
        // 1. Verificar leads da empresa no período
        console.log('\n1. Verificando leads da empresa no período...');
        const { data: totalLeads, error: leadsError } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .gte('atualizado_em', startDate)
            .lte('atualizado_em', endDate);
            
        if (leadsError) throw leadsError;
        console.log(`✅ Total de leads no período: ${totalLeads}`);

        // 2. Verificar etapas da empresa
        console.log('\n2. Verificando etapas da empresa...');
        const { data: stages, error: stagesError } = await supabase
            .from('stages_list')
            .select('stage_name, stage_id, pipeline_id')
            .eq('company_id', companyId)
            .not('stage_name', 'is', null)
            .neq('stage_name', '')
            .order('pipeline_id')
            .order('stage_id');
            
        if (stagesError) throw stagesError;
        console.log(`✅ Total de etapas encontradas: ${stages?.length || 0}`);
        stages?.forEach(stage => {
            console.log(`   - ${stage.stage_name} (ID: ${stage.stage_id}, Pipeline: ${stage.pipeline_id})`);
        });

        // 3. Verificar configuração de pipelines
        console.log('\n3. Verificando configuração de pipelines...');
        const { data: config, error: configError } = await supabase
            .schema('cf_kommo')
            .from('kommo_config')
            .select('pipeline_id')
            .eq('company_id', companyId)
            .single();
            
        if (configError) throw configError;
        console.log(`✅ Configuração de pipelines: ${JSON.stringify(config?.pipeline_id)}`);

        // 4. Testar a função RPC
        console.log('\n4. Executando função RPC com debug...');
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
            'get_lost_leads_funnel',
            {
                p_company_id: companyId,
                p_start: startDate,
                p_end: endDate,
                p_stage_name: 'Perdidos',
                p_broker_id: null,
                p_pipeline_ids: [8865067, 8865115]
            }
        );

        if (rpcError) {
            console.error('❌ Erro na função RPC:', rpcError);
            throw rpcError;
        }

        console.log(`✅ Resultado da RPC: ${rpcResult?.length || 0} etapas encontradas`);
        if (rpcResult && rpcResult.length > 0) {
            rpcResult.forEach(result => {
                console.log(`   - ${result.etapa_anterior}: ${result.total} leads (Valor: ${result.total_value})`);
            });
        } else {
            console.log('   - Nenhuma etapa anterior encontrada');
        }

        // 5. Verificar leads com custom_fields
        console.log('\n5. Verificando leads com custom_fields...');
        const { data: customFieldsLeads, error: customError } = await supabase
            .from('leads')
            .select('id, etapa, status_id, custom_fields_values')
            .eq('company_id', companyId)
            .gte('atualizado_em', startDate)
            .lte('atualizado_em', endDate)
            .not('custom_fields_values', 'is', null)
            .neq('custom_fields_values', '[]')
            .neq('custom_fields_values', '')
            .limit(5);
            
        if (customError) throw customError;
        console.log(`✅ Leads com custom_fields: ${customFieldsLeads?.length || 0}`);
        
        customFieldsLeads?.forEach(lead => {
            console.log(`   Lead ${lead.id}: etapa="${lead.etapa}", status=${lead.status_id}`);
            try {
                const fields = JSON.parse(lead.custom_fields_values);
                if (Array.isArray(fields)) {
                    fields.forEach(field => {
                        if (field.field_name && field.values && field.values[0]) {
                            console.log(`     - ${field.field_name}: ${field.values[0].value}`);
                        }
                    });
                }
            } catch (e) {
                console.log(`     - Erro ao parsear custom_fields: ${e.message}`);
            }
        });

    } catch (error) {
        console.error('❌ Erro durante o debug:', error);
    }
}

// Executar o teste
testLostLeadsDebug();
