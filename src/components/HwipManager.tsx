import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Search, RotateCcw, AlertTriangle, CheckCircle, Users, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCustomAuth } from "@/hooks/useCustomAuth";

interface Profile {
  id: string;
  unique_id: string;
  discord_id: string;
  email: string;
  hwid: string | null;
  hwid_reset_count: number;
  last_hwid_reset: string | null;
  registration_date: string;
  is_superstaff: boolean;
}

interface HwidAuditLog {
  id: string;
  hwid: string;
  attempted_at: string;
  success: boolean;
  reason: string;
  profile: {
    unique_id: string;
  };
}

export function HwipManager() {
  const { toast } = useToast();
  const { profile } = useCustomAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auditLogs, setAuditLogs] = useState<HwidAuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Vérifier si l'utilisateur est superstaff
  const isSuperstaff = profile?.is_superstaff === true;

  useEffect(() => {
    if (isSuperstaff) {
      loadProfiles();
      loadAuditLogs();
    }
  }, [isSuperstaff]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, unique_id, discord_id, email, hwid, hwid_reset_count, last_hwid_reset, registration_date, is_superstaff')
        .order('registration_date', { ascending: false });

      if (error) {
        throw error;
      }

      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les profils",
        variant: "destructive",
      });
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data: auditData, error: auditError } = await supabase
        .from('hwid_audit')
        .select('id, hwid, attempted_at, success, reason, profile_id')
        .order('attempted_at', { ascending: false })
        .limit(50);

      if (auditError) {
        throw auditError;
      }

      // Récupérer les profils pour les logs
      const profileIds = [...new Set(auditData?.map(log => log.profile_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, unique_id')
        .in('id', profileIds);

      if (profilesError) {
        throw profilesError;
      }

      // Créer un map des profils pour un accès rapide
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, { id: string; unique_id: string }>);

      // Transformer les données pour correspondre à l'interface
      const transformedLogs = (auditData || []).map(log => ({
        id: log.id,
        hwid: log.hwid,
        attempted_at: log.attempted_at,
        success: log.success,
        reason: log.reason,
        profile: {
          unique_id: profilesMap[log.profile_id]?.unique_id || 'Inconnu'
        }
      }));

      setAuditLogs(transformedLogs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les logs d'audit",
        variant: "destructive",
      });
    }
  };

  const resetHwid = async (profileId: string, uniqueId: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir réinitialiser le HWID de ${uniqueId} ?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('reset_hwid', {
        target_profile_id: profileId
      });

      if (error) {
        throw error;
      }

      if (data && typeof data === 'object' && 'success' in data && data.success) {
        toast({
          title: "HWID réinitialisé",
          description: `Le HWID de ${uniqueId} a été réinitialisé avec succès`,
        });
        loadProfiles();
        loadAuditLogs();
      } else {
        const reason = data && typeof data === 'object' && 'reason' in data ? data.reason : 'Erreur lors de la réinitialisation';
        throw new Error(reason as string);
      }
    } catch (error) {
      console.error('Error resetting HWID:', error);
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser le HWID",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSuperstaff = async (profileId: string, uniqueId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'retirer les droits superstaff à' : 'donner les droits superstaff à';
    
    if (!confirm(`Êtes-vous sûr de vouloir ${action} ${uniqueId} ?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_superstaff: !currentStatus })
        .eq('id', profileId);

      if (error) {
        throw error;
      }

      toast({
        title: "Droits modifiés",
        description: `Les droits de ${uniqueId} ont été modifiés`,
      });
      loadProfiles();
    } catch (error) {
      console.error('Error toggling superstaff:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier les droits",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.unique_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.discord_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isSuperstaff) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Accès restreint</h3>
          <p className="text-muted-foreground">
            Seuls les superstaff peuvent accéder à la gestion des HWIP.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-primary" />
        <div>
        <h1 className="text-2xl font-bold">Gestion des HWID</h1>
        <p className="text-muted-foreground">Administration des restrictions d'appareils</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Utilisateurs</p>
                <p className="text-2xl font-bold">{profiles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">HWID Enregistrés</p>
                <p className="text-2xl font-bold">{profiles.filter(p => p.hwid).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Réinitialisations</p>
                <p className="text-2xl font-bold">
                  {profiles.reduce((acc, p) => acc + (p.hwid_reset_count || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Superstaff</p>
                <p className="text-2xl font-bold">{profiles.filter(p => p.is_superstaff).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestion des Utilisateurs
          </CardTitle>
          <CardDescription>Rechercher et gérer les utilisateurs et leurs HWID</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Rechercher un utilisateur</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="ID unique, ID Discord ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>HWID</TableHead>
                  <TableHead>Réinitialisations</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{profile.unique_id}</div>
                        <div className="text-sm text-muted-foreground">
                          Discord: {profile.discord_id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>
                      {profile.hwid ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {profile.hwid.substring(0, 8)}...
                          </Badge>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      ) : (
                        <Badge variant="secondary">Non défini</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {profile.hwid_reset_count || 0}
                      {profile.last_hwid_reset && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(profile.last_hwid_reset).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {profile.is_superstaff && (
                          <Badge variant="default">Superstaff</Badge>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Inscrit: {new Date(profile.registration_date).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {profile.hwid && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetHwid(profile.id, profile.unique_id)}
                            disabled={isLoading}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={profile.is_superstaff ? "destructive" : "secondary"}
                          onClick={() => toggleSuperstaff(profile.id, profile.unique_id, profile.is_superstaff)}
                          disabled={isLoading}
                        >
                          {profile.is_superstaff ? "Révoquer" : "Promouvoir"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Logs d'Audit HWIP
          </CardTitle>
          <CardDescription>Historique des tentatives de connexion et modifications HWID</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>HWID</TableHead>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Résultat</TableHead>
                  <TableHead>Raison</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.profile?.unique_id || 'Inconnu'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.hwid.substring(0, 8)}...
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(log.attempted_at).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      {log.success ? (
                        <Badge className="bg-green-500">Succès</Badge>
                      ) : (
                        <Badge variant="destructive">Échec</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{log.reason}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}