
# Sistema de Ranking de Corretores

Sistema multi-empresa para visualização e análise de performance de corretores imobiliários em tempo real.

## Funcionalidades Principais

### 📊 Página de Ranking (`/ranking`)
- **Classificação geral** dos corretores ordenada por pontuação
- **Métricas resumidas** da empresa: total de leads, corretores ativos, vendas totais
- **Filtro por mês/ano** para análise de períodos específicos
- **Layout responsivo** com suporte para diferentes resoluções (mobile, HD, FHD, QHD, UHD)
- **Atualização em tempo real** dos dados
- **Modo TV** com layout otimizado para displays grandes

### 👤 Perfil Individual do Corretor (`/ranking/broker/:id`)
- **Métricas de performance**: ticket médio, VGV, tempo de resposta, vendas fechadas
- **Funil de vendas** interativo mostrando conversão por etapas
- **Funil de leads perdidos** com análise por motivo
- **Mapa de calor de atividade** por dia/hora
- **Filtros independentes** para cada seção (métricas, funil, heatmap)
- **Posição no ranking** em tempo real

### 🔄 Navegação Automática
- **Rotação automática** entre página principal e perfis dos top 3 corretores
- **Indicador visual** de progresso da rotação
- **Modo TV** com transições suaves

## Arquitetura Multi-Empresa

O sistema suporta múltiplas empresas com:
- **Configurações independentes** por empresa
- **Branding personalizado**: logo, cores, títulos
- **Pipeline de vendas** configurável via Kommo/AmoCRM
- **Sistema de pontuação** baseado nas regras de cada empresa
- **Dados isolados** entre empresas

## Componentes Principais

### Frontend (React + TypeScript)
- **RankingPage**: Página principal com grid de corretores
- **BrokerProfilePage**: Perfil detalhado do corretor
- **BrokerCard**: Card individual do corretor no ranking
- **MetricSummaryCards**: Cards de métricas resumidas
- **FunnelBar**: Visualização do funil de vendas
- **HeatMap**: Mapa de calor de atividade
- **LostLeadsFunnel**: Análise de leads perdidos

### Filtros e Períodos
- **MonthFilter**: Filtro por mês/ano
- **PeriodFilter**: Filtros de período (semana atual, mês atual, customizado)
- **Filtros independentes** por componente para análises específicas

### Backend (Node.js + Supabase)
- **API RESTful** para dados de corretores e métricas
- **Integração Kommo/AmoCRM** para dados de leads e vendas
- **Sistema de cache** para otimização de performance
- **Cálculo automático** de pontuações e rankings

## Métricas Calculadas

### Por Corretor
- **Pontuação total** (baseada nas regras da empresa)
- **Total de leads** capturados
- **Vendas realizadas** e valor (VGV)
- **Taxa de conversão** (vendas/leads)
- **Ticket médio** por venda
- **Tempo médio** de primeira interação
- **Propostas enviadas**
- **Leads perdidos** por motivo
- **Tempo de inatividade** atual

### Globais da Empresa
- **Total de leads** do período
- **Corretores ativos**
- **Total de vendas** em valor
- **Pontuação máxima** atingida

## Tecnologias

- **Frontend**: React, TypeScript, TanStack Query, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Banco**: Supabase (PostgreSQL)
- **CRM**: Integração Kommo/AmoCRM
- **Deploy**: Replit

## Estrutura de Dados

O sistema utiliza as seguintes entidades principais:
- **Corretores** (`brokers`): dados dos corretores por empresa
- **Leads** (`leads`): leads do CRM com responsável e pipeline
- **Pontos** (`broker_points`): pontuações calculadas por período
- **Configurações** (`kommo_config`): configuração do pipeline por empresa
- **Branding** (`company_branding`): personalização visual por empresa

## Performance e Otimização

- **Cache inteligente** com TTL configurável
- **Queries otimizadas** com filtros de pipeline
- **Carregamento lazy** de componentes
- **Debounce** em filtros para reduzir chamadas à API
- **Layout adaptativo** para diferentes resoluções de tela
