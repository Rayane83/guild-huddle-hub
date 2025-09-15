import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Users, Plus, Edit, Trash2, DollarSign, TrendingUp } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyDollar } from '@/lib/fmt';

interface EnterpriseManagerProps {
  guildId: string;
}

interface Enterprise {
  id: string;
  name: string;
  key: string;
  discord_role_id: string;
  discord_guild_id: string;
  guild_id: string;
  config: any;
  created_at: string;
  updated_at: string;
  employee_count?: number;
  total_payroll?: number;
}

interface NewEnterprise {
  name: string;
  key: string;
  discord_role_id: string;
  discord_guild_id: string;
  description: string;
}

export function EnterpriseManager({ guildId }: EnterpriseManagerProps) {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEnterprise, setEditingEnterprise] = useState<Enterprise | null>(null);
  const [newEnterprise, setNewEnterprise] = useState<NewEnterprise>({
    name: '',
    key: '',
    discord_role_id: '',
    discord_guild_id: '',
    description: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadEnterprises();
  }, [guildId]);

  const loadEnterprises = async () => {
    setIsLoading(true);
    try {
      // Charger les entreprises avec leurs statistiques
      const { data: enterprisesData, error: enterprisesError } = await supabase
        .from('enterprises')
        .select('*')
        .eq('discord_guild_id', guildId);

      if (enterprisesError) throw enterprisesError;

      // Charger les statistiques des employés pour chaque entreprise
      const enterprisesWithStats = await Promise.all(
        (enterprisesData || []).map(async (enterprise) => {
          // Compter les employés
          const { count: employeeCount } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('enterprise_id', enterprise.id)
            .eq('is_active', true);

          // Calculer le total des salaires
          const { data: salaryData } = await supabase
            .from('employees')
            .select('salary')
            .eq('enterprise_id', enterprise.id)
            .eq('is_active', true);

          const totalPayroll = (salaryData || []).reduce((sum, emp) => sum + (emp.salary || 0), 0);

          return {
            ...enterprise,
            employee_count: employeeCount || 0,
            total_payroll: totalPayroll
          };
        })
      );

      setEnterprises(enterprisesWithStats);
    } catch (error) {
      console.error('Erreur lors du chargement des entreprises:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les entreprises",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEnterprise.name || !newEnterprise.key) {
      toast({
        title: "Erreur",
        description: "Nom et clé de l'entreprise sont obligatoires",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingEnterprise) {
        // Mise à jour
        const { error } = await supabase
          .from('enterprises')
          .update({
            name: newEnterprise.name,
            key: newEnterprise.key,
            discord_role_id: newEnterprise.discord_role_id,
            discord_guild_id: newEnterprise.discord_guild_id,
            config: {
              description: newEnterprise.description,
              updated_at: new Date().toISOString()
            }
          })
          .eq('id', editingEnterprise.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Entreprise mise à jour avec succès",
        });
      } else {
        // Création
        const { error } = await supabase
          .from('enterprises')
          .insert({
            name: newEnterprise.name,
            key: newEnterprise.key,
            discord_role_id: newEnterprise.discord_role_id,
            discord_guild_id: newEnterprise.discord_guild_id,
            guild_id: guildId,
            config: {
              description: newEnterprise.description,
              created_at: new Date().toISOString()
            }
          });

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Entreprise créée avec succès",
        });
      }

      setShowDialog(false);
      setEditingEnterprise(null);
      setNewEnterprise({
        name: '',
        key: '',
        discord_role_id: '',
        discord_guild_id: '',
        description: ''
      });
      loadEnterprises();

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'entreprise",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (enterprise: Enterprise) => {
    setEditingEnterprise(enterprise);
    setNewEnterprise({
      name: enterprise.name,
      key: enterprise.key,
      discord_role_id: enterprise.discord_role_id || '',
      discord_guild_id: enterprise.discord_guild_id || '',
      description: enterprise.config?.description || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (enterprise: Enterprise) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'entreprise "${enterprise.name}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('enterprises')
        .delete()
        .eq('id', enterprise.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Entreprise supprimée avec succès",
      });

      loadEnterprises();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'entreprise",
        variant: "destructive"
      });
    }
  };

  const openNewDialog = () => {
    setEditingEnterprise(null);
    setNewEnterprise({
      name: '',
      key: '',
      discord_role_id: '',
      discord_guild_id: '',
      description: ''
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          Gestion des Entreprises
        </h2>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Entreprise
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEnterprise ? 'Modifier l\'Entreprise' : 'Nouvelle Entreprise'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nom de l'Entreprise *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Bennys, Cayo Cigare..."
                  value={newEnterprise.name}
                  onChange={(e) => setNewEnterprise(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="key">Clé Unique *</Label>
                <Input
                  id="key"
                  placeholder="Ex: bennys, cayo_cigare..."
                  value={newEnterprise.key}
                  onChange={(e) => setNewEnterprise(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                />
              </div>

              <div>
                <Label htmlFor="discord_role_id">ID Rôle Discord</Label>
                <Input
                  id="discord_role_id"
                  placeholder="ID du rôle Discord"
                  value={newEnterprise.discord_role_id}
                  onChange={(e) => setNewEnterprise(prev => ({ ...prev, discord_role_id: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="discord_guild_id">ID Serveur Discord</Label>
                <Input
                  id="discord_guild_id"
                  placeholder="ID du serveur Discord spécifique"
                  value={newEnterprise.discord_guild_id}
                  onChange={(e) => setNewEnterprise(prev => ({ ...prev, discord_guild_id: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Description de l'entreprise"
                  value={newEnterprise.description}
                  onChange={(e) => setNewEnterprise(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingEnterprise ? 'Mettre à jour' : 'Créer'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Entreprises</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enterprises.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Employés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {enterprises.reduce((sum, ent) => sum + (ent.employee_count || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Masse Salariale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrencyDollar(enterprises.reduce((sum, ent) => sum + (ent.total_payroll || 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des entreprises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {enterprises.map((enterprise) => (
          <Card key={enterprise.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {enterprise.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(enterprise)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(enterprise)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Clé:</span>
                <Badge variant="outline">{enterprise.key}</Badge>
              </div>

              {enterprise.discord_role_id && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rôle Discord:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {enterprise.discord_role_id}
                  </code>
                </div>
              )}

              {enterprise.config?.description && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Description:</span>
                  <p className="mt-1">{enterprise.config.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Employés</span>
                  </div>
                  <div className="text-lg font-bold">{enterprise.employee_count || 0}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">Masse Salariale</span>
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrencyDollar(enterprise.total_payroll || 0)}
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Créée le {new Date(enterprise.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {enterprises.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Aucune entreprise</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par créer votre première entreprise
            </p>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une Entreprise
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}