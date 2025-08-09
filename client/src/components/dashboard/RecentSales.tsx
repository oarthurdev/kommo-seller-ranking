import { formatCurrency, formatDate } from '@/lib/utils';
import type { Property } from '@shared/schema';

interface RecentSalesProps {
  sales: Property[];
}

export function RecentSales({ sales }: RecentSalesProps) {
  return (
    <div className="bg-card rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold mb-6">Recent Sales</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-muted-foreground text-sm border-b border-gray-700">
              <th className="pb-3 font-medium">Property</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Location</th>
              <th className="pb-3 font-medium">Sale Date</th>
              <th className="pb-3 font-medium text-right">Price</th>
              <th className="pb-3 font-medium text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale, index) => (
              <tr key={sale.id} className={index < sales.length - 1 ? "border-b border-gray-800" : ""}>
                <td className="py-3">
                  <div className="flex items-center">
                    <div 
                      className="w-8 h-8 rounded flex items-center justify-center mr-2"
                      style={{ 
                        backgroundColor: getPropertyColor(sale.type)
                      }}
                    />
                    <span className="font-medium">{sale.title}</span>
                  </div>
                </td>
                <td className="py-3 text-muted-foreground">{sale.type}</td>
                <td className="py-3 text-muted-foreground">{sale.location}</td>
                <td className="py-3 text-muted-foreground">{formatDate(sale.sale_date)}</td>
                <td className="py-3 text-right font-mono font-medium">{formatCurrency(sale.price)}</td>
                <td className="py-3 text-right font-mono font-medium text-primary">{sale.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getPropertyColor(type: string): string {
  const colors = {
    'Luxury': 'rgba(99, 102, 241, 0.1)',
    'Apartment': 'rgba(34, 197, 94, 0.1)',
    'House': 'rgba(245, 158, 11, 0.1)',
    'Commercial': 'rgba(148, 163, 184, 0.1)',
    'Land': 'rgba(102, 102, 102, 0.1)'
  };
  
  return colors[type as keyof typeof colors] || 'rgba(148, 163, 184, 0.1)';
}
