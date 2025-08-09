
import { Card, CardContent } from "@/components/ui/card";
import { Building2, AlertCircle } from "lucide-react";

interface CompanyNotFoundProps {
  subdomain?: string;
}

export function CompanyNotFound({ subdomain }: CompanyNotFoundProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-lg mx-4">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-100 rounded-full">
              <Building2 className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Empresa não encontrada</h1>
              <p className="text-sm text-gray-500">Subdomínio inválido</p>
            </div>
          </div>

          {subdomain && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700">
                O subdomínio <span className="font-semibold text-gray-900">{subdomain}</span> não corresponde a nenhuma empresa cadastrada em nosso sistema.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-amber-800 font-medium mb-1">O que fazer:</p>
              <ul className="text-amber-700 space-y-1">
                <li>• Verifique se o endereço está correto</li>
                <li>• Entre em contato com o administrador do sistema</li>
                <li>• Certifique-se de que sua empresa está cadastrada</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
