import React from 'react';

interface Alert {
  tipo: string;
  mensagem: string;
  quantidade: number;
}

interface AlertListProps {
  alerts: Alert[];
}

export function AlertList({ alerts }: AlertListProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-card p-4 rounded-lg shadow border border-border">
        <h3 className="text-lg font-semibold mb-4 text-card-foreground">Alertas</h3>
        <p className="text-muted-foreground text-sm">Nenhum alerta encontrado.</p>
      </div>
    );
  }

  return (
    <div className="bg-card p-4 rounded-lg shadow border border-border">
      <h3 className="text-lg font-semibold mb-4 text-card-foreground">Alertas</h3>
      
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          // Determinar cores baseadas no tipo de alerta
          const alertColor = alert.tipo === 'critical' 
            ? 'border-destructive bg-destructive/10 text-destructive' 
            : 'border-yellow-500 bg-yellow-500/10 text-yellow-500';
            
          return (
            <div 
              key={index}
              className={`p-3 border-l-4 rounded ${alertColor}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="mr-2">⚠</span>
                  <span className="text-sm">{alert.mensagem}</span>
                </div>
                {alert.quantidade > 0 && (
                  <span className="text-sm font-semibold">{alert.quantidade}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}