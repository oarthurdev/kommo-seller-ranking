import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Rectangle, LabelList } from 'recharts';
import { cn } from '@/lib/utils';

interface DataPoint {
  name: string;
  value: number;
}

interface DataChartProps {
  title: string;
  type: 'bar' | 'horizontalBar' | 'donut' | 'line';
  data: DataPoint[];
  color?: string;
  colors?: string[];
  className?: string;
}

export function DataChart({ 
  title, 
  type, 
  data, 
  color = 'hsl(var(--primary))', 
  colors,
  className 
}: DataChartProps) {

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <XAxis 
          dataKey="name" 
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Bar 
          dataKey="value" 
          radius={[2, 2, 0, 0]}
          barSize={20}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={color} 
              opacity={0.5 + (index / data.length) * 0.5} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderHorizontalBarChart = () => (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 5, right: 5, left: 70, bottom: 5 }}
      >
        <XAxis type="number" hide />
        <YAxis 
          dataKey="name" 
          type="category" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Bar 
          dataKey="value" 
          radius={[0, 2, 2, 0]}
          barSize={16}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`}
              fill={colors ? colors[index % colors.length] : color}
            />
          ))}
          <LabelList 
            dataKey="value" 
            position="right" 
            formatter={(value: number) => `${value}%`}
            style={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderDonutChart = () => (
    <div className="relative h-[200px] w-full">
      <svg className="w-full h-full" viewBox="0 0 160 160">
        <g transform="translate(80, 80)">
          {data.map((item, index) => {
            const colorToUse = colors ? colors[index % colors.length] : color;
            const total = data.reduce((sum, d) => sum + d.value, 0);
            const startAngle = data
              .slice(0, index)
              .reduce((sum, d) => sum + (d.value / total) * 360, 0);
            const angle = (item.value / total) * 360;
            
            return (
              <circle 
                key={`slice-${index}`}
                className="donut-chart" 
                r="60" 
                cx="0" 
                cy="0" 
                fill="transparent" 
                stroke={colorToUse}
                strokeWidth="20" 
                strokeDasharray={`${(item.value / total) * 377} 377`} 
                strokeDashoffset={`-${startAngle / 360 * 377}`} 
              />
            );
          })}
        </g>
      </svg>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="text-3xl font-mono font-bold text-foreground">
          {data.reduce((sum, item) => sum + item.value, 0)}
        </p>
        <p className="text-xs text-muted-foreground">Total</p>
      </div>
    </div>
  );

  const renderLineChart = () => (
    <div className="h-[200px] w-full">
      <svg className="w-full h-full" viewBox="0 0 300 150">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Generate path from data points */}
        {(() => {
          const maxValue = Math.max(...data.map(d => d.value));
          const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * 300;
            const y = 150 - (d.value / maxValue) * 130;
            return [x, y];
          });
          
          const linePath = `M${points.map(p => p.join(',')).join(' L')}`;
          const areaPath = `${linePath} L${points[points.length-1][0]},150 L0,150 Z`;
          
          return (
            <>
              <path className="sparkline-path" d={linePath} fill="none" stroke={color} strokeWidth="2" />
              <path d={areaPath} fill="url(#gradient)" />
              
              {/* Data Points */}
              {points.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color} />
              ))}
            </>
          );
        })()}
      </svg>
      
      <div className="grid grid-cols-6 gap-1 mt-2 text-xs text-center text-muted-foreground">
        {data.slice(0, 6).map((item, i) => (
          <div key={i}>{item.name}</div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={cn("bg-card rounded-xl p-6 shadow-lg", className)}>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="chart-container">
        {type === 'bar' && renderBarChart()}
        {type === 'horizontalBar' && renderHorizontalBarChart()}
        {type === 'donut' && renderDonutChart()}
        {type === 'line' && renderLineChart()}
      </div>
      
      {type === 'donut' && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          {data.map((item, index) => (
            <div key={`legend-${index}`} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ 
                  backgroundColor: colors 
                    ? colors[index % colors.length] 
                    : color 
                }}
              />
              <span className="text-sm">{item.name} ({item.value}%)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
