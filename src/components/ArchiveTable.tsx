// Composant temporairement simplifié en attendant la régénération des types Supabase
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface ArchiveTableProps {
  guildId: string;
  currentRole?: string;
  entreprise?: string;
}

export function ArchiveTable({ guildId, currentRole, entreprise }: ArchiveTableProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Archives</h2>
        <Badge variant="outline">Reconstruction en cours</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            <span>Fonctionnalité en cours de reconstruction</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Les archives sont temporairement indisponibles pendant la reconstruction de la base de données.
            Cette fonctionnalité sera rétablie sous peu avec la nouvelle structure simplifiée.
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            <p><strong>Guild ID:</strong> {guildId}</p>
            <p><strong>Rôle:</strong> {currentRole || 'Non défini'}</p>
            <p><strong>Entreprise:</strong> {entreprise || 'Non définie'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}