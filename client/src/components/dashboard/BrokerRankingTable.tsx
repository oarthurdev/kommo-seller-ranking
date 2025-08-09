
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { Broker } from '@shared/schema';
import { ArrowRight, Award, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';

interface BrokerRankingTableProps {
  brokers: Broker[];
}

export function BrokerRankingTable({ brokers }: BrokerRankingTableProps) {
  return (
    <div className="bg-card rounded-xl shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Top Corretores</h2>
            <p className="text-muted-foreground">
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">Atualizado em tempo real</span>
        </div>
      </div>

      <div className="space-y-4">
        {brokers.map((broker, index) => (
          <Link 
            key={broker.id} 
            href={`/broker/${broker.id}`}
          >
            <div 
              className="group relative bg-background/50 hover:bg-background/80 rounded-lg p-4 transition-all cursor-pointer animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                    <div 
                      className="w-full h-full rounded-full flex items-center justify-center text-lg font-bold"
                      style={{ 
                        backgroundColor: `${broker.avatar_color}20`,
                        color: broker.avatar_color 
                      }}
                    >
                      {broker.avatar_initials}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xl font-bold text-primary">#{index + 1}</span>
                      <h3 className="font-semibold text-lg">{broker.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{broker.specialty}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Imóveis</p>
                    <p className="font-mono text-lg font-semibold">{broker.properties_sold || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Vendas</p>
                    <p className="font-mono text-lg font-semibold">{formatCurrency(broker.total_sales || 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Pontos</p>
                    <p className="font-mono text-lg font-bold text-primary">{formatNumber(broker.points || 0)}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
