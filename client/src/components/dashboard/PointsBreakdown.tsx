import React from 'react';

interface PointCategory {
  categoria: string;
  quantidade: number;
  pontos: number;
  tipo: 'Positivo' | 'Negativo';
}

interface PointsBreakdownProps {
  data: PointCategory[];
}

export function PointsBreakdown({ data }: PointsBreakdownProps) {
  // Calcular totais
  const totalPositivo = data
    .filter(item => item.tipo === 'Positivo')
    .reduce((sum, item) => sum + item.pontos, 0);
  
  const totalNegativo = data
    .filter(item => item.tipo === 'Negativo')
    .reduce((sum, item) => sum + Math.abs(item.pontos), 0);
  
  const saldo = totalPositivo - totalNegativo;

  // Determinar a escala máxima para os gráficos
  const maxPositivo = Math.max(...data.filter(item => item.tipo === 'Positivo').map(item => item.pontos), 1);
  const maxNegativo = Math.max(...data.filter(item => item.tipo === 'Negativo').map(item => Math.abs(item.pontos)), 1);
  const maxValue = Math.max(maxPositivo, maxNegativo);

  return (
    <div className="bg-card p-4 rounded-lg shadow border border-border">
      <h3 className="text-lg font-semibold mb-3 text-card-foreground">Detalhamento de Pontos</h3>
      
      <div className="flex items-center justify-between text-sm mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive"></div>
          <span className="text-muted-foreground">Negativo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-secondary"></div>
          <span className="text-muted-foreground">Positivo</span>
        </div>
      </div>
      
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="text-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-card-foreground">{item.categoria}</span>
              <span className={item.tipo === 'Positivo' ? 'text-secondary' : 'text-destructive'}>
                {item.tipo === 'Positivo' ? '+' : ''}{item.pontos}
              </span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${item.tipo === 'Positivo' ? 'bg-secondary' : 'bg-destructive'}`}
                style={{ 
                  width: `${(Math.abs(item.pontos) / maxValue) * 100}%`,
                  transition: 'width 0.5s ease'
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex justify-between text-sm">
          <div>
            <span className="text-muted-foreground">Pontos positivos: </span>
            <span className="text-secondary font-semibold">+{totalPositivo}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Pontos negativos: </span>
            <span className="text-destructive font-semibold">-{totalNegativo}</span>
          </div>
        </div>
        <div className="mt-2 text-sm">
          <span className="text-muted-foreground">Balanço: </span>
          <span className={`font-semibold ${saldo >= 0 ? 'text-secondary' : 'text-destructive'}`}>
            {saldo >= 0 ? '+' : ''}{saldo}
          </span>
        </div>
      </div>
    </div>
  );
}