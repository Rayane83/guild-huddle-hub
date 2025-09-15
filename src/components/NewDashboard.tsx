import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyDollar } from '@/lib/fmt';
import { useAuthConsolidated } from '@/hooks/useAuthConsolidated';
import { useGuilds } from '@/hooks/useGuilds';
import { useSimpleGuildRoles } from '@/hooks/useSimpleGuildRoles';
import { 
  TrendingUp, 
  Users, 
  Calendar,
  Building2,
  RefreshCw,
  Shield
} from 'lucide-react';
import { guildsApi, enterprisesApi } from '@/lib/newApi';
import type { Enterprise } from '@/lib/types';

export function NewDashboard() {
  const { userRole, isAuthenticated, user } = useAuthConsolidated();
  const { guilds, selectedGuildId, selectGuild } = useGuilds();
  const { currentRole, entreprise, isLoading: rolesLoading } = useSimpleGuildRoles(selectedGuildId);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Récupérer les entreprises pour le guild sélectionné
        if (selectedGuildId) {
          const data = await enterprisesApi.getByGuild(selectedGuildId);
          setEnterprises(data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des entreprises:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedGuildId]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Connexion requise</h3>
            <p className="text-muted-foreground">
              Veuillez vous connecter pour accéder au dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Principal</h1>
          <p className="text-muted-foreground">
            Bienvenue, {user?.email} - Rôle: {userRole}
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant={userRole === 'superadmin' ? 'destructive' : 'secondary'}>
              {userRole === 'superadmin' ? 'Superadmin' : currentRole}
            </Badge>
            {entreprise && (
              <Badge variant="outline">
                {entreprise}
              </Badge>
            )}
          </div>
        </div>
        <Badge variant="outline" className="flex items-center space-x-1">
          <Calendar className="w-3 h-3" />
          <span>Système Opérationnel</span>
        </Badge>
      </div>

      {/* Informations utilisateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-success" />
            <span>Informations de connexion</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg">{user?.email || 'Non disponible'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rôle système</p>
              <Badge variant={userRole === 'superadmin' ? 'destructive' : 'secondary'}>
                {userRole}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rôle entreprise</p>
              <Badge variant="outline">
                {currentRole}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
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
                <p className="text-sm font-medium text-muted-foreground">Statut</p>
                <p className="text-2xl font-bold text-success">✓ Actif</p>
              </div>
              <TrendingUp className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides pour superadmin */}
      {userRole === 'superadmin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-destructive" />
              <span>Actions Superadmin</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => window.location.href = '/superadmin'}>
                Panneau Superadmin
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/company-config'}>
                Configuration Entreprises
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/hwip-admin'}>
                Gestion HWIP
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations de debug */}
      {userRole === 'superadmin' && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono">
              <p>User ID: {user?.id}</p>
              <p>Selected Guild: {selectedGuildId}</p>
              <p>Current Role: {currentRole}</p>
              <p>Enterprise: {entreprise}</p>
              <p>Roles Loading: {rolesLoading ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}