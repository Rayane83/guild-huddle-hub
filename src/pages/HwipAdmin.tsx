import { SEOHead } from '@/components/SEOHead';
import { HwipManager } from '@/components/HwipManager';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function HwipAdminPage() {
  const { isAuthenticated, profile } = useCustomAuth();

  if (!isAuthenticated || !profile?.is_superstaff) {
    return (
      <>
        <SEOHead 
          title="Accès interdit - Administration HWIP"
          description="Cette page est réservée aux superstaff."
        />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Accès interdit</h3>
              <p className="text-muted-foreground">
                Cette page est réservée aux administrateurs superstaff.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead 
        title="Administration HWIP - Portail Entreprise Flashback Fa"
        description="Gestion des restrictions d'appareils et administration des utilisateurs."
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <HwipManager />
        </div>
      </div>
    </>
  );
}