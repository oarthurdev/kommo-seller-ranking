
import React from 'react';
import { X, Trophy, User, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SaleAlertProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: {
    brokerName: string;
    leadId: number;
    timestamp: string;
  } | null;
}

export function SaleAlert({ isOpen, onClose, saleData }: SaleAlertProps) {
  if (!isOpen || !saleData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="relative bg-gradient-to-br from-green-900/90 to-emerald-800/90 border-green-500/30 backdrop-blur-sm p-6 max-w-md w-full mx-4 shadow-2xl animate-in slide-in-from-top-4 duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-green-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              🎉 Nova Venda Realizada!
            </h2>
            <p className="text-green-100 text-lg">
              Parabéns pela conquista!
            </p>
          </div>

          <div className="bg-green-800/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3 text-green-100">
              <User className="w-5 h-5 text-green-300" />
              <span className="font-medium">{saleData.brokerName}</span>
            </div>
            
            <div className="flex items-center gap-3 text-green-100">
              <Trophy className="w-5 h-5 text-green-300" />
              <span>Lead #{saleData.leadId}</span>
            </div>

            <div className="flex items-center gap-3 text-green-100">
              <Calendar className="w-5 h-5 text-green-300" />
              <span>
                {new Date(saleData.timestamp).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg"
          >
            Continuar
          </button>
        </div>
      </Card>
    </div>
  );
}
