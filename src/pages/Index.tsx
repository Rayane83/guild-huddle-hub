import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

// Components
import { SEOHead } from '@/components/SEOHead';
import { RoleGate } from '@/components/RoleGate';
import { NewDashboard } from '@/components/NewDashboard';
import { DashboardSummary } from '@/components/DashboardSummary';
import { DotationForm } from '@/components/DotationForm';
import { ImpotForm } from '@/components/ImpotForm';
import { BlanchimentToggle } from '@/components/BlanchimentToggle';
import { ArchiveTable } from '@/components/ArchiveTable';
import { DocsUpload } from '@/components/DocsUpload';
import { StaffConfig } from '@/components/StaffConfig';

// Hooks
import { useStandardAuth, UserRole } from '@/hooks/useStandardAuth';
import { useGuilds, useGuildRoles } from '@/hooks';
import { useConfigSync } from '@/hooks/useConfigSync';

// Utils
import { 
  getRoleDisplayName,
  getRoleColor,
  canAccessDotation,
  canAccessImpot,
  canAccessBlanchiment,
  canAccessStaffConfig,
  canAccessCompanyConfig,
  isDot,
} from '@/lib/roles';

// Icons
import { 
  BarChart3, 
  Calculator, 
  FileText, 
  Shield, 
  Archive, 
  Settings, 
  Building2,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon
} from 'lucide-react';

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const Index = () => {
  // Custom hooks for clean state management
  const auth = useStandardAuth();
  const guilds = useGuilds();
  const guildRoles = useGuildRoles(guilds.selectedGuildId);
  
  // Synchronisation automatique des configurations
  const { triggerDataRefresh } = useConfigSync();

  // Debug: ajouter un listener pour voir les événements de sync
  useEffect(() => {
    const handleConfigSync = (event: CustomEvent) => {
      console.log('Événement config-sync reçu:', event.detail);
    };
    const handleDataSync = (event: CustomEvent) => {
      console.log('Événement data-sync reçu:', event.detail);
    };

    window.addEventListener('config-sync', handleConfigSync as EventListener);
    window.addEventListener('data-sync', handleDataSync as EventListener);

    return () => {
      window.removeEventListener('config-sync', handleConfigSync as EventListener);
      window.removeEventListener('data-sync', handleDataSync as EventListener);
    };
  }, []);
  
  // Local UI state
  const [activeTab, setActiveTab] = useState('dashboard');

  // Memoized derived state
  const currentEntreprise = useMemo(() => 
    guildRoles.entreprise || 'Aucune Entreprise', 
    [guildRoles.entreprise]
  );

  const isLoading = useMemo(() => 
    auth.isLoading || guilds.isLoading || guildRoles.isLoading, 
    [auth.isLoading, guilds.isLoading, guildRoles.isLoading]
  );

  // Map UserRole to legacy role system for compatibility
  const legacyRole = useMemo(() => {
    switch (auth.userRole) {
      case 'superadmin': return 'staff';
      case 'admin': return 'patron';  
      default: return 'employe';
    }
  }, [auth.userRole]);

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-hero-pro flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-panel">
          <CardContent className="text-center p-8">
            <img
              src="/lovable-uploads/edb98f3b-c1fa-4ca1-8a20-dd0be59b3591.png"
              alt="Logo Flashback Fa"
              className="mx-auto h-16 w-16 rounded-md shadow mb-6"
              loading="lazy"
              decoding="async"
            />
            <h1 className="text-2xl font-bold text-gradient mb-4">
              Portail Flashback Fa
            </h1>
            <p className="text-muted-foreground mb-6">
              Connectez-vous pour accéder à vos données d'entreprise
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/auth">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Connexion Standard
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/superadmin-auth">
                  <Shield className="mr-2 h-4 w-4" />
                  Connexion Superadmin
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pageTitle = activeTab === 'dashboard' 
    ? 'Dashboard - Portail Entreprise Flashback Fa'
    : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} - Portail Entreprise Flashback Fa`;

  return (
    <>
      <SEOHead 
        title={pageTitle}
        description={`Gérez vos données d'entreprise Discord avec notre portail complet. Actuellement connecté: ${currentEntreprise}`}
      />
      
      <div className="min-h-screen bg-hero-pro">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <img
                src="/lovable-uploads/edb98f3b-c1fa-4ca1-8a20-dd0be59b3591.png"
                alt="Logo"
                className="h-8 w-8 rounded"
                loading="lazy"
              />
              <div>
                <h1 className="text-xl font-bold text-gradient">Flashback Fa</h1>
                <p className="text-sm text-muted-foreground">{currentEntreprise}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge 
                variant="outline" 
                className={`${getRoleColor(legacyRole)} border-current`}
              >
                {getRoleDisplayName(legacyRole)}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <UserIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {auth.profile?.display_name || auth.user?.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Profil
                    </Link>
                  </DropdownMenuItem>
                  {auth.userRole === 'superadmin' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/superadmin">
                          <Shield className="mr-2 h-4 w-4" />
                          Superadmin
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/superadmin-auth">
                          <Shield className="mr-2 h-4 w-4" />
                          Auth Legacy
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={auth.signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-7 mb-8">
              <RoleGate 
                allow={(role) => true}
                currentRole={legacyRole}
                asTabTrigger 
                value="dashboard"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </RoleGate>
              
              <RoleGate 
                allow={canAccessDotation}
                currentRole={legacyRole}
                asTabTrigger 
                value="dotation"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Dotation
              </RoleGate>
              
              <RoleGate 
                allow={canAccessImpot}
                currentRole={legacyRole}
                asTabTrigger 
                value="impot"
              >
                <FileText className="w-4 h-4 mr-2" />
                Impôt
              </RoleGate>
              
              <RoleGate 
                allow={canAccessBlanchiment}
                currentRole={legacyRole}
                asTabTrigger 
                value="blanchiment"
              >
                <Shield className="w-4 h-4 mr-2" />
                Blanchiment
              </RoleGate>
              
              <RoleGate 
                allow={(role) => true}
                currentRole={legacyRole}
                asTabTrigger 
                value="archives"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archives
              </RoleGate>
              
              <RoleGate 
                allow={canAccessStaffConfig}
                currentRole={legacyRole}
                asTabTrigger 
                value="staff-config"
              >
                <Settings className="w-4 h-4 mr-2" />
                Staff Config
              </RoleGate>
              
              <RoleGate 
                allow={canAccessCompanyConfig}
                currentRole={legacyRole}
                asTabTrigger 
                value="company-config"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Entreprise
              </RoleGate>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <DashboardSummary guildId={guilds.selectedGuildId} />
              <NewDashboard />
            </TabsContent>

            <RoleGate allow={canAccessDotation} currentRole={legacyRole}>
              <TabsContent value="dotation">
                <DotationForm guildId={guilds.selectedGuildId} />
              </TabsContent>
            </RoleGate>

            <RoleGate allow={canAccessImpot} currentRole={legacyRole}>
              <TabsContent value="impot">
                <ImpotForm guildId={guilds.selectedGuildId} />
              </TabsContent>
            </RoleGate>

            <RoleGate allow={canAccessBlanchiment} currentRole={legacyRole}>
              <TabsContent value="blanchiment">
                <BlanchimentToggle guildId={guilds.selectedGuildId} entrepriseKey={currentEntreprise} />
              </TabsContent>
            </RoleGate>

            <TabsContent value="archives" className="space-y-6">
              <ArchiveTable guildId={guilds.selectedGuildId} />
              <DocsUpload guildId={guilds.selectedGuildId} role={legacyRole} />
            </TabsContent>

            <RoleGate allow={canAccessStaffConfig} currentRole={legacyRole}>
              <TabsContent value="staff-config">
                <StaffConfig guildId={guilds.selectedGuildId} />
              </TabsContent>
            </RoleGate>

            <RoleGate allow={canAccessCompanyConfig} currentRole={legacyRole}>
              <TabsContent value="company-config">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Configuration de l'entreprise - À implémenter
                    </p>
                    <div className="mt-4 text-center">
                      <Button asChild>
                        <Link to="/patron-config">
                          Accéder aux configurations avancées
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </RoleGate>
          </Tabs>
        </main>
      </div>
    </>
  );
};

export default Index;