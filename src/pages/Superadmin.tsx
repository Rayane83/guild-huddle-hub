import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuthConsolidated } from "@/hooks/useAuthConsolidated";
import { UserManagement } from "@/components/UserManagement";
import { SuperadminDiscordConfig } from "@/components/SuperadminDiscordConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";

export default function SuperadminPage() {
  const { isAuthenticated, userRole } = useAuthConsolidated();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Connexion requise</h3>
            <p className="text-muted-foreground">
              Vous devez être connecté pour accéder à cette page.
            </p>
            <Button className="mt-4" onClick={() => navigate('/auth')}>
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (userRole !== 'superadmin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Accès interdit</h3>
            <p className="text-muted-foreground">
              Cette page est réservée aux superadmins.
            </p>
            <Badge variant="outline" className="mt-2">
              Votre rôle: {userRole}
            </Badge>
            <Button className="mt-4" onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Espace Superadmin</h1>
            <p className="text-muted-foreground">Gestion complète du système</p>
            <Badge variant="default" className="mt-2">
              Connecté en tant que Superadmin
            </Badge>
          </div>
        </div>
      </header>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Gestion des Utilisateurs</TabsTrigger>
          <TabsTrigger value="discord">Configuration Discord</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="discord" className="space-y-4">
          <SuperadminDiscordConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}