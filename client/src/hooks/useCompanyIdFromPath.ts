
import { useLocation } from "wouter";

export function useCompanyIdFromPath(): string | null {
  const [location] = useLocation();
  
  // Para desenvolvimento local, usar um ID fixo
  if (typeof window !== 'undefined' && window.location.hostname.includes('replit.dev')) {
    return "4f114478-6405-4971-9344-01f647c6edb8";
  }
  
  // Em produção, extrair do subdomain
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const subdomain = hostname.split('.')[0];
  
  // Se tiver subdomain específico, retornar um ID correspondente
  if (subdomain === 'dicasaindaial') {
    return "4f114478-6405-4971-9344-01f647c6edb8";
  }
  
  // Fallback para desenvolvimento
  return "4f114478-6405-4971-9344-01f647c6edb8";
}
