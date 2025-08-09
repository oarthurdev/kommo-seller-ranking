import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/dashboard/Header';
import { ProgressBar } from '@/components/dashboard/ProgressBar';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { BrokerRankingTable } from '@/components/dashboard/BrokerRankingTable';
import { BrokerProfile } from '@/components/dashboard/BrokerProfile';
import { DataChart } from '@/components/dashboard/DataChart';
import { PipelineSelector, PipelineOverview } from '@/components/ui/PipelineSelector';
import { formatCurrency } from '@/lib/utils';
import type { Broker, Stats } from '@shared/schema';

// Page component
export default function Dashboard() {
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(4); // Ranking + top 3 brokers
  const [resetProgress, setResetProgress] = useState(0);
  const [brokerIds, setBrokerIds] = useState<number[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);

  const { data: brokers } = useQuery<Broker[]>({
    queryKey: ['/api/brokers/rankings', selectedPipelineId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedPipelineId) {
        params.append('pipeline_id', selectedPipelineId.toString());
      }
      return fetch(`/api/brokers/rankings?${params}`).then(res => res.json());
    }
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['/api/stats', selectedPipelineId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedPipelineId) {
        params.append('pipeline_id', selectedPipelineId.toString());
      }
      return fetch(`/api/stats?${params}`).then(res => res.json());
    }
  });

  // Update broker IDs whenever we get the brokers data
  useEffect(() => {
    if (brokers && brokers.length >= 3) {
      setBrokerIds(brokers.slice(0, 3).map(broker => broker.id));
      setTotalPages(4); // Main ranking + 3 broker pages
    }
  }, [brokers]);

  // Handle page rotation
  const rotatePage = useCallback(() => {
    setCurrentPage((prevPage) => (prevPage + 1) % totalPages);
    setResetProgress(prev => prev + 1); // Trigger progress bar reset
  }, [totalPages]);

  // Parse region data and monthly performance data
  const regionData = stats?.region_data 
    ? JSON.parse(typeof stats.region_data === 'string' ? stats.region_data : JSON.stringify(stats.region_data))
    : null;

  const monthlyPerformance = stats?.monthly_performance
    ? JSON.parse(typeof stats.monthly_performance === 'string' ? stats.monthly_performance : JSON.stringify(stats.monthly_performance))
    : null;

  // Transform data for charts
  const regionChartData = regionData
    ? Object.entries(regionData).map(([region, data]: [string, any]) => ({
        name: region.charAt(0).toUpperCase() + region.slice(1),
        value: data.percentage
      }))
    : [];

  // Determine if we should show a specific broker page or the main ranking page
  const showRankingPage = currentPage === 0;
  const currentBrokerId = currentPage > 0 && brokerIds.length >= currentPage ? brokerIds[currentPage - 1] : null;

  // Calculate stats changes
  let totalPropertiesChange = 0;
  let monthlySalesChangePercent = 0;
  let activeBrokersChange = 0;
  let avgSaleTimeChange = 0;

  if (stats) {
    totalPropertiesChange = stats.total_properties - stats.last_month_properties;
    monthlySalesChangePercent = parseFloat(stats.monthly_sales) === 0 ? 0 :
      ((parseFloat(stats.monthly_sales) - parseFloat(stats.last_month_sales)) / parseFloat(stats.last_month_sales)) * 100;
    activeBrokersChange = stats.active_brokers - stats.last_month_active_brokers;
    avgSaleTimeChange = stats.last_month_avg_sale_time - stats.avg_sale_time;
  }

  return (
    <div className="min-h-screen p-6">
      <ProgressBar key={resetProgress} duration={5000} onComplete={rotatePage} />
      
      {/* Main ranking page */}
      <div className={`page-transition ${showRankingPage ? 'opacity-100' : 'opacity-0 hidden'}`}>
        <Header title="DiCasa" coloredText="Dashboard" />
        
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <PipelineSelector 
            onPipelineChange={setSelectedPipelineId}
            selectedPipelineId={selectedPipelineId}
          />
          {!selectedPipelineId && (
            <div className="text-sm text-muted-foreground">
              Visualizando dados de todos os funis
            </div>
          )}
        </div>
        
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Properties"
              value={stats.total_properties}
              change={{ 
                value: totalPropertiesChange,
                isPositive: totalPropertiesChange >= 0
              }}
              delay={0.1}
            />
            
            <StatsCard
              title="Monthly Sales"
              value={formatCurrency(stats.monthly_sales)}
              change={{ 
                value: `${Math.round(monthlySalesChangePercent)}%`,
                isPositive: monthlySalesChangePercent >= 0
              }}
              delay={0.2}
            />
            
            <StatsCard
              title="Active Brokers"
              value={stats.active_brokers}
              change={{ 
                value: activeBrokersChange,
                isPositive: activeBrokersChange >= 0
              }}
              suffix={activeBrokersChange === 1 ? "new this month" : "new this month"}
              delay={0.3}
            />
            
            <StatsCard
              title="Average Sale Time"
              value={`${stats.avg_sale_time} days`}
              change={{ 
                value: `${Math.abs(avgSaleTimeChange)} days`,
                isPositive: avgSaleTimeChange >= 0
              }}
              delay={0.4}
            />
          </div>
        )}
        
        {brokers && brokers.length > 0 && (
          <BrokerRankingTable brokers={brokers} />
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {regionData && (
            <DataChart
              title="Sales by Region"
              type="donut"
              data={regionChartData}
              colors={['#6366F1', '#22C55E', '#F59E0B', '#94A3B8']}
            />
          )}
          
          {monthlyPerformance && (
            <DataChart
              title="Monthly Performance"
              type="line"
              data={monthlyPerformance}
              color="hsl(var(--primary))"
            />
          )}
        </div>
      </div>
      
      {/* Broker profile pages */}
      {brokerIds.map((brokerId, index) => (
        <BrokerProfile 
          key={brokerId}
          brokerId={brokerId}
          visible={currentPage === index + 1}
        />
      ))}
    </div>
  );
}
