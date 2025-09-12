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
import { useSecureAuth } from "@/hooks/useSecureAuth";

interface AuthCredentials {
  id: string;
  user_id: string;
  unique_id: string;
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
  auth_credential_id: string;
}

export function SecureHwidManager() {
  const { toast } = useToast();
  const { credentials } = useSecureAuth();
  const [authCredentials, setAuthCredentials] = useState<AuthCredentials[]>([]);
  const [auditLogs, setAuditLogs] = useState<HwidAuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Vérifier si l'utilisateur est superstaff
  const isSuperstaff = credentials?.is_superstaff === true;

  useEffect(() => {
    if (isSuperstaff) {
      loadAuthCredentials();
      loadAuditLogs();
    }
  }, [isSuperstaff]);

  const loadAuthCredentials = async () => {
    try {
      // Utiliser la fonction sécurisée au lieu de la vue directe
      const { data, error } = await supabase.rpc('list_users_safe');

      if (error) {
        throw error;
      }

      // Adapter les données pour correspondre à l'interface existante
      const adaptedData = (data || []).map(item => ({
        id: crypto.randomUUID(), // Générer un ID temporaire pour l'affichage
        user_id: item.unique_id, // Utiliser unique_id comme identifiant
        unique_id: item.unique_id,
        email: item.email,
        has_hwid_registered: item.has_hwid_registered,
        hwid_reset_count: 0, // Non disponible dans la fonction sécurisée
        last_hwid_reset: null, // Non disponible dans la fonction sécurisée
        registration_date: item.registration_date,
        is_superstaff: item.is_superstaff,
        hwid: item.has_hwid_registered ? 'PROTECTED_HWID_DATA' : null
      }));

      setAuthCredentials(adaptedData);
    } catch (error) {
      console.error('Error loading auth credentials:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données d'authentification",
        variant: "destructive",
      });
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('hwid_audit')
        .select('id, hwid, attempted_at, success, reason, auth_credential_id')
        .order('attempted_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les logs d'audit",
        variant: "destructive",
      });
    }
  };

  const resetHwid = async (userId: string, uniqueId: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir réinitialiser le HWID de ${uniqueId} ?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('reset_hwid_secure', {
        target_user_id: userId
      });

      if (error) {
        throw error;
      }

      if (data && typeof data === 'object' && 'success' in data && data.success) {
        toast({
          title: "HWID réinitialisé",
          description: `Le HWID de ${uniqueId} a été réinitialisé avec succès`,
        });
        loadAuthCredentials();
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

  const toggleSuperstaff = async (userId: string, uniqueId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'retirer les droits superstaff à' : 'donner les droits superstaff à';
    
    if (!confirm(`Êtes-vous sûr de vouloir ${action} ${uniqueId} ?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('auth_credentials')
        .update({ is_superstaff: !currentStatus })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      toast({
        title: "Droits modifiés",
        description: `Les droits de ${uniqueId} ont été modifiés`,
      });
      loadAuthCredentials();
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

  const filteredCredentials = authCredentials.filter(c =>
    c.unique_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isSuperstaff) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Accès restreint</h3>
          <p className="text-muted-foreground">
            Seuls les superstaff peuvent accéder à la gestion des HWID.
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
          <h1 className="text-2xl font-bold">Gestion Sécurisée des HWID</h1>
          <p className="text-muted-foreground">Administration des restrictions d'appareils (Architecture sécurisée)</p>
        </div>
      </div>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Architecture sécurisée active :</strong> Les données d'authentification sont maintenant séparées des données de profil pour une sécurité renforcée.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Utilisateurs</p>
                <p className="text-2xl font-bold">{authCredentials.length}</p>
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
                <p className="text-2xl font-bold">{authCredentials.filter(c => c.hwid && c.hwid !== null).length}</p>
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
                  {authCredentials.reduce((acc, c) => acc + (c.hwid_reset_count || 0), 0)}
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
                <p className="text-2xl font-bold">{authCredentials.filter(c => c.is_superstaff).length}</p>
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
          <CardDescription>Rechercher et gérer les utilisateurs et leurs HWID (données sécurisées)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Rechercher un utilisateur</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="ID unique ou email..."
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
                {filteredCredentials.map((credential) => (
                  <TableRow key={credential.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{credential.unique_id}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {credential.user_id.substring(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{credential.email}</div>
                    </TableCell>
                     <TableCell>
                       {credential.hwid ? (
                         <div className="flex items-center gap-2">
                           <Badge variant="outline" className="font-mono text-xs">
                             [PROTECTED]
                           </Badge>
                           <CheckCircle className="w-4 h-4 text-green-500" />
                         </div>
                       ) : (
                         <Badge variant="secondary">Non défini</Badge>
                       )}
                     </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{credential.hwid_reset_count || 0}</div>
                        {credential.last_hwid_reset && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(credential.last_hwid_reset).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {credential.is_superstaff && (
                          <Badge variant="default">Superstaff</Badge>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Inscrit: {new Date(credential.registration_date).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {credential.hwid && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetHwid(credential.user_id, credential.unique_id)}
                            disabled={isLoading}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={credential.is_superstaff ? "destructive" : "secondary"}
                          onClick={() => toggleSuperstaff(credential.user_id, credential.unique_id, credential.is_superstaff)}
                          disabled={isLoading}
                        >
                          {credential.is_superstaff ? "Révoquer" : "Promouvoir"}
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
            Logs d'Audit HWID Sécurisés
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
                {auditLogs.map((log) => {
                  const credential = authCredentials.find(c => c.id === log.auth_credential_id);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {credential?.unique_id || 'Inconnu'}
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}