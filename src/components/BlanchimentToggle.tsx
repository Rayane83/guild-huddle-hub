// Composant temporairement simplifié en attendant la régénération des types Supabase
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface BlanchimentToggleProps {
  guildId: string;
  entrepriseKey: string;
  onBlanchimentChanged?: () => void;
}

export function BlanchimentToggle({ guildId, entrepriseKey, onBlanchimentChanged }: BlanchimentToggleProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <span>Blanchiment - Reconstruction en cours</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Le système de blanchiment est temporairement indisponible pendant la reconstruction de la base de données.
        </p>
        <div className="mt-4 text-sm text-muted-foreground">
          <p><strong>Guild ID:</strong> {guildId}</p>
          <p><strong>Entreprise:</strong> {entrepriseKey}</p>
        </div>
      </CardContent>
    </Card>
  );
}