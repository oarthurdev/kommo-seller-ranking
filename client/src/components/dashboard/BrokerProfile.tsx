import { formatCurrency, formatNumber } from '@/lib/utils';
import { StatsCard } from './StatsCard';
import { DataChart } from './DataChart';
import { RecentSales } from './RecentSales';
import { Header } from './Header';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Broker, Property } from '@shared/schema';

interface BrokerProfileProps {
  brokerId: number;
  visible: boolean;
}

interface BrokerPerformance {
  monthlyData: {
    month: string;
    salesAmount: number;
    propertiesSold: number;
    points: number;
  }[];
  propertyTypes: {
    type: string;
    percentage: number;
    count: number;
  }[];
}

export function BrokerProfile({ brokerId, visible }: BrokerProfileProps) {
  const { data: broker } = useQuery<Broker>({
    queryKey: [`/api/brokers/${brokerId}`],
    enabled: visible,
  });

  const { data: performance } = useQuery<BrokerPerformance>({
    queryKey: [`/api/brokers/${brokerId}/performance`],
    enabled: visible,
  });

  const { data: recentSales } = useQuery<Property[]>({
    queryKey: [`/api/brokers/${brokerId}/sales`],
    enabled: visible,
  });

  if (!broker) {
    return null;
  }

  // Determine the broker's color
  const brokerColor = broker.avatar_color;

  // Calculate changes
  const propChange = broker.properties_sold - broker.last_month_properties;
  const salesChange = parseFloat(broker.total_sales) - parseFloat(broker.last_month_sales);
  const salesChangePercent = ((salesChange / parseFloat(broker.last_month_sales)) * 100).toFixed(0);
  const pointsChange = broker.points - broker.last_month_points;
  const priceChange = parseFloat(broker.avg_sale_price) - parseFloat(broker.last_month_avg_price);
  const priceChangeFormatted = formatCurrency(Math.abs(priceChange));

  return (
    <div className={`page-transition ${visible ? 'opacity-100' : 'opacity-0 hidden'}`}>
      <Header 
        title="Broker" 
        coloredText="Profile" 
        broker={{
          rank: broker ? parseInt(broker.id.toString()) : 0,
          name: broker?.name || '',
          specialty: broker?.specialty || '',
          color: brokerColor
        }}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Properties Sold"
          value={broker.properties_sold}
          change={{ 
            value: propChange,
            isPositive: propChange >= 0
          }}
          delay={0.1}
        />
        
        <StatsCard
          title="Total Sales"
          value={formatCurrency(broker.total_sales)}
          change={{ 
            value: `${salesChangePercent}%`,
            isPositive: salesChange >= 0
          }}
          delay={0.2}
        />
        
        <StatsCard
          title="Points"
          value={formatNumber(broker.points)}
          change={{ 
            value: pointsChange,
            isPositive: pointsChange >= 0
          }}
          suffix="this month"
          delay={0.3}
          className="text-3xl font-mono font-bold"
          // Use the broker's color for the points value
          style={{ color: brokerColor }}
        />
        
        <StatsCard
          title="Avg. Sale Price"
          value={formatCurrency(broker.avg_sale_price)}
          change={{ 
            value: priceChangeFormatted,
            isPositive: priceChange >= 0
          }}
          delay={0.4}
        />
      </div>
      
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <DataChart
            title="Monthly Performance"
            type="bar"
            data={performance.monthlyData.map(item => ({
              name: item.month,
              value: item.salesAmount
            }))}
            color={brokerColor}
          />
          
          <DataChart
            title="Property Types"
            type="horizontalBar"
            data={performance.propertyTypes.map(item => ({
              name: item.type,
              value: item.percentage
            }))}
            colors={['#6366F1', '#22C55E', '#F59E0B', '#94A3B8', '#666666']}
          />
        </div>
      )}
      
      {recentSales && recentSales.length > 0 && (
        <RecentSales sales={recentSales} />
      )}
    </div>
  );
}
