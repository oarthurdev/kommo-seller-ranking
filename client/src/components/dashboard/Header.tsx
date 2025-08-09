import { Card, CardContent } from "@/components/ui/card";
import { useBranding } from "@/lib/brandingContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { branding } = useBranding();

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {branding?.logo_url && (
              <img 
                src={branding.logo_url} 
                alt="Company Logo" 
                className="company-logo"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {branding?.dashboard_title || title}
              </h1>
              {subtitle && (
                <p className="text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}