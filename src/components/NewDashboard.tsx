import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyDollar } from '@/lib/fmt';
import { 
  TrendingUp, 
  Users, 
  Calendar,
  Building2,
  RefreshCw
} from 'lucide-react';
import { guildsApi, enterprisesApi, payrollReportsApi } from '@/lib/newApi';
import type { Enterprise } from '@/lib/types';

type LegacyGuild = {
  id: string;
  name: string;
  icon?: string;
};

export function NewDashboard() {
  const [guilds, setGuilds] = useState<LegacyGuild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEnterprises: 0,
    totalEmployees: 0,
    latestReports: 0
  });

  // Charger les guildes
  useEffect(() => {
    async function loadGuilds() {
      try {
        const data = await guildsApi.getAll();
        const legacyGuilds = data.map(g => ({
          id: g.discord_id,
          name: g.name,
          icon: g.icon_url
        }));
        setGuilds(legacyGuilds);
        if (legacyGuilds.length > 0 && !selectedGuildId) {
          setSelectedGuildId(legacyGuilds[0].id);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des guildes:', error);
      }
    }
    loadGuilds();
  }, [selectedGuildId]);

  const selectedGuild = guilds.find(g => g.id === selectedGuildId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Principal</h1>
          <p className="text-muted-foreground">Vue d'ensemble avec la nouvelle structure de base de données</p>
        </div>
        <Badge variant="outline" className="flex items-center space-x-1">
          <Calendar className="w-3 h-3" />
          <span>Structure Reconstruite</span>
        </Badge>
      </div>

      {/* Message de succès */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-success" />
            <span>Base de données reconstruite avec succès</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            La base de données a été entièrement reconstruite avec une structure simplifiée et moderne. 
            Les anciennes tables ont été supprimées et remplacées par des tables optimisées.
          </p>
          <div className="mt-4">
            <p className="text-sm font-medium">Nouvelles tables créées :</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary">profiles</Badge>
              <Badge variant="secondary">guilds</Badge>
              <Badge variant="secondary">enterprises</Badge>
              <Badge variant="secondary">employees</Badge>
              <Badge variant="secondary">payroll_reports</Badge>
              <Badge variant="secondary">payroll_entries</Badge>
              <Badge variant="secondary">archives</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques basiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Guildes</p>
                <p className="text-2xl font-bold">{guilds.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entreprises</p>
                <p className="text-2xl font-bold">{enterprises.length}</p>
              </div>
              <Users className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Structure</p>
                <p className="text-2xl font-bold text-success">✓ Propre</p>
              </div>
              <TrendingUp className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}