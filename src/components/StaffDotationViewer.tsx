// Composant temporairement simplifié en attendant la reconstruction
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface StaffDotationViewerProps {
  guildId: string;
  currentRole?: string;
}

export function StaffDotationViewer({ guildId, currentRole }: StaffDotationViewerProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Vue Staff Dotation</h2>
        <Badge variant="outline">Reconstruction en cours</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span>Fonctionnalité en cours de reconstruction</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            La vue staff des dotations est temporairement indisponible pendant la reconstruction de la base de données.
            Cette fonctionnalité sera rétablie sous peu avec une interface de supervision améliorée.
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            <p><strong>Guild ID:</strong> {guildId}</p>
            <p><strong>Rôle:</strong> {currentRole || 'Non défini'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}